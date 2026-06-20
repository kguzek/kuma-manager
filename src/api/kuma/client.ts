import { io, type Socket } from "socket.io-client"

import type {
  KumaCommandResult,
  KumaIncident,
  KumaInstanceConfig,
  KumaLoginResult,
  KumaMonitor,
  KumaStatusPage,
  KumaTagListResult,
  PublicGroup,
} from "@/types"

type KumaServerEvents = {
  monitorList: (payload: Record<string, KumaMonitor>) => void
  updateMonitorIntoList: (payload: Record<string, KumaMonitor>) => void
  deleteMonitorFromList: (monitorID: number) => void
  statusPageList: (payload: Record<string, KumaStatusPage>) => void
  connect_error: (error: Error) => void
}

type KumaClientEvents = {
  login: (
    data: { username: string; password: string; token?: string; remember?: boolean },
    callback: (response: KumaLoginResult) => void,
  ) => void
  loginByToken: (token: string, callback: (response: KumaLoginResult) => void) => void
  add: (monitor: Partial<KumaMonitor>, callback: (response: KumaCommandResult) => void) => void
  editMonitor: (monitor: KumaMonitor, callback: (response: KumaCommandResult) => void) => void
  deleteMonitor: (monitorID: number, callback: (response: KumaCommandResult) => void) => void
  pauseMonitor: (monitorID: number, callback: (response: KumaCommandResult) => void) => void
  resumeMonitor: (monitorID: number, callback: (response: KumaCommandResult) => void) => void
  getMonitor: (monitorID: number, callback: (response: { ok: boolean; monitor?: KumaMonitor; msg?: string }) => void) => void
  getTags: (callback: (response: KumaTagListResult) => void) => void
  addTag: (
    tag: { name: string; color: string },
    callback: (response: KumaCommandResult & { tag?: { id: number; name: string; color: string } }) => void,
  ) => void
  addMonitorTag: (tagID: number, monitorID: number, value: string | null, callback: (response: KumaCommandResult) => void) => void
  deleteMonitorTag: (tagID: number, monitorID: number, value: string | null, callback: (response: KumaCommandResult) => void) => void
  // Status page events
  getStatusPage: (slug: string, callback: (response: unknown) => void) => void
  getStatusPages: (callback: (response: unknown) => void) => void
  addStatusPage: (page: Partial<KumaStatusPage>, callback: (response: KumaCommandResult) => void) => void
  editStatusPage: (page: KumaStatusPage, callback: (response: KumaCommandResult) => void) => void
  deleteStatusPage: (pageID: number, callback: (response: KumaCommandResult) => void) => void
  addIncident: (pageID: number, incident: Partial<KumaIncident>, callback: (response: KumaCommandResult) => void) => void
  editIncident: (incident: KumaIncident, callback: (response: KumaCommandResult) => void) => void
  deleteIncident: (incidentID: number, callback: (response: KumaCommandResult) => void) => void
  addPublicGroup: (pageID: number, name: string, callback: (response: KumaCommandResult) => void) => void
  editPublicGroup: (groupID: number, group: Partial<PublicGroup>, callback: (response: KumaCommandResult) => void) => void
  deletePublicGroup: (groupID: number, callback: (response: KumaCommandResult) => void) => void
  renamePublicGroup: (groupID: number, name: string, callback: (response: KumaCommandResult) => void) => void
  setPublicGroupMonitors: (
    groupID: number,
    monitorList: Array<{ id: number; name?: string; sendUrl?: boolean }>,
    callback: (response: KumaCommandResult) => void,
  ) => void
  rearrangePublicGroup: (groupIDs: number[], callback: (response: KumaCommandResult) => void) => void
}

export type KumaApiClient = {
  instance: KumaInstanceConfig
  connect: () => Promise<void>
  login: (credentials: { username: string; password: string }) => Promise<KumaLoginResult>
  loginByToken: (token: string) => Promise<KumaLoginResult>
  getMonitors: () => Promise<KumaMonitor[]>
  addMonitor: (monitor: Partial<KumaMonitor>) => Promise<KumaCommandResult>
  editMonitor: (monitor: KumaMonitor) => Promise<KumaCommandResult>
  deleteMonitor: (monitorID: number) => Promise<KumaCommandResult>
  addMonitorTag: (monitorID: number, tagName: string, color?: string) => Promise<KumaCommandResult>
  deleteMonitorTag: (monitorID: number, tagID: number, value?: string | null) => Promise<KumaCommandResult>
  replaceMonitorTag: (monitor: KumaMonitor, oldTagName: string, newTagName: string, color?: string) => Promise<KumaCommandResult>
  getStatusPage: (slug: string) => Promise<KumaStatusPage | null>
  getStatusPages: () => Promise<KumaStatusPage[]>
  addStatusPage: (page: Partial<KumaStatusPage>) => Promise<KumaCommandResult>
  editStatusPage: (page: KumaStatusPage) => Promise<KumaCommandResult>
  deleteStatusPage: (pageID: number) => Promise<KumaCommandResult>
  addIncident: (pageID: number, incident: Partial<KumaIncident>) => Promise<KumaCommandResult>
  editIncident: (incident: KumaIncident) => Promise<KumaCommandResult>
  deleteIncident: (incidentID: number) => Promise<KumaCommandResult>
  addPublicGroup: (pageID: number, name: string) => Promise<KumaCommandResult>
  editPublicGroup: (groupID: number, group: Partial<PublicGroup>) => Promise<KumaCommandResult>
  deletePublicGroup: (groupID: number) => Promise<KumaCommandResult>
  renamePublicGroup: (groupID: number, name: string) => Promise<KumaCommandResult>
  setPublicGroupMonitors: (
    groupID: number,
    monitorList: Array<{ id: number; name?: string; sendUrl?: boolean }>,
  ) => Promise<KumaCommandResult>
  rearrangePublicGroup: (groupIDs: number[]) => Promise<KumaCommandResult>
  disconnect: () => void
}

