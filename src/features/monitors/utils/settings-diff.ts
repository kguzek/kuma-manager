import type { ConnectedKumaInstance, KumaMonitor, MonitorSyncRecord } from "@/types"

export type SettingDiff = {
  field: string
  values: Array<{ instanceName: string; value: string }>
}

const COMPARED_FIELDS: Array<keyof KumaMonitor> = [
  "name",
  "type",
  "url",
  "hostname",
  "port",
  "method",
  "interval",
  "retryInterval",
  "maxretries",
  "active",
]

export function getMonitorSettingDiffs(record: MonitorSyncRecord, instances: ConnectedKumaInstance[]): SettingDiff[] {
  return COMPARED_FIELDS.flatMap((field) => {
    const values = instances.flatMap((instance) => {
      const monitor = record.monitorsByInstance[instance.config.id]
      if (!monitor) return []
      return { instanceName: instance.config.name, value: formatValue(monitor[field]) }
    })

    if (new Set(values.map((entry) => entry.value)).size <= 1) return []
    return { field: String(field), values }
  })
}

export function hasMonitorSettingDiffs(record: MonitorSyncRecord, instances: ConnectedKumaInstance[]) {
  return getMonitorSettingDiffs(record, instances).length > 0
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "∅"
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}
