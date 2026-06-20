import { useCallback, useState } from "react"
import {
  ArrowRightLeft,
  Grid2x2,
  Plus,
  RefreshCw,
  SquareCenterlineDashedHorizontal,
  SquareCheck,
  StickyNote,
  StickyNoteCheck,
  StickyNoteX,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { RouteLink } from "@/components/navigation/RouteLink"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DiffTableRowGroup } from "@/features/dashboard/components/DiffTableRowGroup"
import type { getMonitorGroupViews } from "@/features/monitors/utils/monitor-sync"
import { hasMonitorSettingDiffs } from "@/features/monitors/utils/settings-diff"
import type { AppRoute, ConnectedKumaInstance, MonitorDifference, MonitorSyncRecord } from "@/types"

type DiffTableProps = {
  connectedInstances: ConnectedKumaInstance[]
  differences: MonitorDifference[]
  monitorRecords: MonitorSyncRecord[]
  monitorGroups: ReturnType<typeof getMonitorGroupViews>
  monitorToStatusPages: Map<string, string[]>
  onSyncFrom: (sourceInstanceId: string, tag: string) => Promise<void>
  onRefresh: () => Promise<void>
  onNavigate: (route: AppRoute) => void
}

export function DiffTable({
  connectedInstances,
  differences,
  monitorRecords,
  monitorGroups,
  monitorToStatusPages,
  onSyncFrom,
  onRefresh,
  onNavigate,
}: DiffTableProps) {
  const [search, setSearch] = useState("")
  const [syncFilter, setSyncFilter] = useState<"all" | "diff" | "sync">("all")
  const [pageFilter, setPageFilter] = useState<"all" | "has" | "none">("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

  const colCount = connectedInstances.length + 4

  const filteredRecords = monitorRecords.filter((record) => {
    const haystack = [
      record.tag,
      ...Object.values(record.monitorsByInstance).flatMap((monitor) => [monitor.name, monitor.url, monitor.hostname]),
      ...(monitorToStatusPages.get(record.tag) ?? []),
    ]
      .join(" ")
      .toLowerCase()
    const matchesSearch = haystack.includes(search.toLowerCase())
    const hasStatusPages = (monitorToStatusPages.get(record.tag)?.length ?? 0) > 0
    const hasDiff = differences.some((entry) => entry.tag === record.tag) || hasMonitorSettingDiffs(record, connectedInstances)
    const matchesSync = syncFilter === "all" || (syncFilter === "diff" ? hasDiff : !hasDiff)
    const matchesPage = pageFilter === "all" || (pageFilter === "has" ? hasStatusPages : !hasStatusPages)
    return matchesSearch && matchesSync && matchesPage
  })
  const groupedRecords = groupRecordsByMonitorGroup(filteredRecords, monitorGroups, differences, connectedInstances)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5" /> Monitor synchronization
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={isRefreshing} onClick={handleRefresh}>
              <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" variant="outline" asChild>
              <RouteLink href="/monitors/new" onNavigate={onNavigate}>
                <Plus /> New monitor
              </RouteLink>
            </Button>
          </div>
        </div>
        <CardDescription>
          {connectedInstances.length} instance{connectedInstances.length !== 1 ? "s" : ""} · monitors with a <code>monitor:</code> tag are
          synchronized. History, current status, ping, cert info, and IDs are ignored.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input
            className="md:max-w-sm"
            placeholder="Search tag, name, URL, or status page"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-xs text-muted-foreground md:inline">Sync:</span>
            <Button size="sm" variant={syncFilter === "all" ? "default" : "outline"} onClick={() => setSyncFilter("all")}>
              <Grid2x2 className="size-4" /> All
            </Button>
            <Button size="sm" variant={syncFilter === "diff" ? "default" : "outline"} onClick={() => setSyncFilter("diff")}>
              <SquareCenterlineDashedHorizontal className="size-4" /> Changed
            </Button>
            <Button size="sm" variant={syncFilter === "sync" ? "default" : "outline"} onClick={() => setSyncFilter("sync")}>
              <SquareCheck className="size-4" /> In sync
            </Button>
            <Separator orientation="vertical" className="hidden h-5 md:block" />
            <span className="hidden text-xs text-muted-foreground md:inline">Page:</span>
            <Button size="sm" variant={pageFilter === "all" ? "default" : "outline"} onClick={() => setPageFilter("all")}>
              <StickyNote className="size-4" /> All
            </Button>
            <Button size="sm" variant={pageFilter === "has" ? "default" : "outline"} onClick={() => setPageFilter("has")}>
              <StickyNoteCheck className="size-4" /> Has status page
            </Button>
            <Button size="sm" variant={pageFilter === "none" ? "default" : "outline"} onClick={() => setPageFilter("none")}>
              <StickyNoteX className="size-4" /> No status page
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sync tag</TableHead>
                {connectedInstances.map((instance) => (
                  <TableHead key={instance.config.id}>{instance.config.name}</TableHead>
                ))}
                <TableHead>Status page</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedRecords.map(({ groupName, records }) => (
                <DiffTableRowGroup
                  key={groupName}
                  groupName={groupName}
                  records={records}
                  connectedInstances={connectedInstances}
                  differences={differences}
                  monitorToStatusPages={monitorToStatusPages}
                  onNavigate={onNavigate}
                  onSyncFrom={onSyncFrom}
                />
              ))}
              {filteredRecords.length === 0 && monitorRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-10 text-center text-muted-foreground">
                    No managed monitors yet. Add <code>monitor:</code> tags to opt monitors into sync.
                  </TableCell>
                </TableRow>
              )}
              {filteredRecords.length === 0 && monitorRecords.length > 0 && (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-10 text-center text-muted-foreground">
                    No monitors match the selected filter criteria. Try adjusting the sync status or status page filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function groupRecordsByMonitorGroup(
  records: MonitorSyncRecord[],
  monitorGroups: ReturnType<typeof getMonitorGroupViews>,
  differences: MonitorDifference[],
  connectedInstances: ConnectedKumaInstance[],
) {
  const groups = new Map<string, MonitorSyncRecord[]>()

  for (const record of records) {
    const groupName = findRecordGroupName(record, monitorGroups) ?? "Ungrouped"
    groups.set(groupName, [...(groups.get(groupName) ?? []), record])
  }

  return [...groups.entries()].map(([groupName, groupedRecords]) => ({
    groupName,
    records: [...groupedRecords].sort((a, b) => {
      const aDiff = differences.some((d) => d.tag === a.tag) || hasMonitorSettingDiffs(a, connectedInstances)
      const bDiff = differences.some((d) => d.tag === b.tag) || hasMonitorSettingDiffs(b, connectedInstances)
      if (aDiff !== bDiff) return aDiff ? -1 : 1
      return a.tag.localeCompare(b.tag)
    }),
  }))
}

function findRecordGroupName(record: MonitorSyncRecord, monitorGroups: ReturnType<typeof getMonitorGroupViews>) {
  for (const group of monitorGroups) {
    const monitor = record.monitorsByInstance[group.instance.config.id]
    if (monitor?.parent === group.group.id) return group.group.name
  }

  return null
}
