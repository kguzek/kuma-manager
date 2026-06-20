import { normalizeWithTokens } from "@/utils/template-tokens"
import type { ConnectedKumaInstance, KumaStatusPage, StatusPageDifference, StatusPageSettingDiff, StatusPageSyncRecord } from "@/types"

export const STATUS_PAGE_IGNORED_FIELDS = new Set(["id", "ok", "publicGroupList", "incidents"])

export function buildStatusPageRecords(instances: ConnectedKumaInstance[]): StatusPageSyncRecord[] {
  const records = new Map<string, StatusPageSyncRecord>()

  for (const instance of instances) {
    for (const page of instance.statusPages ?? []) {
      const slug = page.slug || `page-${page.id}`
      const existing = records.get(slug) ?? {
        slug,
        pagesByInstance: {},
      }
      existing.pagesByInstance[instance.config.id] = page
      records.set(slug, existing)
    }
  }

  return [...records.values()].sort((a, b) => a.slug.localeCompare(b.slug))
}

export function diffStatusPageRecord(record: StatusPageSyncRecord, instances: ConnectedKumaInstance[]): StatusPageDifference | null {
  const missing = instances.filter((instance) => !record.pagesByInstance[instance.config.id])
  if (missing.length > 0) {
    return {
      slug: record.slug,
      issue: "missing",
      description: `Missing on ${missing.map((instance) => instance.config.name).join(", ")}`,
      instances: missing.map((instance) => instance.config.id),
    }
  }

  const pagesWithInstance = instances.flatMap((instance) => {
    const page = record.pagesByInstance[instance.config.id]
    return page ? [{ page, instanceName: instance.config.name, instanceUrl: instance.config.url }] : []
  })
  const [first, ...rest] = pagesWithInstance.map(({ page, instanceName, instanceUrl }) =>
    normalizeStatusPageForDiff(page, instanceName, instanceUrl),
  )
  const firstJson = JSON.stringify(sortObject(first))
  const different = rest.some((p) => JSON.stringify(sortObject(p)) !== firstJson)

  if (!different) return null

  return {
    slug: record.slug,
    issue: "different",
    description: "Configuration differs between instances",
    instances: instances.map((instance) => instance.config.id),
  }
}

export function getStatusPageSettingFields(record: StatusPageSyncRecord, instances: ConnectedKumaInstance[]): string[] {
  const fields = new Set<string>()

  for (const instance of instances) {
    const page = record.pagesByInstance[instance.config.id]
    if (!page) continue
    for (const key of Object.keys(page)) {
      if (!STATUS_PAGE_IGNORED_FIELDS.has(key)) fields.add(key)
    }
  }

  return [...fields].sort()
}

export function getStatusPageSettingDiffs(record: StatusPageSyncRecord, instances: ConnectedKumaInstance[]): StatusPageSettingDiff[] {
  const allFields = getStatusPageSettingFields(record, instances)

  return allFields.flatMap((field) => {
    const values = instances.flatMap((instance) => {
      const page = record.pagesByInstance[instance.config.id]
      if (!page) return []
      const raw = page[field]
      const normalized = normalizeWithTokens(formatValue(raw), instance.config.name, instance.config.url)
      return {
        instanceName: instance.config.name,
        normalized,
        raw: formatValue(raw),
      }
    })

    const uniqueNormValues = new Set(values.map((v) => v.normalized))
    if (uniqueNormValues.size <= 1) return []

    return {
      field,
      values: values.map((v) => ({ instanceName: v.instanceName, value: v.raw })),
    }
  })
}

export function hasStatusPageSettingDiffs(record: StatusPageSyncRecord, instances: ConnectedKumaInstance[]) {
  return getStatusPageSettingDiffs(record, instances).length > 0
}

function normalizeStatusPageForDiff(page: KumaStatusPage, instanceName: string, instanceUrl?: string) {
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(page)) {
    if (STATUS_PAGE_IGNORED_FIELDS.has(key)) continue
    if (typeof value === "string") {
      normalized[key] = normalizeWithTokens(value, instanceName, instanceUrl)
    } else {
      normalized[key] = value
    }
  }
  return sortObject(normalized)
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

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "∅"
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}
