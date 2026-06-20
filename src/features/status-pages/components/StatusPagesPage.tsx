import { useState } from "react"
import { ArrowLeft, ArrowRight, FileBarChart, GitCompareArrows, Plus, RefreshCw, Save, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RouteLink } from "@/components/navigation/RouteLink"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getStatusPageSettingDiffs } from "@/features/status-pages/utils/status-page-sync"
import { getStatusPageFieldLabel } from "@/features/status-pages/utils/status-page-settings"
import type { AppRoute, ConnectedKumaInstance, StatusPageDetailsValues, StatusPageDifference, StatusPageSyncRecord } from "@/types"

type StatusPagesPageProps = {
  connectedInstances: ConnectedKumaInstance[]
  statusPageRecords: StatusPageSyncRecord[]
  statusPageDifferences: StatusPageDifference[]
  onRefresh: () => Promise<void>
  onNavigate: (route: AppRoute) => void
  onCreate: (slug: string, values: StatusPageDetailsValues) => Promise<void>
}

export function StatusPagesPage({
  connectedInstances,
  statusPageRecords,
  statusPageDifferences,
  onRefresh,
  onNavigate,
  onCreate,
}: StatusPagesPageProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createSlug, setCreateSlug] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <RouteLink href="/dashboard" onNavigate={onNavigate}>
              <ArrowLeft /> Dashboard
            </RouteLink>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 text-sm ${
              statusPageDifferences.length === 0
                ? "border-transparent bg-muted/30 text-muted-foreground"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <GitCompareArrows className="size-4" />
            <span className="font-medium">{statusPageDifferences.length}</span>
            <span className="text-muted-foreground">diff{statusPageDifferences.length !== 1 ? "s" : ""}</span>
          </div>
          <Button variant="ghost" asChild>
            <RouteLink href="/monitors" onNavigate={onNavigate}>
              Switch to Monitors <ArrowRight className="size-4" />
            </RouteLink>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="size-5" /> Status Pages
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="size-4" /> New status page
              </Button>
              <Button size="sm" variant="outline" onClick={onRefresh}>
                <RefreshCw className="size-4" /> Refresh
              </Button>
            </div>
          </div>
          <CardDescription>
            Status pages synced across all connected instances. Diffs are detected per-field with template token normalization.
          </CardDescription>
        </CardHeader>
        {showCreate && (
          <CardContent className="border-b pb-4">
            <div className="grid gap-4 rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Create new status page</span>
                <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="cp-title">Title</FieldLabel>
                  <Input id="cp-title" placeholder="My Status Page" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="cp-slug">Slug</FieldLabel>
                  <Input
                    id="cp-slug"
                    placeholder="my-status-page"
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="cp-desc">Description</FieldLabel>
                <Input
                  id="cp-desc"
                  placeholder="Optional description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </Field>
              <div className="flex justify-end">
                <Button
                  disabled={!createTitle.trim() || !createSlug.trim()}
                  onClick={() => {
                    void onCreate(createSlug.trim(), {
                      title: createTitle.trim(),
                      slug: createSlug.trim(),
                      description: createDescription.trim() || "",
                      published: false,
                    })
                    setShowCreate(false)
                    setCreateTitle("")
                    setCreateSlug("")
                    setCreateDescription("")
                  }}
                >
                  <Save /> Create on all instances
                </Button>
              </div>
            </div>
          </CardContent>
        )}
        <CardContent className="grid gap-3">
          {statusPageRecords.length === 0 && (
            <div className="rounded-2xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No status pages found. Create one in Uptime Kuma with a slug to see it here.
            </div>
          )}
          {statusPageRecords.map((record) => {
            const firstPage = connectedInstances.map((instance) => record.pagesByInstance[instance.config.id]).find(Boolean)
            const pageDiff = statusPageDifferences.find((d) => d.slug === record.slug)
            const settingDiffs = getStatusPageSettingDiffs(record, connectedInstances)

            return (
              <RouteLink
                key={record.slug}
                href={`/status-pages/${encodeURIComponent(record.slug)}`}
                onNavigate={onNavigate}
                className="block"
              >
                <div className="group cursor-pointer rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{firstPage?.title ?? record.slug}</span>
                        {firstPage?.published === false && (
                          <Badge variant="outline" className="text-xs">
                            Unpublished
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Slug: <code className="rounded bg-muted px-1">{record.slug}</code>
                        {firstPage?.description && <span className="ml-2">· {firstPage.description}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {pageDiff && (
                          <Badge variant="destructive" className="text-xs">
                            {pageDiff.description}
                          </Badge>
                        )}
                        {settingDiffs.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {settingDiffs.length} setting diff{settingDiffs.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                        {!pageDiff && settingDiffs.length === 0 && (
                          <Badge style={{ backgroundColor: "rgba(74, 222, 128, 0.15)", color: "#4ade80" }} className="text-xs">
                            In sync
                          </Badge>
                        )}
                      </div>
                      {settingDiffs.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {settingDiffs.slice(0, 3).map((diff) => (
                            <div key={diff.field}>{getStatusPageFieldLabel(diff.field)} differs</div>
                          ))}
                          {settingDiffs.length > 3 && <div>and {settingDiffs.length - 3} more</div>}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {Object.keys(record.pagesByInstance).length}/{connectedInstances.length} instances
                      </div>
                    </div>
                  </div>
                </div>
              </RouteLink>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
