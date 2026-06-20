import { ArrowRightLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DiffTableRowGroup } from "@/features/dashboard/components/DiffTableRowGroup"
import type { getMonitorGroupViews } from "@/features/monitors/utils/monitor-sync"
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
  const groupedRecords = groupRecordsByMonitorGroup(monitorRecords, monitorGroups)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="size-5" /> Diff page</CardTitle>
        <CardDescription>Only monitors with at least one <code>monitor:</code> tag are compared. History, current status, ping, cert info, and IDs are ignored.</CardDescription>
      </CardHeader>
      <CardContent>
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
              {monitorRecords.length === 0 && (
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
