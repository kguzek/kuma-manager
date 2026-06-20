import type { ConnectedKumaInstance, MonitorSyncRecord } from "@/types"
import { DIFF_BYPASS_RULES } from "../constants/diff-bypass-rules"

export type SettingDiff = {
  field: string
  values: Array<{ instanceName: string; value: string }>
}

export const MONITOR_IGNORED_FIELDS = new Set([
  "id",
  "userID",
  "user_id",
  "proxy_id",
  "status",
  "ping",
  "certInfo",
  "tlsInfo",
  "createdDate",
  "created_date",
  "modifiedDate",
  "modified_date",
  "lastStartTime",
  "pathName",
  "tags",
  "parent",
  "jsonPath",
])

export function getMonitorSettingFields(record: MonitorSyncRecord, instances: ConnectedKumaInstance[]) {
  const fields = new Set<string>()

  for (const instance of instances) {
    const monitor = record.monitorsByInstance[instance.config.id]
    if (!monitor) continue
    for (const key of Object.keys(monitor)) {
      if (!MONITOR_IGNORED_FIELDS.has(key)) fields.add(key)
    }
  }

  return [...fields].sort()
}

export function getMonitorSettingDiffs(record: MonitorSyncRecord, instances: ConnectedKumaInstance[]): SettingDiff[] {
  const allFields = getMonitorSettingFields(record, instances)

  return allFields.flatMap((field) => {
    const values = instances.flatMap((instance) => {
      const monitor = record.monitorsByInstance[instance.config.id]
      if (!monitor) return []
      return {
        instanceName: instance.config.name,
        value: formatValue(monitor[field]),
      }
    })

    const getUniqueValueCount = (values: { value: string }[]) => new Set(values.map((entry) => entry.value)).size

    if (getUniqueValueCount(values) <= 1) return []
    for (const bypassRule of DIFF_BYPASS_RULES) {
      if (!bypassRule.ignoreDiffFields.includes(field)) continue
      const instanceId = instances.find((instance) => instance.config.name === bypassRule.instanceName)?.config.id
      if (instanceId == null) continue
      const monitor = record.monitorsByInstance[instanceId]
      if (monitor == null) continue
      if (monitor.tags == null || !monitor.tags.some((tag) => tag.name === bypassRule.monitorMatchTag)) continue
      const uniqueValuesExcludingBypass = getUniqueValueCount(values.filter((entry) => entry.instanceName !== bypassRule.instanceName))

      if (uniqueValuesExcludingBypass > 1) continue
      return []
    }
    return { field, values }
  })
}

export function hasMonitorSettingDiffs(record: MonitorSyncRecord, instances: ConnectedKumaInstance[]) {
  return getMonitorSettingDiffs(record, instances).length > 0
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "∅"
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}