export function createKumaApiClient(instance: KumaInstanceConfig): KumaApiClient {
  const normalizedUrl = normalizeUrl(instance.url)
  const socket: Socket<KumaServerEvents, KumaClientEvents> = io(normalizedUrl, {
    autoConnect: false,
    transports: ["polling", "websocket"],
    upgrade: true,
    reconnection: false,
    timeout: 15_000,
  })

  let monitorList: Record<string, KumaMonitor> = {}
  let statusPageList: Record<string, KumaStatusPage> = {}

  socket.on("monitorList", (payload) => {
    monitorList = payload
  })

  socket.on("updateMonitorIntoList", (payload) => {
    monitorList = { ...monitorList, ...payload }
  })

  socket.on("deleteMonitorFromList", (monitorID) => {
    const next = { ...monitorList }
    delete next[String(monitorID)]
    monitorList = next
  })

  socket.on("statusPageList", (payload) => {
    statusPageList = payload
  })

  return {
    instance: { ...instance, url: normalizedUrl },
    connect: () => connectSocket(socket, normalizedUrl),
    login: (credentials) => emitWithCallback(socket, "login", { ...credentials, remember: true }),
    loginByToken: (token) => emitWithCallback(socket, "loginByToken", token),
    getMonitors: async () => {
      if (Object.keys(monitorList).length > 0) return Object.values(monitorList)
      return waitForMonitorList(socket)
    },
    addMonitor: (monitor) => emitWithCallback(socket, "add", stripRuntimeMonitorFields(monitor)),
    editMonitor: (monitor) => emitWithCallback(socket, "editMonitor", stripRuntimeMonitorFields(monitor) as KumaMonitor),
    deleteMonitor: (monitorID) => emitWithCallback(socket, "deleteMonitor", monitorID),
    addMonitorTag: async (monitorID, tagName, color = "#2563eb") => {
      const tagsResult = await emitWithCallback(socket, "getTags")
      if (!tagsResult.ok) return { ok: false, msg: tagsResult.msg ?? "Failed to load tags" }

      const existingTag = tagsResult.tags?.find((tag) => tag.name === tagName)
      const tag = existingTag ?? (await emitWithCallback(socket, "addTag", { name: tagName, color })).tag
      if (!tag?.id) return { ok: false, msg: `Failed to create tag ${tagName}` }

      return emitWithCallback(socket, "addMonitorTag", tag.id, monitorID, null)
    },
    deleteMonitorTag: (monitorID, tagID, value = null) => emitWithCallback(socket, "deleteMonitorTag", tagID, monitorID, value),
    replaceMonitorTag: async (monitor, oldTagName, newTagName, color = "#2563eb") => {
      const oldTag = monitor.tags?.find((tag) => tag.name === oldTagName)
      if (oldTag?.tag_id) {
        const removed = await emitWithCallback(socket, "deleteMonitorTag", oldTag.tag_id, monitor.id, oldTag.value ?? null)
        if (!removed.ok) return removed
      }

      const tagsResult = await emitWithCallback(socket, "getTags")
      if (!tagsResult.ok) return { ok: false, msg: tagsResult.msg ?? "Failed to load tags" }
      const existingTag = tagsResult.tags?.find((tag) => tag.name === newTagName)
      const tag = existingTag ?? (await emitWithCallback(socket, "addTag", { name: newTagName, color })).tag
      if (!tag?.id) return { ok: false, msg: `Failed to create tag ${newTagName}` }

      return emitWithCallback(socket, "addMonitorTag", tag.id, monitor.id, null)
    },
    getStatusPage: async (slug) => {
      try {
        const result = await emitWithCallback(socket, "getStatusPage", slug)
        if (result && typeof result === "object") {
          const data = result as Record<string, unknown>
          const config = data.config as Record<string, unknown> | undefined
          if (config) {
            delete data.config
            return { ...config, ...data } as KumaStatusPage
          }
          return data as KumaStatusPage
        }
      } catch {
        /* event not supported by this Kuma version */
      }
      return null
    },
    getStatusPages: async () => {
      if (Object.keys(statusPageList).length > 0) return Object.values(statusPageList)
      try {
        const result = await emitWithCallback(socket, "getStatusPages")
        if (Array.isArray(result)) return result as KumaStatusPage[]
        if (result && typeof result === "object") {
          const pages: KumaStatusPage[] = []
          for (const [, value] of Object.entries(result as Record<string, unknown>)) {
            if (typeof value === "object" && value !== null) pages.push(value as KumaStatusPage)
          }
          if (pages.length > 0) return pages
        }
      } catch {
        /* event not supported by this Kuma version */
      }
      return waitForStatusPageList(socket)
    },
    addStatusPage: (page) => emitWithCallback(socket, "addStatusPage", page),
    editStatusPage: (page) => emitWithCallback(socket, "editStatusPage", page),
    deleteStatusPage: (pageID) => emitWithCallback(socket, "deleteStatusPage", pageID),
    addIncident: (pageID, incident) => emitWithCallback(socket, "addIncident", pageID, incident),
    editIncident: (incident) => emitWithCallback(socket, "editIncident", incident),
    deleteIncident: (incidentID) => emitWithCallback(socket, "deleteIncident", incidentID),
    addPublicGroup: (pageID, name) => emitWithCallback(socket, "addPublicGroup", pageID, name),
    editPublicGroup: (groupID, group) => emitWithCallback(socket, "editPublicGroup", groupID, group),
    deletePublicGroup: (groupID) => emitWithCallback(socket, "deletePublicGroup", groupID),
    renamePublicGroup: (groupID, name) => emitWithCallback(socket, "renamePublicGroup", groupID, name),
    setPublicGroupMonitors: (groupID, monitorList) => emitWithCallback(socket, "setPublicGroupMonitors", groupID, monitorList),
    rearrangePublicGroup: (groupIDs) => emitWithCallback(socket, "rearrangePublicGroup", groupIDs),
    disconnect: () => socket.disconnect(),
  }
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, "")
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function connectSocket(socket: Socket<KumaServerEvents, KumaClientEvents>, url: string) {
  return new Promise<void>((resolve, reject) => {
    let lastError: Error | null = null

    const timeout = window.setTimeout(() => {
      cleanup()
      const suffix = lastError ? ` Last error: ${lastError.message}` : ""
      reject(new Error(`Timed out connecting to ${url}.${suffix}`))
    }, 18_000)

    const cleanup = () => {
      window.clearTimeout(timeout)
      socket.off("connect", onConnect)
      socket.off("connect_error", onError)
    }

    const onConnect = () => {
      cleanup()
      resolve()
    }

    const onError = (error: Error) => {
      lastError = error
    }

    socket.once("connect", onConnect)
    socket.once("connect_error", onError)
    socket.connect()
  })
}

