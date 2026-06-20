import { useEffect, useState } from "react"
import { ArrowLeft, Braces, FileBarChart, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { useForm } from "react-hook-form"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RouteLink } from "@/components/navigation/RouteLink"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { SettingsDiff } from "@/features/monitors/components/SettingsDiff"
import { getStatusPageSettingDiffs, getStatusPageSettingFields } from "@/features/status-pages/utils/status-page-sync"
import { getStatusPageFieldGroups, getStatusPageFieldLabel } from "@/features/status-pages/utils/status-page-settings"
import { KNOWN_TEMPLATE_TOKENS, TEMPLATE_SUPPORTED_FIELDS } from "@/utils/template-tokens"
import type {
  AppRoute,
  ConnectedKumaInstance,
  KumaCommandResult,
  KumaStatusPage,
  PublicGroupMonitor,
  StatusPageDetailsValues,
  StatusPageSyncRecord,
} from "@/types"

type StatusPageDetailPageProps = {
  route: AppRoute
  connectedInstances: ConnectedKumaInstance[]
  statusPageRecords: StatusPageSyncRecord[]
  onBack: () => void
  onNavigate: (route: AppRoute) => void
  onSave: (slug: string, values: StatusPageDetailsValues) => Promise<void>
  onDelete: (slug: string) => Promise<void>
  onFetchStatusPageDetail: (slug: string, instanceId: string) => Promise<KumaStatusPage | null>
  onAddPublicGroup: (slug: string, instanceId: string, pageId: number, name: string) => Promise<KumaCommandResult>
  onRenamePublicGroup: (slug: string, instanceId: string, groupId: number, name: string) => Promise<KumaCommandResult>
  onDeletePublicGroup: (slug: string, instanceId: string, groupId: number) => Promise<KumaCommandResult>
  onSetPublicGroupMonitors: (
    slug: string,
    instanceId: string,
    groupId: number,
    monitorList: Array<{ id: number; name?: string; sendUrl?: boolean }>,
  ) => Promise<KumaCommandResult>
}

