import { startTransition, useEffect, useMemo, useRef, useState } from "react"

import { AppHeader } from "@/components/layout/AppHeader"
import { AppFooter } from "@/components/layout/AppFooter"
import { StatusCard } from "@/components/layout/StatusCard"
import { AuthFlow } from "@/features/auth/components/AuthFlow"
import { DashboardPage } from "@/features/dashboard/components/DashboardPage"
import { MonitorsPage } from "@/features/monitors/components/MonitorsPage"
import { CreateMonitorPage } from "@/features/monitors/components/CreateMonitorPage"
import { MonitorPage } from "@/features/monitors/components/MonitorPage"
import { StatusPagesPage } from "@/features/status-pages/components/StatusPagesPage"
import { StatusPageDetailPage } from "@/features/status-pages/components/StatusPageDetailPage"
import { useAppRoute } from "@/hooks/useAppRoute"
import { createKumaApiClient } from "@/api/kuma/client"
import {
  buildMonitorRecords,
  diffMonitorRecord,
  getMonitorGroupViews,
  getUnmanagedMonitors,
  prepareMonitorForCreate,
  prepareMonitorForEdit,
} from "@/features/monitors/utils/monitor-sync"
import { buildStatusPageRecords, diffStatusPageRecord } from "@/features/status-pages/utils/status-page-sync"
import { clearTokens, loadInstances, loadTokens, saveInstances, saveTokens } from "@/utils/storage"
import { resolveTokens, TEMPLATE_SUPPORTED_FIELDS } from "@/utils/template-tokens"
import type { KumaApiClient } from "@/api/kuma/client"
import type {
  ConnectedKumaInstance,
  KumaInstanceConfig,
  KumaMonitor,
  KumaStatusPage,
  LoginCredentials,
  MonitorDetailsValues,
  MonitorDifference,
  SessionState,
  StatusPageDetailsValues,
  StatusPageDifference,
  StoredKumaToken,
} from "@/types"