function emitWithCallback<Event extends keyof KumaClientEvents>(
  socket: Socket<KumaServerEvents, KumaClientEvents>,
  event: Event,
  ...args: Parameters<KumaClientEvents[Event]> extends [...infer Payload, (response: infer _Response) => void] ? Payload : never
) {
  type Response = Parameters<KumaClientEvents[Event]> extends [...unknown[], (response: infer R) => void] ? R : never

  return new Promise<Response>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`Kuma API call '${String(event)}' timed out`))
    }, 12_000)

    const callback = (response: Response) => {
      window.clearTimeout(timeout)
      resolve(response)
    }

    const emit = socket.emit as unknown as (this: typeof socket, eventName: string, ...eventArgs: unknown[]) => void
    emit.call(socket, String(event), ...args, callback)
  })
}

function waitForMonitorList(socket: Socket<KumaServerEvents, KumaClientEvents>) {
  return new Promise<KumaMonitor[]>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      socket.off("monitorList", onMonitorList)
      reject(new Error("Timed out waiting for monitor list"))
    }, 12_000)

    const onMonitorList = (payload: Record<string, KumaMonitor>) => {
      window.clearTimeout(timeout)
      resolve(Object.values(payload))
    }

    socket.once("monitorList", onMonitorList)
  })
}

function waitForStatusPageList(socket: Socket<KumaServerEvents, KumaClientEvents>) {
  return new Promise<KumaStatusPage[]>((resolve) => {
    const timeout = window.setTimeout(() => {
      socket.off("statusPageList", onList)
      resolve([])
    }, 8_000)

    const onList = (payload: Record<string, KumaStatusPage>) => {
      window.clearTimeout(timeout)
      resolve(payload ? Object.values(payload) : [])
    }

    socket.once("statusPageList", onList)
  })
}

function stripRuntimeMonitorFields(monitor: Partial<KumaMonitor>): Partial<KumaMonitor> {
  const copy = { ...monitor }
  delete copy.userID
  delete copy.createdDate
  delete copy.modifiedDate
  delete copy.status
  delete copy.ping
  delete copy.certInfo
  delete copy.tlsInfo
  return copy
}
