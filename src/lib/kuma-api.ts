import { io, type Socket } from "socket.io-client"

import type {
  KumaCommandResult,
  KumaInstanceConfig,
  KumaLoginResult,
  KumaMonitor,
} from "@/lib/types"

type KumaServerEvents = {
  monitorList: (payload: Record<string, KumaMonitor>) => void
  updateMonitorIntoList: (payload: Record<string, KumaMonitor>) => void
  deleteMonitorFromList: (monitorID: number) => void
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

  return {
    instance: { ...instance, url: normalizedUrl },
    connect: () => connectSocket(socket, normalizedUrl),
    login: (credentials) =>
      emitWithCallback(socket, "login", { ...credentials, remember: true }),
    loginByToken: (token) => emitWithCallback(socket, "loginByToken", token),
    getMonitors: async () => {
      if (Object.keys(monitorList).length > 0) {
        return Object.values(monitorList)
      }

      return waitForMonitorList(socket)
    },
    addMonitor: (monitor) => emitWithCallback(socket, "add", stripRuntimeMonitorFields(monitor)),
    editMonitor: (monitor) => emitWithCallback(socket, "editMonitor", stripRuntimeMonitorFields(monitor) as KumaMonitor),
    deleteMonitor: (monitorID) => emitWithCallback(socket, "deleteMonitor", monitorID),
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
  ...args: Parameters<KumaClientEvents[Event]> extends [...infer Payload, (response: infer Response) => void]
    ? Payload
    : never
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
