export type StatusPageFieldGroup = {
  label: string
  defaultOpen: boolean
  fields: string[]
}

export const STATUS_PAGE_KNOWN_FIELDS: StatusPageFieldGroup[] = [
  {
    label: "Core",
    defaultOpen: true,
    fields: ["title", "description", "slug", "icon", "published", "refreshInterval"],
  },
  {
    label: "Display",
    defaultOpen: false,
    fields: ["showTags", "showPoweredBy", "theme"],
  },
  {
    label: "Analytics",
    defaultOpen: false,
    fields: ["analyticsType", "analyticsId", "analyticsScriptUrl"],
  },
  {
    label: "Branding",
    defaultOpen: false,
    fields: ["footerText", "customCSS", "domainNameList"],
  },
]

const knownFieldSet = new Set(STATUS_PAGE_KNOWN_FIELDS.flatMap((group) => group.fields))

export const STATUS_PAGE_FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  slug: "Slug",
  icon: "Icon",
  published: "Published",
  refreshInterval: "Refresh interval (seconds)",
  showTags: "Show tags",
  showPoweredBy: "Show powered by",
  theme: "Theme",
  analyticsType: "Analytics type",
  analyticsId: "Analytics ID",
  analyticsScriptUrl: "Analytics script URL",
  footerText: "Footer text",
  customCSS: "Custom CSS",
  domainNameList: "Domain names",
}

export function getStatusPageFieldGroupLabel(field: string): string | null {
  for (const group of STATUS_PAGE_KNOWN_FIELDS) {
    if (group.fields.includes(field)) return group.label
  }
  return null
}

export function getStatusPageFieldLabel(field: string): string {
  return STATUS_PAGE_FIELD_LABELS[field] ?? field
}

export function getStatusPageFieldGroups(fields: string[]): {
  groups: Array<StatusPageFieldGroup & { actualFields: string[] }>
  unlistedFields: string[]
} {
  const known: Map<string, string[]> = new Map()

  for (const field of fields) {
    if (!knownFieldSet.has(field)) continue
    const label = getStatusPageFieldGroupLabel(field)
    if (!label) continue
    known.set(label, [...(known.get(label) ?? []), field])
  }

  const unlistedFields = fields.filter((field) => !knownFieldSet.has(field))

  const groups = STATUS_PAGE_KNOWN_FIELDS.flatMap((group) => {
    const actualFields = known.get(group.label)
    if (!actualFields || actualFields.length === 0) return []
    return [{ ...group, actualFields }]
  })

  return { groups, unlistedFields }
}
