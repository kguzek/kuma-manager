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

export type MonitorDetailsValues = Record<string, unknown>

export type StatusPageSyncRecord = {
  slug: string
  pagesByInstance: Record<string, import("@/types/kuma").KumaStatusPage>
}

export type StatusPageDifference = {
  slug: string
  issue: "missing" | "different"
  description: string
  instances: string[]
}

export type StatusPageSettingDiff = {
  field: string
  values: Array<{ instanceName: string; value: string }>
}

export type StatusPageDetailsValues = Record<string, unknown>
