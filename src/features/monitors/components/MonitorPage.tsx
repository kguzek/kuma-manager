import { useState } from "react"
import { useForm } from "react-hook-form"
import { ArrowLeft, Pencil, Save, Tags, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RouteLink } from "@/components/navigation/RouteLink"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Switch } from "@/components/ui/switch"
import { SettingsDiff } from "@/features/monitors/components/SettingsDiff"
import { diffMonitorRecord } from "@/features/monitors/utils/monitor-sync"
import { getFieldGroupsForMonitor } from "@/features/monitors/utils/settings-groups"
import { getMonitorSettingDiffs, getMonitorSettingFields } from "@/features/monitors/utils/settings-diff"
import { getTagSuffix } from "@/lib/monitor-tags"
import type { AppRoute, ConnectedKumaInstance, MonitorDetailsValues, MonitorSyncRecord } from "@/types"

type MonitorPageProps = {
  route: AppRoute
  connectedInstances: ConnectedKumaInstance[]
  monitorRecords: MonitorSyncRecord[]
  onBack: () => void
  onNavigate: (route: AppRoute) => void
  onSave: (tag: string, values: MonitorDetailsValues) => Promise<void>
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>
}

export function MonitorPage({ route, connectedInstances, monitorRecords, onBack, onNavigate, onSave, onRenameTag }: MonitorPageProps) {
  const [editingTag, setEditingTag] = useState(false)
  const [tagSuffixInput, setTagSuffixInput] = useState("")
  const tagSuffix = route.startsWith("/monitors/") ? decodeURIComponent(route.replace("/monitors/", "")) : ""
  const tag = `monitor:${tagSuffix}`
  const record = monitorRecords.find((entry) => entry.tag === tag)
  const firstMonitor = connectedInstances.map((instance) => record?.monitorsByInstance[instance.config.id]).find(Boolean)

  const allFields = record ? getMonitorSettingFields(record, connectedInstances) : []
  const { groups, unlistedFields } = record ? getFieldGroupsForMonitor(allFields) : { groups: [], unlistedFields: [] }

  const form = useForm<MonitorDetailsValues>({
    values: record && firstMonitor ? Object.fromEntries(allFields.map((field) => [field, firstMonitor[field] ?? ""])) : undefined,
  })

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
  const structuralDiff = diffMonitorRecord(record, connectedInstances)
  const pendingTag = `monitor:${tagSuffixInput.trim()}`

  function renderField(field: string) {
    const value = firstMonitor![field]

    if (typeof value === "boolean") {
      return (
        <div key={field} className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
          <label className="text-sm" htmlFor={`monitor-${field}`}>
            {field}
          </label>
          <Switch id={`monitor-${field}`} checked={!!form.watch(field)} onCheckedChange={(checked) => form.setValue(field, checked)} />
        </div>
      )
    }

    if (typeof value === "number") {
      return (
        <Field key={field}>
          <FieldLabel htmlFor={`monitor-${field}`}>{field}</FieldLabel>
          <Input id={`monitor-${field}`} type="number" {...form.register(field, { valueAsNumber: true })} />
        </Field>
      )
    }

    if (typeof value === "object" && value !== null) {
      return (
        <Field key={field} className="md:col-span-2">
          <FieldLabel htmlFor={`monitor-${field}`}>{field}</FieldLabel>
          <Input id={`monitor-${field}`} value={JSON.stringify(value)} readOnly className="text-muted-foreground" />
        </Field>
      )
    }

    return (
      <Field key={field}>
        <FieldLabel htmlFor={`monitor-${field}`}>{field}</FieldLabel>
        <Input id={`monitor-${field}`} {...form.register(field)} />
      </Field>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <div className="mb-2">
          <Button variant="ghost" asChild>
            <RouteLink href="/dashboard" onNavigate={onNavigate}>
              <ArrowLeft /> Back
            </RouteLink>
          </Button>
        </div>
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
          <SettingsDiff diffs={settingDiffs} emptyMessage="All compared settings match across instances." />
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
        <form className="grid gap-5" onSubmit={form.handleSubmit((values) => onSave(tag, values))}>
          {groups.map((group) => (
            <CollapsibleSection key={group.label} label={group.label} defaultOpen={group.defaultOpen}>
              {group.actualFields.some((field) => typeof firstMonitor[field] === "boolean") ? (
                <div className="grid gap-3 md:grid-cols-2">{group.actualFields.map((field) => renderField(field))}</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">{group.actualFields.map((field) => renderField(field))}</div>
              )}
            </CollapsibleSection>
          ))}
          {unlistedFields.length > 0 && (
            <CollapsibleSection label="Unlisted settings" defaultOpen={false}>
              <div className="grid gap-4 md:grid-cols-2">{unlistedFields.map((field) => renderField(field))}</div>
            </CollapsibleSection>
          )}
          <div className="flex justify-end">
            <Button type="submit">
              <Save /> Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
