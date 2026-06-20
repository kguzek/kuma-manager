import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { ArrowLeft, Pencil, Save, Search, Tags, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RouteLink } from "@/components/navigation/RouteLink"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Switch } from "@/components/ui/switch"
import { SettingsDiff } from "@/features/monitors/components/SettingsDiff"
import { diffMonitorRecord, getMonitorGroupViews } from "@/features/monitors/utils/monitor-sync"
import { getFieldGroupLabel, getFieldGroupsForMonitor, getFieldLabel } from "@/features/monitors/utils/settings-groups"
import { getMonitorSettingDiffs, getMonitorSettingFields } from "@/features/monitors/utils/settings-diff"
import { getTagSuffix } from "@/lib/monitor-tags"
import type { AppRoute, ConnectedKumaInstance, MonitorDetailsValues, MonitorSyncRecord } from "@/types"

type MonitorPageProps = {
  route: AppRoute
  connectedInstances: ConnectedKumaInstance[]
  monitorRecords: MonitorSyncRecord[]
  monitorGroups: ReturnType<typeof getMonitorGroupViews>
  onBack: () => void
  onNavigate: (route: AppRoute) => void
  onSave: (tag: string, values: MonitorDetailsValues, groupName?: string) => Promise<void>
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>
}

export function MonitorPage({
  route,
  connectedInstances,
  monitorRecords,
  monitorGroups,
  onBack,
  onNavigate,
  onSave,
  onRenameTag,
}: MonitorPageProps) {
  const [editingTag, setEditingTag] = useState(false)
  const [tagSuffixInput, setTagSuffixInput] = useState("")
  const tagSuffix = route.startsWith("/monitors/") ? decodeURIComponent(route.replace("/monitors/", "")) : ""

  useEffect(() => {
    setEditingTag(false)
    setTagSuffixInput("")
  }, [tagSuffix])
  const tag = `monitor:${tagSuffix}`
  const record = monitorRecords.find((entry) => entry.tag === tag)
  const firstMonitor = connectedInstances.map((instance) => record?.monitorsByInstance[instance.config.id]).find(Boolean)

  const allFields = record ? getMonitorSettingFields(record, connectedInstances) : []
  const { groups, unlistedFields } = record ? getFieldGroupsForMonitor(allFields) : { groups: [], unlistedFields: [] }

  const form = useForm<MonitorDetailsValues>({
    values: record && firstMonitor ? Object.fromEntries(allFields.map((field) => [field, firstMonitor[field] ?? ""])) : undefined,
  })

  const allGroupNames = [...new Set(monitorGroups.map((g) => g.group.name))].sort()
  const firstInstanceId = connectedInstances.find((instance) => record?.monitorsByInstance[instance.config.id])?.config.id
  const currentGroupName =
    firstMonitor?.parent && firstInstanceId
      ? (monitorGroups.find((g) => g.instance.config.id === firstInstanceId && g.group.id === firstMonitor.parent)?.group.name ?? "")
      : ""
  const [selectedGroup, setSelectedGroup] = useState(currentGroupName)

  if (!record || !firstMonitor) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Monitor not found</CardTitle>
          <CardDescription>
            No synced monitor exists for <code>{tag}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <RouteLink href="/dashboard" onNavigate={onNavigate}>
              <ArrowLeft /> Back
            </RouteLink>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const settingDiffs = getMonitorSettingDiffs(record, connectedInstances)
  const diffFieldSet = new Set(settingDiffs.map((d) => d.field))
  const structuralDiff = diffMonitorRecord(record, connectedInstances)
  const pendingTag = `monitor:${tagSuffixInput.trim()}`
  const defaultOpenLabels = groups.filter((g) => g.defaultOpen).map((g) => g.label)
  const [accordionValues, setAccordionValues] = useState<string[]>(defaultOpenLabels)
  const [searchQuery, setSearchQuery] = useState("")

  const isReadOnlyField = (field: string) => {
    const v = firstMonitor![field]
    return typeof v === "object" && v !== null
  }

  const matchesSearch = (field: string) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return field.toLowerCase().includes(q) || getFieldLabel(field).toLowerCase().includes(q)
  }

  const sortedFields = (fields: string[]) => {
    const editable = fields.filter((f) => !isReadOnlyField(f) && matchesSearch(f))
    const readonly = fields.filter((f) => isReadOnlyField(f) && matchesSearch(f))
    return [...editable, ...readonly]
  }

  const filteredGroups = groups.map((g) => ({ ...g, actualFields: sortedFields(g.actualFields) })).filter((g) => g.actualFields.length > 0)
  const filteredUnlisted = sortedFields(unlistedFields)

  function scrollToField(field: string) {
    const el = document.getElementById(`monitor-${field}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.closest(".rounded-2xl")?.classList.add("ring-2", "ring-ring", "ring-offset-2", "ring-offset-background")
      setTimeout(() => {
        el.closest(".rounded-2xl")?.classList.remove("ring-2", "ring-ring", "ring-offset-2", "ring-offset-background")
      }, 2000)
    }
  }

  function handleShowField(field: string) {
    const groupLabel = getFieldGroupLabel(field) ?? "Unlisted settings"
    setAccordionValues((current) => {
      if (current.includes(groupLabel)) {
        requestAnimationFrame(() => scrollToField(field))
        return current
      }
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToField(field)))
      return [...current, groupLabel]
    })
  }

  function renderField(field: string) {
    const value = firstMonitor![field]
    const label = getFieldLabel(field)
    const isDiff = diffFieldSet.has(field)

    if (typeof value === "boolean") {
      return (
        <div key={field} className="flex h-12 items-center gap-2 self-end rounded-lg bg-background/40 px-3">
          <label className="flex-1 text-sm" htmlFor={`monitor-${field}`}>
            {label}
          </label>
          <Switch id={`monitor-${field}`} checked={!!form.watch(field)} onCheckedChange={(checked) => form.setValue(field, checked)} />
        </div>
      )
    }

    if (typeof value === "number") {
      return (
        <Field key={field}>
          <FieldLabel htmlFor={`monitor-${field}`}>{label}</FieldLabel>
          <Input
            id={`monitor-${field}`}
            type="number"
            style={isDiff ? { borderColor: "#eab308" } : undefined}
            {...form.register(field, { valueAsNumber: true })}
          />
        </Field>
      )
    }

    if (typeof value === "object" && value !== null) {
      return (
        <Field key={field} className="md:col-span-2">
          <FieldLabel htmlFor={`monitor-${field}`}>{label}</FieldLabel>
          <Input
            id={`monitor-${field}`}
            value={JSON.stringify(value)}
            readOnly
            tabIndex={-1}
            className="cursor-not-allowed text-muted-foreground pointer-events-none"
          />
        </Field>
      )
    }

    return (
      <Field key={field}>
        <FieldLabel htmlFor={`monitor-${field}`}>{label}</FieldLabel>
        <Input id={`monitor-${field}`} style={isDiff ? { borderColor: "#eab308" } : undefined} {...form.register(field)} />
      </Field>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-2">
        <Button variant="ghost" asChild>
          <RouteLink href="/dashboard" onNavigate={onNavigate}>
            <ArrowLeft /> Back
          </RouteLink>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex min-w-0 items-center gap-2">
              <Tags className="size-5" />
              {editingTag ? (
                <InputGroup className="max-w-sm font-mono">
                  <InputGroupAddon>monitor:</InputGroupAddon>
                  <InputGroupInput
                    value={tagSuffixInput}
                    placeholder="example.com"
                    onChange={(event) => setTagSuffixInput(event.target.value.replace(/^monitor:/, ""))}
                  />
                </InputGroup>
              ) : (
                <span className="font-mono">{tag}</span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {editingTag && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!tagSuffixInput.trim() || pendingTag === tag}
                  onClick={() => void onRenameTag(tag, pendingTag)}
                >
                  <Save /> Save tag
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTagSuffixInput(getTagSuffix(tag))
                  setEditingTag((current) => !current)
                }}
              >
                {editingTag ? <X /> : <Pencil />}
              </Button>
            </div>
          </div>
          <CardDescription>Edit shared monitor fields and save them to every instance where this tag exists.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {structuralDiff && structuralDiff.issue === "different" && settingDiffs.length === 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Instances have the same settings, but tags or group assignments differ.
            </div>
          )}
          <div className="grid gap-3">
            <div className="text-sm font-medium">Setting diff</div>
            <SettingsDiff diffs={settingDiffs} emptyMessage="All compared settings match across instances." onShowField={handleShowField} />
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="mb-3 text-sm font-medium">Instances</div>
            <div className="grid gap-2">
              {connectedInstances.map((instance) => {
                const monitor = record.monitorsByInstance[instance.config.id]
                return (
                  <div
                    key={instance.config.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-background/40 px-3 py-2 text-sm"
                  >
                    <span>{instance.config.name}</span>
                    {monitor ? <Badge variant="secondary">{monitor.name}</Badge> : <Badge variant="destructive">Missing</Badge>}
                  </div>
                )
              })}
            </div>
          </div>
          <form className="grid gap-5" onSubmit={form.handleSubmit((values) => onSave(tag, values, selectedGroup || undefined))}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search settings…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="monitor-group">
                Monitor group
              </label>
              <select
                id="monitor-group"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">None</option>
                {allGroupNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <Accordion type="multiple" value={accordionValues} onValueChange={setAccordionValues} className="grid gap-3">
              {filteredGroups.map((group) => (
                <AccordionItem key={group.label} value={group.label} className="rounded-2xl border bg-muted/20">
                  <AccordionTrigger>{group.label}</AccordionTrigger>
                  <AccordionContent>
                    {group.actualFields.some((field) => typeof firstMonitor[field] === "boolean") ? (
                      <div className="grid gap-3 md:grid-cols-2">{group.actualFields.map((field) => renderField(field))}</div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">{group.actualFields.map((field) => renderField(field))}</div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
              {filteredUnlisted.length > 0 && (
                <AccordionItem value="Unlisted settings" className="rounded-2xl border bg-muted/20">
                  <AccordionTrigger>Unlisted settings</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-2">{filteredUnlisted.map((field) => renderField(field))}</div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
            <div className="flex justify-end">
              <Button type="submit">
                <Save /> Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
