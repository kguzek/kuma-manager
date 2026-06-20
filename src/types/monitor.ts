import type { KumaMonitor } from "@/types/kuma"

export type MonitorSyncRecord = {
  tag: string
  suggestedTag: string | null
  monitorsByInstance: Record<string, KumaMonitor>
}

export type MonitorDifference = {
  tag: string
  issue: "missing" | "different"
  description: string
  instances: string[]
}

export type MonitorDetailsValues = {
  name: string
  url: string
  interval: number
  retryInterval: number
  maxretries: number
}