export default function App() {
  const [instances, setInstances] = useState<KumaInstanceConfig[]>(() => loadInstances())
  const [tokens, setTokens] = useState<Record<string, StoredKumaToken>>(() => loadTokens())
  const [connectedInstances, setConnectedInstances] = useState<ConnectedKumaInstance[]>([])
  const [sessionState, setSessionState] = useState<SessionState>("configuring")
  const { route, navigate } = useAppRoute()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const clientsRef = useRef<Record<string, KumaApiClient>>({})
  const attemptedSavedLoginRef = useRef(false)

  const configuredInstances = useMemo(() => instances.filter((instance) => instance.url.trim()), [instances])
  const canRestoreSavedLogin = configuredInstances.length > 0 && configuredInstances.every((instance) => tokens[instance.id]?.token)
  const monitorRecords = useMemo(() => buildMonitorRecords(connectedInstances), [connectedInstances])
  const statusPageRecords = useMemo(() => buildStatusPageRecords(connectedInstances), [connectedInstances])
  const differences = useMemo(
    () =>
      monitorRecords
        .map((record) => diffMonitorRecord(record, connectedInstances))
        .filter((diff): diff is MonitorDifference => Boolean(diff)),
    [connectedInstances, monitorRecords],
  )
  const statusPageDifferences = useMemo(
    () =>
      statusPageRecords
        .map((record) => diffStatusPageRecord(record, connectedInstances))
        .filter((diff): diff is StatusPageDifference => Boolean(diff)),
    [connectedInstances, statusPageRecords],
  )
  const unmanagedMonitors = useMemo(() => getUnmanagedMonitors(connectedInstances), [connectedInstances])
  const monitorGroups = useMemo(() => getMonitorGroupViews(connectedInstances), [connectedInstances])

  useEffect(() => {
    saveInstances(instances)
  }, [instances])

  useEffect(() => {
    saveTokens(tokens)
  }, [tokens])

  // biome-ignore lint/correctness/useExhaustiveDependencies: authenticateWithSavedTokens intentionally excluded to avoid infinite loops
  useEffect(() => {
    if (!canRestoreSavedLogin || attemptedSavedLoginRef.current || sessionState !== "configuring") return
    attemptedSavedLoginRef.current = true
    if (!route.startsWith("/monitors/") && route !== "/login" && !route.startsWith("/status-pages/")) navigate("/login")
    void authenticateWithSavedTokens()
  }, [canRestoreSavedLogin, sessionState, route, navigate])

  async function authenticateWithPassword(credentialsByInstance: LoginCredentials) {
    setSessionState("authenticating")
    setErrorMessage(null)
    setStatusMessage("Logging in to every configured Kuma instance...")

    try {
      const connected = await Promise.all(
        configuredInstances.map(async (instance) => {
          const credentials = credentialsByInstance[instance.id]
          if (!credentials) throw new Error(`${instance.name}: missing credentials`)

          const client = createKumaApiClient(instance)
          await client.connect()
          const login = await client.login(credentials)
          if (!login.ok || !login.token) {
            client.disconnect()
            throw new Error(`${instance.name}: ${login.msg ?? "login failed"}`)
          }

          const [monitors, statusPages] = await Promise.all([client.getMonitors(), client.getStatusPages()])
          clientsRef.current[instance.id] = client
          return { config: client.instance, token: login.token, monitors, statusPages }
        }),
      )

      const nextTokens = Object.fromEntries(
        connected.map((instance) => [instance.config.id, { token: instance.token, savedAt: new Date().toISOString() }]),
      )
      startTransition(() => {
        setTokens(nextTokens)
        setConnectedInstances(connected)
        setSessionState("authenticated")
        setStatusMessage("Authenticated against every instance.")
        navigate(route.startsWith("/monitors/") || route.startsWith("/status-pages/") ? route : "/dashboard")
      })
    } catch (error) {
      disconnectAll()
      setSessionState("configuring")
      setErrorMessage(error instanceof Error ? error.message : "Login failed")
    }
  }

  async function authenticateWithSavedTokens() {
    setSessionState("authenticating")
    setErrorMessage(null)
    setStatusMessage("Restoring saved Kuma sessions...")

    try {
      const connected = await Promise.all(
        configuredInstances.map(async (instance) => {
          const stored = tokens[instance.id]
          if (!stored?.token) throw new Error(`${instance.name}: no saved token`)

          const client = createKumaApiClient(instance)
          await client.connect()
          const login = await client.loginByToken(stored.token)
          if (!login.ok) {
            client.disconnect()
            throw new Error(`${instance.name}: saved token rejected`)
          }

          const [monitors, statusPages] = await Promise.all([client.getMonitors(), client.getStatusPages()])
          clientsRef.current[instance.id] = client
          return { config: client.instance, token: stored.token, monitors, statusPages }
        }),
      )

      startTransition(() => {
        setConnectedInstances(connected)
        setSessionState("authenticated")
        setStatusMessage(null)
        navigate(route.startsWith("/monitors/") || route.startsWith("/status-pages/") ? route : "/dashboard")
      })
    } catch (error) {
      disconnectAll()
      clearTokens()
      setTokens({})
      setSessionState("configuring")
      setErrorMessage(error instanceof Error ? error.message : "Saved token login failed")
    }
  }

  async function refreshMonitors() {
    setStatusMessage("Refreshing monitor configuration...")
    setErrorMessage(null)

    try {
      const refreshed = await Promise.all(
        connectedInstances.map(async (instance) => {
          const [monitors, statusPages] = await Promise.all([
            clientsRef.current[instance.config.id].getMonitors(),
            clientsRef.current[instance.config.id].getStatusPages(),
          ])
          return { ...instance, monitors, statusPages }
        }),
      )
      setConnectedInstances(refreshed)
      setStatusMessage("Monitor list refreshed.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Refresh failed")
    }
  }

  async function refreshStatusPages() {
    setStatusMessage("Refreshing status pages...")
    setErrorMessage(null)

    try {
      const refreshed = await Promise.all(
        connectedInstances.map(async (instance) => ({
          ...instance,
          statusPages: await clientsRef.current[instance.config.id].getStatusPages(),
        })),
      )
      setConnectedInstances(refreshed)
      setStatusMessage("Status pages refreshed.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Refresh failed")
    }
  }

  async function syncFrom(sourceInstanceId: string, tag: string) {
    const record = monitorRecords.find((entry) => entry.tag === tag)
    const source = record?.monitorsByInstance[sourceInstanceId]
    if (!record || !source) return

    setStatusMessage(`Syncing ${tag} from ${instanceName(sourceInstanceId)}...`)
    setErrorMessage(null)

    try {
      for (const targetInstance of connectedInstances) {
        if (targetInstance.config.id === sourceInstanceId) continue
        const client = clientsRef.current[targetInstance.config.id]
        const target = record.monitorsByInstance[targetInstance.config.id]
        const response = target
          ? await client.editMonitor(prepareMonitorForEdit(source, target))
          : await client.addMonitor(prepareMonitorForCreate(source))
        if (!response.ok) throw new Error(`${targetInstance.config.name}: ${response.msg ?? "sync failed"}`)
      }
      await refreshMonitors()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sync failed")
    }
  }

  async function applySuggestedTag(instanceId: string, monitor: KumaMonitor, tag: string) {
    const client = clientsRef.current[instanceId]
    setStatusMessage(`Applying ${tag} to ${monitor.name}...`)
    setErrorMessage(null)

    try {
      const response = await client.addMonitorTag(monitor.id, tag)
      if (!response.ok) throw new Error(response.msg ?? "Failed to apply tag")
      setConnectedInstances((current) =>
        current.map((instance) => {
          if (instance.config.id !== instanceId) return instance

          return {
            ...instance,
            monitors: instance.monitors.map((entry) =>
              entry.id === monitor.id ? { ...entry, tags: [...(entry.tags ?? []), { name: tag, value: null, color: "#2563eb" }] } : entry,
            ),
          }
        }),
      )
      await refreshMonitors()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to apply tag")
    }
  }

  async function saveMonitorDetails(tag: string, values: MonitorDetailsValues, groupName?: string) {
    const record = monitorRecords.find((entry) => entry.tag === tag)
    if (!record) return

    setStatusMessage(`Saving ${tag}...`)
    setErrorMessage(null)

    try {
      for (const instance of connectedInstances) {
        const monitor = record.monitorsByInstance[instance.config.id]
        if (!monitor) continue

        const instanceValues = { ...values }
        if (groupName !== undefined) {
          const group = monitorGroups.find((g) => g.instance.config.id === instance.config.id && g.group.name === groupName)
          instanceValues.parent = group?.group.id ?? null
        }

        const response = await clientsRef.current[instance.config.id].editMonitor({ ...monitor, ...instanceValues })

        if (!response.ok) throw new Error(`${instance.config.name}: ${response.msg ?? "save failed"}`)
      }

      setConnectedInstances((current) =>
        current.map((instance) => ({
          ...instance,
          monitors: instance.monitors.map((monitor) => {
            const target = record.monitorsByInstance[instance.config.id]
            if (!target || monitor.id !== target.id) return monitor

            return { ...monitor, ...values }
          }),
        })),
      )
      setStatusMessage(`Saved ${tag} across all available instances.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed")
    }
  }

  async function renameMonitorTag(oldTag: string, newTag: string) {
    const record = monitorRecords.find((entry) => entry.tag === oldTag)
    if (!record) return

    setStatusMessage(`Renaming ${oldTag}...`)
    setErrorMessage(null)

    try {
      for (const instance of connectedInstances) {
        const monitor = record.monitorsByInstance[instance.config.id]
        if (!monitor) continue

        const response = await clientsRef.current[instance.config.id].replaceMonitorTag(monitor, oldTag, newTag)
        if (!response.ok) throw new Error(`${instance.config.name}: ${response.msg ?? "tag rename failed"}`)
      }

      setConnectedInstances((current) =>
        current.map((instance) => ({
          ...instance,
          monitors: instance.monitors.map((monitor) => {
            const target = record.monitorsByInstance[instance.config.id]
            if (!target || monitor.id !== target.id) return monitor

            return {
              ...monitor,
              tags: [...(monitor.tags ?? []).filter((tag) => tag.name !== oldTag), { name: newTag, value: null, color: "#2563eb" }],
            }
          }),
        })),
      )
      setStatusMessage(`Renamed ${oldTag} to ${newTag}.`)
      navigate(`/monitors/${encodeURIComponent(newTag.replace(/^monitor:/, ""))}`)
      await refreshMonitors()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Tag rename failed")
    }
  }

  async function createMonitor(tag: string, values: MonitorDetailsValues, groupName?: string) {
    setStatusMessage(`Creating ${tag} on all instances...`)
    setErrorMessage(null)

    try {
      for (const instance of connectedInstances) {
        const client = clientsRef.current[instance.config.id]

        const instanceValues: MonitorDetailsValues = { ...values }
        if (groupName) {
          const group = monitorGroups.find((g) => g.instance.config.id === instance.config.id && g.group.name === groupName)
          if (group) instanceValues.parent = group.group.id
        }

        const response = await client.addMonitor(instanceValues)
        if (!response.ok) throw new Error(`${instance.config.name}: ${response.msg ?? "create failed"}`)
        if (response.monitorID) {
          const tagResponse = await client.addMonitorTag(response.monitorID, tag)
          if (!tagResponse.ok) throw new Error(`${instance.config.name}: ${tagResponse.msg ?? "tag failed"}`)
        }
      }

      await refreshMonitors()
      navigate(`/monitors/${encodeURIComponent(tag.replace(/^monitor:/, ""))}`)
      setStatusMessage(`Created ${tag} successfully.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Create failed")
    }
  }

  async function saveStatusPageDetails(slug: string, values: StatusPageDetailsValues) {
    const record = statusPageRecords.find((entry) => entry.slug === slug)
    if (!record) return

    setStatusMessage(`Saving status page ${slug}...`)
    setErrorMessage(null)

    try {
      for (const instance of connectedInstances) {
        const page = record.pagesByInstance[instance.config.id]
        if (!page) continue

        const instanceValues: StatusPageDetailsValues = {}
        for (const [key, val] of Object.entries(values)) {
          if (TEMPLATE_SUPPORTED_FIELDS.has(key) && typeof val === "string") {
            instanceValues[key] = resolveTokens(val, instance.config.name)
          } else {
            instanceValues[key] = val
          }
        }

        const response = await clientsRef.current[instance.config.id].editStatusPage({ ...page, ...instanceValues })
        if (!response.ok) throw new Error(`${instance.config.name}: ${response.msg ?? "save failed"}`)
      }

      await refreshStatusPages()
      setStatusMessage(`Saved status page ${slug} across all instances.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed")
    }
  }

  async function createStatusPage(slug: string, values: StatusPageDetailsValues) {
    setStatusMessage(`Creating status page ${slug} on all instances...`)
    setErrorMessage(null)

    try {
      for (const instance of connectedInstances) {
        const client = clientsRef.current[instance.config.id]

        const instanceValues: StatusPageDetailsValues = {}
        for (const [key, val] of Object.entries(values)) {
          if (TEMPLATE_SUPPORTED_FIELDS.has(key) && typeof val === "string") {
            instanceValues[key] = resolveTokens(val, instance.config.name)
          } else {
            instanceValues[key] = val
          }
        }

        const response = await client.addStatusPage(instanceValues as Partial<KumaStatusPage>)
        if (!response.ok) throw new Error(`${instance.config.name}: ${response.msg ?? "create failed"}`)
      }

      await refreshStatusPages()
      navigate(`/status-pages/${encodeURIComponent(slug)}`)
      setStatusMessage(`Created status page ${slug} successfully.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Create failed")
    }
  }

  async function deleteStatusPageFromAll(slug: string) {
    const record = statusPageRecords.find((entry) => entry.slug === slug)
    if (!record) return

    setStatusMessage(`Deleting status page ${slug}...`)
    setErrorMessage(null)

    try {
      for (const instance of connectedInstances) {
        const page = record.pagesByInstance[instance.config.id]
        if (!page) continue

        const response = await clientsRef.current[instance.config.id].deleteStatusPage(page.id)
        if (!response.ok) throw new Error(`${instance.config.name}: ${response.msg ?? "delete failed"}`)
      }

      await refreshStatusPages()
      navigate("/status-pages")
      setStatusMessage(`Deleted status page ${slug}.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Delete failed")
    }
  }

  function logout() {
    disconnectAll()
    clearTokens()
    attemptedSavedLoginRef.current = false
    setTokens({})
    setConnectedInstances([])
    setSessionState("configuring")
    setStatusMessage("Signed out and cleared saved Kuma tokens.")
    navigate("/instances")
  }

  function disconnectAll() {
    for (const client of Object.values(clientsRef.current)) {
      client.disconnect()
    }
    clientsRef.current = {}
  }

  function instanceName(instanceId: string) {
    return connectedInstances.find((instance) => instance.config.id === instanceId)?.config.name ?? instanceId
  }

  const isLoginPage = route === "/login" || (sessionState === "authenticating" && configuredInstances.length > 0)
  const isDetailPage = route.startsWith("/monitors/") || route.startsWith("/status-pages/")
  const alertWidthClass =
    sessionState !== "authenticated"
      ? isLoginPage
        ? "mx-auto w-full max-w-md"
        : "mx-auto w-full max-w-5xl"
      : isDetailPage
        ? "mx-auto w-full max-w-3xl"
        : "w-full"
  const statusTone = sessionState === "authenticating" ? "loading" : "success"

  return (
    <main className="dot-grid-bg flex min-h-svh flex-col px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
        <AppHeader sessionState={sessionState} onLogout={logout} />
        <div className="flex flex-1 flex-col gap-6">
          {(statusMessage || errorMessage) && (
            <div className={`${alertWidthClass} grid gap-3`}>
              {statusMessage && <StatusCard message={statusMessage} tone={statusTone} onDismiss={() => setStatusMessage(null)} />}
              {errorMessage && <StatusCard message={errorMessage} tone="error" onDismiss={() => setErrorMessage(null)} />}
            </div>
          )}
          {sessionState !== "authenticated" ? (
            <AuthFlow
              route={route === "/instances" ? "/instances" : "/login"}
              instances={instances}
              authenticating={sessionState === "authenticating"}
              onInstancesChange={setInstances}
              onNavigate={navigate}
              onPasswordLogin={authenticateWithPassword}
            />
          ) : route === "/monitors/new" ? (
            <CreateMonitorPage
              monitorGroups={monitorGroups}
              onBack={() => navigate("/monitors")}
              onNavigate={navigate}
              onCreate={createMonitor}
            />
          ) : route.startsWith("/monitors/") && route !== "/monitors" ? (
            <MonitorPage
              route={route}
              connectedInstances={connectedInstances}
              monitorRecords={monitorRecords}
              monitorGroups={monitorGroups}
              onBack={() => navigate("/monitors")}
              onNavigate={navigate}
              onSave={saveMonitorDetails}
              onRenameTag={renameMonitorTag}
            />
          ) : route === "/monitors" ? (
            <MonitorsPage
              connectedInstances={connectedInstances}
              differences={differences}
              monitorRecords={monitorRecords}
              unmanagedMonitors={unmanagedMonitors}
              monitorGroups={monitorGroups}
              onSyncFrom={syncFrom}
              onApplySuggestedTag={applySuggestedTag}
              onRefresh={refreshMonitors}
              onNavigate={navigate}
            />
          ) : route.startsWith("/status-pages/") && route !== "/status-pages" ? (
            <StatusPageDetailPage
              route={route}
              connectedInstances={connectedInstances}
              statusPageRecords={statusPageRecords}
              onBack={() => navigate("/status-pages")}
              onNavigate={navigate}
              onSave={saveStatusPageDetails}
              onDelete={deleteStatusPageFromAll}
            />
          ) : route === "/status-pages" ? (
            <StatusPagesPage
              connectedInstances={connectedInstances}
              statusPageRecords={statusPageRecords}
              statusPageDifferences={statusPageDifferences}
              onRefresh={refreshStatusPages}
              onNavigate={navigate}
              onCreate={createStatusPage}
            />
          ) : (
            <DashboardPage
              connectedInstances={connectedInstances}
              differences={differences}
              statusPageDifferences={statusPageDifferences}
              monitorRecords={monitorRecords}
              statusPageRecords={statusPageRecords}
              onNavigate={navigate}
            />
          )}
        </div>
        <AppFooter />
      </div>
    </main>
  )
}
