import { useState } from "react"
import { ArrowRightLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
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
  onNavigate: (route: AppRoute) => void
}

export function DiffTable({ connectedInstances, differences, monitorRecords, monitorGroups, onSyncFrom, onNavigate }: DiffTableProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "diff" | "sync">("all")
  const filteredRecords = monitorRecords.filter((record) => {
    const haystack = [
      record.tag,
      ...Object.values(record.monitorsByInstance).flatMap((monitor) => [monitor.name, monitor.url, monitor.hostname]),
    ].join(" ").toLowerCase()
    const matchesSearch = haystack.includes(search.toLowerCase())
    const hasDiff = differences.some((entry) => entry.tag === record.tag) || hasMonitorSettingDiffs(record, connectedInstances)
    const matchesFilter = filter === "all" || (filter === "diff" ? hasDiff : !hasDiff)
    return matchesSearch && matchesFilter
  })
  const groupedRecords = groupRecordsByMonitorGroup(filteredRecords, monitorGroups)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="size-5" /> Diff page</CardTitle>
        <CardDescription>Only monitors with at least one <code>monitor:</code> tag are compared. History, current status, ping, cert info, and IDs are ignored.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Input className="md:max-w-sm" placeholder="Search tag, name, or URL..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
            <Button size="sm" variant={filter === "diff" ? "default" : "outline"} onClick={() => setFilter("diff")}>Changed</Button>
            <Button size="sm" variant={filter === "sync" ? "default" : "outline"} onClick={() => setFilter("sync")}>In sync</Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sync tag</TableHead>
                {connectedInstances.map((instance) => <TableHead key={instance.config.id}>{instance.config.name}</TableHead>)}
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
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={connectedInstances.length + 3} className="py-10 text-center text-muted-foreground">No managed monitors yet. Add monitor:* tags below to opt monitors into sync.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function groupRecordsByMonitorGroup(records: MonitorSyncRecord[], monitorGroups: ReturnType<typeof getMonitorGroupViews>) {
  const groups = new Map<string, MonitorSyncRecord[]>()

  for (const record of records) {
    const groupName = findRecordGroupName(record, monitorGroups) ?? "Ungrouped"
    groups.set(groupName, [...(groups.get(groupName) ?? []), record])
  }

  return [...groups.entries()].map(([groupName, groupedRecords]) => ({ groupName, records: groupedRecords }))
}

function findRecordGroupName(record: MonitorSyncRecord, monitorGroups: ReturnType<typeof getMonitorGroupViews>) {
  for (const group of monitorGroups) {
    const monitor = record.monitorsByInstance[group.instance.config.id]
    if (monitor?.parent === group.group.id) return group.group.name
  }

  return null
}