export function StatusPageDetailPage({
  route,
  connectedInstances,
  statusPageRecords,
  onBack: _onBack,
  onNavigate,
  onSave,
  onDelete,
  onFetchStatusPageDetail,
  onAddPublicGroup,
  onRenamePublicGroup,
  onDeletePublicGroup,
  onSetPublicGroupMonitors,
}: StatusPageDetailPageProps) {
  const slug = route.startsWith("/status-pages/") ? decodeURIComponent(route.replace("/status-pages/", "")) : ""
  const record = statusPageRecords.find((entry) => entry.slug === slug)
  const firstPage = connectedInstances.map((instance) => record?.pagesByInstance[instance.config.id]).find(Boolean)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const allFields = record && firstPage ? getStatusPageSettingFields(record, connectedInstances) : []
  const { groups, unlistedFields } = record && firstPage ? getStatusPageFieldGroups(allFields) : { groups: [], unlistedFields: [] }

  const form = useForm<StatusPageDetailsValues>({
    values: record && firstPage ? Object.fromEntries(allFields.map((field) => [field, firstPage[field] ?? ""])) : undefined,
  })

  const defaultOpenLabels = groups.filter((g) => g.defaultOpen).map((g) => g.label)
  const [accordionValues, setAccordionValues] = useState<string[]>(defaultOpenLabels)

  if (!record || !firstPage) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Status page not found</CardTitle>
          <CardDescription>
            No synced status page exists for <code>{slug}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <RouteLink href="/status-pages" onNavigate={onNavigate}>
              <ArrowLeft /> Back
            </RouteLink>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const settingDiffs = getStatusPageSettingDiffs(record, connectedInstances)
  const diffFieldSet = new Set(settingDiffs.map((d) => d.field))

  const isTemplateField = (field: string) => TEMPLATE_SUPPORTED_FIELDS.has(field)

  function getFieldConflicts(field: string) {
    if (!record || !diffFieldSet.has(field)) return null
    const values: { instanceName: string; value: unknown }[] = []
    for (const instance of connectedInstances) {
      const page = record.pagesByInstance[instance.config.id]
      if (!page) continue
      values.push({ instanceName: instance.config.name, value: page[field] })
    }
    const unique = new Set(values.map((v) => JSON.stringify(v.value)))
    if (unique.size <= 1) return null
    return values
  }

  function handleApplyConflictValue(field: string, value: unknown) {
    form.setValue(field, value as never)
    void form.handleSubmit((values) => onSave(slug, values))()
  }

  const [autocompleteField, setAutocompleteField] = useState<string | null>(null)
  const [fullPageData, setFullPageData] = useState<KumaStatusPage | null>(null)

  const pageForGroups = fullPageData ?? firstPage

  useEffect(() => {
    if (!record) return
    const firstInstanceId = Object.keys(record.pagesByInstance)[0]
    if (!firstInstanceId) return
    setFullPageData(null)
    onFetchStatusPageDetail(slug, firstInstanceId).then((data) => {
      if (data) setFullPageData(data)
    })
  }, [slug, record, onFetchStatusPageDetail])

  function renderTemplateIcon() {
    return <Braces className="ml-1.5 inline size-3.5 text-muted-foreground/60" aria-label="Supports template tokens" />
  }

  function handleTokenKeyUp(field: string, e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "{") {
      setAutocompleteField(field)
    } else if (e.key === "Escape") {
      setAutocompleteField(null)
    }
  }

  function insertToken(field: string, token: string) {
    const current = String(form.getValues(field) ?? "")
    const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
    const cursorPos = el?.selectionStart ?? current.length
    const braceIdx = current.lastIndexOf("{", cursorPos - 1)
    if (braceIdx !== -1) {
      const newValue = current.slice(0, braceIdx) + token + current.slice(cursorPos)
      form.setValue(field, newValue)
      setAutocompleteField(null)
      requestAnimationFrame(() => {
        const newPos = braceIdx + token.length
        el?.setSelectionRange(newPos, newPos)
        el?.focus()
      })
    } else {
      const newValue = current.slice(0, cursorPos) + token + current.slice(cursorPos)
      form.setValue(field, newValue)
      setAutocompleteField(null)
      requestAnimationFrame(() => {
        const newPos = cursorPos + token.length
        el?.setSelectionRange(newPos, newPos)
        el?.focus()
      })
    }
  }

  function renderField(field: string) {
    const value = firstPage?.[field]
    const label = getStatusPageFieldLabel(field)
    const isDiff = diffFieldSet.has(field)
    const supportsTokens = isTemplateField(field)
    const conflicts = getFieldConflicts(field)

    function conflictBadges() {
      if (!conflicts) return null
      return (
        <div className="-mb-1 flex flex-wrap gap-1">
          {conflicts.map((c) => (
            <button
              key={c.instanceName}
              type="button"
              onClick={() => handleApplyConflictValue(field, c.value)}
              className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              {c.instanceName}: {String(c.value)}
            </button>
          ))}
        </div>
      )
    }

    if (typeof value === "boolean") {
      return (
        <div key={field} className="flex h-12 items-center gap-2 self-end rounded-lg bg-background/40 px-3">
          <label className="flex-1 text-sm" htmlFor={`sp-${field}`}>
            {label}
          </label>
          {conflictBadges()}
          <Switch id={`sp-${field}`} checked={!!form.watch(field)} onCheckedChange={(checked) => form.setValue(field, checked)} />
        </div>
      )
    }

    if (field === "analyticsType") {
      return (
        <Field key={field}>
          <FieldLabel htmlFor={`sp-${field}`}>{label}</FieldLabel>
          {conflictBadges()}
          <select
            id={`sp-${field}`}
            value={String(form.watch(field) ?? "")}
            onChange={(e) => form.setValue(field, e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">None</option>
            <option value="ga">Google Analytics (GA)</option>
            <option value="umami">Umami</option>
            <option value="matomo">Matomo</option>
            <option value="cloudflare">Cloudflare</option>
            <option value="custom">Custom</option>
          </select>
        </Field>
      )
    }

    if (field === "footerText" || field === "customCSS" || field === "domainNameList") {
      return (
        <Field key={field} className="md:col-span-2">
          <FieldLabel htmlFor={`sp-${field}`}>
            <span>{label}</span>
            {supportsTokens && renderTemplateIcon()}
          </FieldLabel>
          {conflictBadges()}
          <textarea
            id={`sp-${field}`}
            rows={field === "customCSS" ? 8 : 3}
            style={isDiff ? { borderColor: "#eab308" } : undefined}
            className="h-auto w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
            {...form.register(field)}
            onKeyUp={supportsTokens ? (e: React.KeyboardEvent<HTMLTextAreaElement>) => handleTokenKeyUp(field, e) : undefined}
          />
        </Field>
      )
    }

    if (field === "theme") {
      return (
        <Field key={field}>
          <FieldLabel htmlFor={`sp-${field}`}>{label}</FieldLabel>
          {conflictBadges()}
          <select
            id={`sp-${field}`}
            value={String(form.watch(field) ?? "auto")}
            onChange={(e) => form.setValue(field, e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
      )
    }

    return (
      <Field key={field}>
        <FieldLabel htmlFor={`sp-${field}`}>
          <span>{label}</span>
          {supportsTokens && renderTemplateIcon()}
        </FieldLabel>
        {conflictBadges()}
        <Input
          id={`sp-${field}`}
          style={isDiff ? { borderColor: "#eab308" } : undefined}
          {...form.register(field)}
          onKeyUp={supportsTokens ? (e: React.KeyboardEvent<HTMLInputElement>) => handleTokenKeyUp(field, e) : undefined}
        />
      </Field>
    )
  }

  const sortedFields = (fields: string[]) => fields.filter((f) => matchesAllSearch(f))
  const filteredGroups = groups.map((g) => ({ ...g, actualFields: sortedFields(g.actualFields) })).filter((g) => g.actualFields.length > 0)
  const filteredUnlisted = sortedFields(unlistedFields)

  function matchesAllSearch(_field: string) {
    return true
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-2">
        <Button variant="ghost" asChild>
          <RouteLink href="/status-pages" onNavigate={onNavigate}>
            <ArrowLeft /> Back
          </RouteLink>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex min-w-0 items-center gap-2">
              <FileBarChart className="size-5" />
              <span className="font-mono">{firstPage.title || slug}</span>
            </CardTitle>
            <div className="flex gap-2">
              {confirmDelete ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                    <X /> Cancel
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void onDelete(slug)}>
                    <Trash2 /> Confirm delete
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Delete
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Edit shared status page fields and save them to every instance where this slug exists. Text fields support template tokens for
            per-instance customization.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3">
            <div className="text-sm font-medium">Setting diff</div>
            <SettingsDiff diffs={settingDiffs} emptyMessage="All compared settings match across instances." />
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="mb-3 text-sm font-medium">Instances</div>
            <div className="grid gap-2">
              {connectedInstances.map((instance) => {
                const page = record.pagesByInstance[instance.config.id]
                return (
                  <div
                    key={instance.config.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-background/40 px-3 py-2 text-sm"
                  >
                    <span>{instance.config.name}</span>
                    {page ? <Badge variant="secondary">{page.title || page.slug}</Badge> : <Badge variant="destructive">Missing</Badge>}
                  </div>
                )
              })}
            </div>
          </div>
          <form className="grid gap-5" onSubmit={form.handleSubmit((values) => onSave(slug, values))}>
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Braces className="size-4" />
                Template tokens
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Fields marked with <Braces className="inline size-3" /> support template tokens that resolve per-instance on save. Type{" "}
                <kbd className="rounded bg-muted px-1 font-mono">{"{"}</kbd> in a field to insert a token.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Token</th>
                      {connectedInstances.map((instance) => (
                        <th key={instance.config.id} className="pb-2 pr-4 font-medium">
                          {instance.config.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {KNOWN_TEMPLATE_TOKENS.map((token) => {
                      const values = connectedInstances.map((inst) => token.resolve(inst.config.name, inst.config.url))
                      const uniqueValues = new Set(values)
                      return (
                        <tr key={token.token} className="border-b last:border-b-0">
                          <td className="py-2 pr-4 font-mono" style={{ color: token.color }}>
                            {token.token}
                          </td>
                          {values.map((val, i) => (
                            <td key={connectedInstances[i].config.id} className="py-2 pr-4">
                              <span className={uniqueValues.size > 1 ? "text-amber-400" : "text-emerald-400"}>{val}</span>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {autocompleteField && (
              <div className="rounded-xl border border-ring/30 bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Insert template token</span>
                  <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setAutocompleteField(null)}>
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {KNOWN_TEMPLATE_TOKENS.map((token) => (
                    <button
                      key={token.token}
                      type="button"
                      className="rounded-lg border bg-background/40 px-2.5 py-1 font-mono text-xs transition-colors hover:bg-accent"
                      style={{ borderColor: token.color, color: token.color }}
                      onClick={() => insertToken(autocompleteField, token.token)}
                    >
                      {token.token}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Accordion type="multiple" value={accordionValues} onValueChange={setAccordionValues} className="grid gap-3">
              {filteredGroups.map((group) => (
                <AccordionItem key={group.label} value={group.label} className="rounded-2xl border bg-muted/20">
                  <AccordionTrigger>{group.label}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {group.actualFields.map((field) =>
                        field === "published" || field === "showTags" || field === "showPoweredBy" ? (
                          <div key={field} className="md:col-span-2">
                            {renderField(field)}
                          </div>
                        ) : (
                          renderField(field)
                        ),
                      )}
                    </div>
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
      <IncidentsSection record={record} connectedInstances={connectedInstances} slug={slug} />
      <PublicGroupsSection
        record={record}
        connectedInstances={connectedInstances}
        slug={slug}
        onNavigate={onNavigate}
        pageForGroups={pageForGroups}
        onAddPublicGroup={onAddPublicGroup}
        onRenamePublicGroup={onRenamePublicGroup}
        onDeletePublicGroup={onDeletePublicGroup}
        onSetPublicGroupMonitors={onSetPublicGroupMonitors}
      />
    </div>
  )
}

function IncidentsSection({
  record,
  connectedInstances,
  slug: _slug,
}: {
  record: StatusPageSyncRecord
  connectedInstances: ConnectedKumaInstance[]
  slug: string
}) {
  const firstPage = connectedInstances.map((instance) => record.pagesByInstance[instance.config.id]).find(Boolean)
  const incidents = firstPage?.incidents ?? []

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">Incidents</CardTitle>
        </div>
        <CardDescription>Active and past incidents across all instances.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {incidents.length === 0 && <p className="text-sm text-muted-foreground">No incidents.</p>}
        {incidents.map((incident) => (
          <div key={incident.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{incident.title}</span>
              {incident.pin && <Badge variant="secondary">Pinned</Badge>}
              {incident.style && (
                <Badge variant={incident.style === "danger" ? "destructive" : "default"} className="text-xs">
                  {incident.style}
                </Badge>
              )}
            </div>
            {incident.description && <p className="mt-1 text-muted-foreground">{incident.description}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Created: {new Date(incident.createdDate).toLocaleDateString()}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function PublicGroupsSection({
  record,
  connectedInstances,
  slug,
  onNavigate: _onNavigate,
  pageForGroups,
  onAddPublicGroup,
  onRenamePublicGroup,
  onDeletePublicGroup,
  onSetPublicGroupMonitors,
}: {
  record: StatusPageSyncRecord
  connectedInstances: ConnectedKumaInstance[]
  slug: string
  onNavigate: (route: AppRoute) => void
  pageForGroups: KumaStatusPage | null | undefined
  onAddPublicGroup: (slug: string, instanceId: string, pageId: number, name: string) => Promise<KumaCommandResult>
  onRenamePublicGroup: (slug: string, instanceId: string, groupId: number, name: string) => Promise<KumaCommandResult>
  onDeletePublicGroup: (slug: string, instanceId: string, groupId: number) => Promise<KumaCommandResult>
  onSetPublicGroupMonitors: (
    slug: string,
    instanceId: string,
    groupId: number,
    monitorList: Array<{ id: number; name?: string; sendUrl?: boolean }>,
  ) => Promise<KumaCommandResult>
}) {
  const groups = pageForGroups?.publicGroupList ?? []
  const firstInstanceId = Object.keys(record.pagesByInstance)[0]
  const firstInstance = connectedInstances.find((i) => i.config.id === firstInstanceId)

  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [renamingGroupId, setRenamingGroupId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<number | null>(null)
  const [addingMonitorGroupId, setAddingMonitorGroupId] = useState<number | null>(null)

  async function handleAddGroup() {
    if (!newGroupName.trim() || !pageForGroups) return
    await onAddPublicGroup(slug, firstInstanceId!, pageForGroups.id, newGroupName.trim())
    setNewGroupName("")
    setAddingGroup(false)
  }

  async function handleRenameGroup(groupId: number) {
    if (!renameValue.trim()) return
    await onRenamePublicGroup(slug, firstInstanceId!, groupId, renameValue.trim())
    setRenamingGroupId(null)
    setRenameValue("")
  }

  async function handleDeleteGroup(groupId: number) {
    await onDeletePublicGroup(slug, firstInstanceId!, groupId)
    setConfirmDeleteGroupId(null)
  }

  async function handleToggleMonitor(groupId: number, currentList: PublicGroupMonitor[], monitor: { id: number; name: string }) {
    const alreadyInGroup = currentList.some((m) => m.id === monitor.id)
    const newList = alreadyInGroup
      ? currentList.filter((m) => m.id !== monitor.id)
      : [...currentList, { id: monitor.id, name: monitor.name, sendUrl: false }]
    await onSetPublicGroupMonitors(slug, firstInstanceId!, groupId, newList)
  }

  const availableMonitors = firstInstance?.monitors ?? []

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">Monitor Groups</CardTitle>
          {pageForGroups && (
            <Button size="sm" variant="outline" onClick={() => setAddingGroup(true)}>
              <Plus className="size-4" /> Add group
            </Button>
          )}
        </div>
        <CardDescription>Monitor groups displayed on the status page. Configure which monitors appear in each group.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {addingGroup && (
          <div className="flex items-center gap-2 rounded-xl border bg-muted/20 p-3">
            <Input
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddGroup()
                if (e.key === "Escape") setAddingGroup(false)
              }}
              className="h-8"
            />
            <Button size="sm" onClick={handleAddGroup}>
              <Save className="size-3.5" /> Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddingGroup(false)}>
              <X className="size-3.5" />
            </Button>
          </div>
        )}
        {groups.length === 0 && !addingGroup && (
          <p className="text-sm text-muted-foreground">No monitor groups configured. Create one to display monitors on this status page.</p>
        )}
        {groups.map((group) => (
          <div key={group.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              {renamingGroupId === group.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRenameGroup(group.id)
                      if (e.key === "Escape") setRenamingGroupId(null)
                    }}
                    className="h-8"
                  />
                  <Button size="sm" onClick={() => handleRenameGroup(group.id)}>
                    <Save className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRenamingGroupId(null)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-medium">{group.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {group.monitorList?.length ?? 0} monitor{(group.monitorList?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5"
                      onClick={() => {
                        setRenamingGroupId(group.id)
                        setRenameValue(group.name)
                      }}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    {confirmDeleteGroupId === group.id ? (
                      <>
                        <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" onClick={() => handleDeleteGroup(group.id)}>
                          <Trash2 className="size-3" /> Confirm
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => setConfirmDeleteGroupId(null)}>
                          <X className="size-3" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-destructive"
                        onClick={() => setConfirmDeleteGroupId(group.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
            {group.monitorList && group.monitorList.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {group.monitorList.map((m) => (
                  <Badge key={m.id} variant="secondary" className="flex items-center gap-1 text-xs">
                    {m.name}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => handleToggleMonitor(group.id, group.monitorList ?? [], m)}
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-2">
              {addingMonitorGroupId === group.id ? (
                <div className="flex flex-wrap gap-1.5">
                  {availableMonitors
                    .filter((m) => !group.monitorList?.some((gm) => gm.id === m.id))
                    .slice(0, 20)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="rounded-md border bg-background/40 px-2 py-0.5 text-xs transition-colors hover:bg-accent"
                        onClick={() => handleToggleMonitor(group.id, group.monitorList ?? [], m)}
                      >
                        + {m.name}
                      </button>
                    ))}
                  {availableMonitors.length > 20 && (
                    <span className="text-xs text-muted-foreground">… and {availableMonitors.length - 20} more</span>
                  )}
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setAddingMonitorGroupId(null)}>
                    Done
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setAddingMonitorGroupId(group.id)}>
                  <Plus className="size-3" /> Add monitor
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
