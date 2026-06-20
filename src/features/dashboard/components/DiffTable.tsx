import { useCallback, useState } from "react"
import { AlertCircle, ArrowRightLeft, CheckCircle2, List, Plus, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RouteLink } from "@/components/navigation/RouteLink"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  onSyncFrom: (sourceInstanceId: string, tag: string) => Promise<void>
  onRefresh: () => Promise<void>
  onNavigate: (route: AppRoute) => void
}

export function DiffTable({
  connectedInstances,
  differences,
  monitorRecords,
  monitorGroups,
  onSyncFrom,
  onRefresh,
  onNavigate,
}: DiffTableProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "diff" | "sync">("all")
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
  const filteredRecords = monitorRecords.filter((record) => {
    const haystack = [
      record.tag,
      ...Object.values(record.monitorsByInstance).flatMap((monitor) => [monitor.name, monitor.url, monitor.hostname]),
    ]
      .join(" ")
      .toLowerCase()
    const matchesSearch = haystack.includes(search.toLowerCase())
    const hasDiff = differences.some((entry) => entry.tag === record.tag) || hasMonitorSettingDiffs(record, connectedInstances)
    const matchesFilter = filter === "all" || (filter === "diff" ? hasDiff : !hasDiff)
    return matchesSearch && matchesFilter
  })
  const groupedRecords = groupRecordsByMonitorGroup(filteredRecords, monitorGroups, differences, connectedInstances)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5" /> Diff page
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
          Only monitors with at least one <code>monitor:</code> tag are compared. History, current status, ping, cert info, and IDs are
          ignored.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Input
            className="md:max-w-sm"
            placeholder="Search tag, name, or URL"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
              <List className="size-4" /> All
            </Button>
            <Button size="sm" variant={filter === "diff" ? "default" : "outline"} onClick={() => setFilter("diff")}>
              <AlertCircle className="size-4" /> Changed
            </Button>
            <Button size="sm" variant={filter === "sync" ? "default" : "outline"} onClick={() => setFilter("sync")}>
              <CheckCircle2 className="size-4" /> In sync
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
                  onNavigate={onNavigate}
                  onSyncFrom={onSyncFrom}
                />
              ))}
              {filteredRecords.length === 0 && monitorRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={connectedInstances.length + 3} className="py-10 text-center text-muted-foreground">
                    No managed monitors yet. Add monitor:* tags below to opt monitors into sync.
                  </TableCell>
                </TableRow>
              )}
              {filteredRecords.length === 0 && monitorRecords.length > 0 && (
                <TableRow>
                  <TableCell colSpan={connectedInstances.length + 3} className="py-10 text-center text-muted-foreground">
                    {filter === "diff"
                      ? "All monitors are in sync!"
                      : filter === "sync"
                        ? "All monitors are out of sync."
                        : "No monitors match your search."}
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
