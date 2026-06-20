import { startTransition, useEffect, useMemo, useRef, useState } from "react"

import { createKumaApiClient } from "@/api/kuma/client"
import type { KumaApiClient } from "@/api/kuma/client"
import type { AppRoute, ConnectedKumaInstance, KumaInstanceConfig, LoginCredentials, SessionState, StoredKumaToken } from "@/types"
import { enrichInstancePages } from "@/utils/kuma"
import { clearTokens, loadInstances, loadTokens, saveInstances, saveTokens } from "@/utils/storage"

export function useKumaConnection(
  route: AppRoute,
  navigate: (route: AppRoute) => void,
  setStatusMessage: (msg: string | null) => void,
  setErrorMessage: (msg: string | null) => void,
) {
  const [instances, setInstances] = useState<KumaInstanceConfig[]>(() => loadInstances())
  const [tokens, setTokens] = useState<Record<string, StoredKumaToken>>(() => loadTokens())
  const [connectedInstances, setConnectedInstances] = useState<ConnectedKumaInstance[]>([])
  const [sessionState, setSessionState] = useState<SessionState>("configuring")
  const clientsRef = useRef<Record<string, KumaApiClient>>({})

  const configuredInstances = useMemo(() => instances.filter((instance) => instance.url.trim()), [instances])

  const canRestoreSavedLogin = configuredInstances.length > 0 && configuredInstances.every((instance) => tokens[instance.id]?.token)

  useEffect(() => {
    saveInstances(instances)
  }, [instances])

  useEffect(() => {
    saveTokens(tokens)
  }, [tokens])

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
          const enrichedPages = await enrichInstancePages(statusPages, client)
          clientsRef.current[instance.id] = client
          return { config: client.instance, token: login.token, monitors, statusPages: enrichedPages }
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
          const enrichedPages = await enrichInstancePages(statusPages, client)
          clientsRef.current[instance.id] = client
          return { config: client.instance, token: stored.token, monitors, statusPages: enrichedPages }
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

  function logout() {
    disconnectAll()
    clearTokens()
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

  return {
    instances,
    setInstances,
    tokens,
    connectedInstances,
    setConnectedInstances,
    sessionState,
    setSessionState,
    clientsRef,
    configuredInstances,
    canRestoreSavedLogin,
    authenticateWithPassword,
    authenticateWithSavedTokens,
    logout,
    disconnectAll,
  }
}
