import type { ConnectedKumaInstance, KumaMonitor, MonitorDifference, MonitorSyncRecord } from "@/lib/types"

const SYNC_TAG_PREFIX = "monitor:"
const IGNORED_MONITOR_FIELDS = new Set([
  "id",
  "userID",
  "status",
  "ping",
  "certInfo",
  "tlsInfo",
  "createdDate",
  "modifiedDate",
  "lastStartTime",
  "pathName",
])

export function getMonitorSyncTag(monitor: KumaMonitor): string | null {
  return monitor.tags?.find((tag) => tag.name.startsWith(SYNC_TAG_PREFIX))?.name ?? null
}

export function getSuggestedMonitorSyncTag(monitor: KumaMonitor): string | null {
  const domain = getMonitorDomain(monitor)
  return domain ? `${SYNC_TAG_PREFIX}${domain}` : null
}

export function getMonitorDomain(monitor: KumaMonitor): string | null {
  if (typeof monitor.url === "string" && monitor.url.trim()) {
    try {
      return new URL(monitor.url).hostname
    } catch {
      return monitor.url.replace(/^https?:\/\//, "").split("/")[0] || null
    }
  }

  if (typeof monitor.hostname === "string" && monitor.hostname.trim()) {
    return monitor.hostname.trim()
  }

  return null
}

export function buildMonitorRecords(instances: ConnectedKumaInstance[]): MonitorSyncRecord[] {
  const records = new Map<string, MonitorSyncRecord>()

  for (const instance of instances) {
    for (const monitor of instance.monitors) {
      const tag = getMonitorSyncTag(monitor)
      if (!tag) continue

      const existing = records.get(tag) ?? {
        tag,
        suggestedTag: getSuggestedMonitorSyncTag(monitor),
        monitorsByInstance: {},
      }

      existing.monitorsByInstance[instance.config.id] = monitor
      records.set(tag, existing)
    }
  }

  return [...records.values()].sort((a, b) => a.tag.localeCompare(b.tag))
}

export function getUnmanagedMonitors(instances: ConnectedKumaInstance[]) {
  return instances.flatMap((instance) =>
    instance.monitors
      .filter((monitor) => !getMonitorSyncTag(monitor))
      .map((monitor) => ({ instance, monitor, suggestedTag: getSuggestedMonitorSyncTag(monitor) })),
  )
}

export function diffMonitorRecord(record: MonitorSyncRecord, instances: ConnectedKumaInstance[]): MonitorDifference | null {
  const missing = instances.filter((instance) => !record.monitorsByInstance[instance.config.id])
  if (missing.length > 0) {
    return {
      tag: record.tag,
      issue: "missing",
      description: `Missing on ${missing.map((instance) => instance.config.name).join(", ")}`,
      instances: missing.map((instance) => instance.config.id),
    }
  }

  const monitors = instances.map((instance) => record.monitorsByInstance[instance.config.id]).filter(Boolean)
  const [first, ...rest] = monitors.map(normalizeMonitorForDiff)
  const firstJson = stableJson(first)
  const different = rest.some((monitor) => stableJson(monitor) !== firstJson)

  if (!different) return null

  return {
    tag: record.tag,
    issue: "different",
    description: "Configuration differs between instances",
    instances: instances.map((instance) => instance.config.id),
  }
}

export function normalizeMonitorForDiff(monitor: KumaMonitor) {
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(monitor)) {
    if (IGNORED_MONITOR_FIELDS.has(key)) continue
    if (key === "tags") {
      normalized.tags = (monitor.tags ?? [])
        .map((tag) => ({ name: tag.name, value: tag.value ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name))
      continue
    }
    normalized[key] = value
  }

  return sortObject(normalized)
}

export function prepareMonitorForCreate(source: KumaMonitor): Partial<KumaMonitor> {
  const { id: _id, userID: _userID, ...copy } = source
  return copy
}

export function prepareMonitorForEdit(source: KumaMonitor, target: KumaMonitor): KumaMonitor {
  return {
    ...prepareMonitorForCreate(source),
    id: target.id,
  } as KumaMonitor
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortObject(value))
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject)
  if (!value || typeof value !== "object") return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, sortObject(entry)]),
  )
}
