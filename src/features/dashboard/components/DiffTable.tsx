import { ArrowRight, ArrowRightLeft, CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { stripMonitorPrefix } from "@/lib/monitor-tags"
import type { AppRoute, ConnectedKumaInstance, MonitorDifference, MonitorSyncRecord } from "@/types"

type DiffTableProps = {
  connectedInstances: ConnectedKumaInstance[]
  differences: MonitorDifference[]
  monitorRecords: MonitorSyncRecord[]
  onSyncFrom: (sourceInstanceId: string, tag: string) => Promise<void>
  onNavigate: (route: AppRoute) => void
}

export function DiffTable({ connectedInstances, differences, monitorRecords, onSyncFrom, onNavigate }: DiffTableProps) {
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
              {monitorRecords.map((record) => {
                const diff = differences.find((entry) => entry.tag === record.tag)
                return (
                  <TableRow key={record.tag}>
                    <TableCell>
                      <Button variant="link" className="h-auto p-0 font-mono text-xs" onClick={() => onNavigate(`/monitors/${encodeURIComponent(stripMonitorPrefix(record.tag))}`)}>
                        {record.tag} <ArrowRight className="size-3" />
                      </Button>
                    </TableCell>
                    {connectedInstances.map((instance) => {
                      const monitor = record.monitorsByInstance[instance.config.id]
                      return <TableCell key={instance.config.id}>{monitor ? monitor.name : <span className="text-muted-foreground">Missing</span>}</TableCell>
                    })}
                    <TableCell>{diff ? <Badge variant="destructive">{diff.description}</Badge> : <Badge variant="secondary"><CheckCircle2 /> In sync</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {connectedInstances.map((instance) => record.monitorsByInstance[instance.config.id] && (
                          <Button key={instance.config.id} size="sm" variant="outline" onClick={() => onSyncFrom(instance.config.id, record.tag)}>Use {instance.config.name}</Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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
