import { useMemo } from "react"

import type { KumaApiClient } from "@/api/kuma/client"
import { buildStatusPageRecords, diffStatusPageRecord } from "@/features/status-pages/utils/status-page-sync"
import type {
  AppRoute,
  ConnectedKumaInstance,
  KumaStatusPage,
  PublicGroupMonitor,
  StatusPageDetailsValues,
  StatusPageDifference,
} from "@/types"
import { enrichInstancePages } from "@/utils/kuma"
import { resolveTokens, TEMPLATE_SUPPORTED_FIELDS } from "@/utils/template-tokens"

export function useKumaStatusPages(
  connectedInstances: ConnectedKumaInstance[],
  setConnectedInstances: (instances: ConnectedKumaInstance[] | ((prev: ConnectedKumaInstance[]) => ConnectedKumaInstance[])) => void,
  clientsRef: React.MutableRefObject<Record<string, KumaApiClient>>,
  navigate: (route: AppRoute) => void,
  setStatusMessage: (msg: string | null) => void,
  setErrorMessage: (msg: string | null) => void,
  setPendingCount: (count: number | ((prev: number) => number)) => void,
) {
  const statusPageRecords = useMemo(() => buildStatusPageRecords(connectedInstances), [connectedInstances])

  const statusPageDifferences = useMemo(
    () =>
      statusPageRecords
        .map((record) => diffStatusPageRecord(record, connectedInstances))
        .filter((diff): diff is StatusPageDifference => Boolean(diff)),
    [connectedInstances, statusPageRecords],
  )

  async function refreshStatusPages() {
    setStatusMessage("Refreshing status pages...")
    setErrorMessage(null)
    setPendingCount((c) => c + 1)

    try {
      const refreshed = await Promise.all(
        connectedInstances.map(async (instance) => {
          const client = clientsRef.current[instance.config.id]
          const statusPages = await client.getStatusPages()
          const enrichedPages = await enrichInstancePages(statusPages, client)
          return { ...instance, statusPages: enrichedPages }
        }),
      )
      setConnectedInstances(refreshed)
      setStatusMessage("Status pages refreshed.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Refresh failed")
    } finally {
      setPendingCount((c) => c - 1)
    }
  }

  async function enrichInstancePage(slug: string, instanceId: string) {
    const client = clientsRef.current[instanceId]
    if (!client) return null
    const detail = await client.getStatusPage(slug)
    if (detail) {
      setConnectedInstances((current) =>
        current.map((instance) => {
          if (instance.config.id !== instanceId) return instance
          return {
            ...instance,
            statusPages: instance.statusPages?.map((page) => (page.slug === slug ? detail : page)),
          }
        }),
      )
      return detail
    }
    return null
  }

  async function addPublicGroupToInstance(slug: string, instanceId: string, pageId: number, name: string) {
    const client = clientsRef.current[instanceId]
    if (!client) return { ok: false, msg: "No client" }
    const result = await client.addPublicGroup(pageId, name)
    if (result.ok) await enrichInstancePage(slug, instanceId)
    return result
  }

  async function renamePublicGroupOnInstance(slug: string, instanceId: string, groupId: number, name: string) {
    const client = clientsRef.current[instanceId]
    if (!client) return { ok: false, msg: "No client" }
    const result = await client.renamePublicGroup(groupId, name)
    if (result.ok) await enrichInstancePage(slug, instanceId)
    return result
  }

  async function deletePublicGroupFromInstance(slug: string, instanceId: string, groupId: number) {
    const client = clientsRef.current[instanceId]
    if (!client) return { ok: false, msg: "No client" }
    const result = await client.deletePublicGroup(groupId)
    if (result.ok) await enrichInstancePage(slug, instanceId)
    return result
  }

  async function saveStatusPagePublicGroups(slug: string, groupId: number, monitorList: PublicGroupMonitor[]) {
    const record = statusPageRecords.find((entry) => entry.slug === slug)
    if (!record) return { ok: false, msg: "Status page record not found" }

    const firstPage = record.pagesByInstance[Object.keys(record.pagesByInstance)[0]]
    const targetGroup = firstPage?.publicGroupList?.find((g) => g.id === groupId)
    if (!targetGroup) return { ok: false, msg: "Group not found" }

    const errors: string[] = []

    for (const instance of connectedInstances) {
      const page = record.pagesByInstance[instance.config.id]
      if (!page) {
        errors.push(`${instance.config.name}: page not found`)
        continue
      }

      const client = clientsRef.current[instance.config.id]
      if (!client) {
        errors.push(`${instance.config.name}: client not connected`)
        continue
      }

      const updatedGroupList = (page.publicGroupList ?? []).map((g) => {
        if (g.id === groupId || g.name === targetGroup.name) {
          return { ...g, monitorList }
        }
        return g
      })

      const { id: _id, publicGroupList: _pgl, incidents: _inc, ok: _ok, ...config } = page

      try {
        const result = await client.saveStatusPage({
          slug,
          config: config as Record<string, unknown>,
          imgDataUrl: "",
          publicGroupList: updatedGroupList,
        })
        if (!result.ok) {
          errors.push(`${instance.config.name}: ${result.msg ?? "save failed"}`)
        }
      } catch (err) {
        errors.push(`${instance.config.name}: ${err instanceof Error ? err.message : "request failed"}`)
      }
    }

    if (errors.length > 0) {
      return { ok: false, msg: errors.join("; ") }
    }

    await refreshStatusPages()
    return { ok: true }
  }

  async function saveStatusPageDetails(slug: string, values: StatusPageDetailsValues) {
    const record = statusPageRecords.find((entry) => entry.slug === slug)
    if (!record) return

    setStatusMessage(`Saving status page ${slug}...`)
    setErrorMessage(null)
    setPendingCount((c) => c + 1)

    const errors: string[] = []

    try {
      for (const instance of connectedInstances) {
        const page = record.pagesByInstance[instance.config.id]
        if (!page) continue

        const instanceValues: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(values)) {
          if (TEMPLATE_SUPPORTED_FIELDS.has(key) && typeof val === "string") {
            instanceValues[key] = resolveTokens(val, instance.config.name, instance.config.url)
          } else {
            instanceValues[key] = val
          }
        }

        const cleanPage = { ...page }
        delete (cleanPage as Record<string, unknown>).publicGroupList
        delete (cleanPage as Record<string, unknown>).incidents
        delete (cleanPage as Record<string, unknown>).config
        const payload = { ...cleanPage, ...instanceValues }

        const response = await clientsRef.current[instance.config.id].editStatusPage(payload as KumaStatusPage)
        if (!response.ok) {
          errors.push(`${instance.config.name}: ${response.msg ?? "save failed"}`)
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "))
      }

      await refreshStatusPages()
      setStatusMessage(`Saved status page ${slug} across all instances.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed")
    } finally {
      setPendingCount((c) => c - 1)
    }
  }

  async function createStatusPage(slug: string, values: StatusPageDetailsValues) {
    setStatusMessage(`Creating status page ${slug} on all instances...`)
    setErrorMessage(null)
    setPendingCount((c) => c + 1)

    try {
      for (const instance of connectedInstances) {
        const client = clientsRef.current[instance.config.id]

        const instanceValues: StatusPageDetailsValues = {}
        for (const [key, val] of Object.entries(values)) {
          if (TEMPLATE_SUPPORTED_FIELDS.has(key) && typeof val === "string") {
            instanceValues[key] = resolveTokens(val, instance.config.name, instance.config.url)
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
    } finally {
      setPendingCount((c) => c - 1)
    }
  }

  async function deleteStatusPageFromAll(slug: string) {
    const record = statusPageRecords.find((entry) => entry.slug === slug)
    if (!record) return

    setStatusMessage(`Deleting status page ${slug}...`)
    setErrorMessage(null)
    setPendingCount((c) => c + 1)

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
    } finally {
      setPendingCount((c) => c - 1)
    }
  }

  return {
    statusPageRecords,
    statusPageDifferences,
    refreshStatusPages,
    enrichInstancePage,
    addPublicGroupToInstance,
    renamePublicGroupOnInstance,
    deletePublicGroupFromInstance,
    saveStatusPagePublicGroups,
    saveStatusPageDetails,
    createStatusPage,
    deleteStatusPageFromAll,
  }
}
