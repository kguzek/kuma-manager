import { Fragment } from "react"
import { AlertCircle, ArrowRight, Check, CheckCircle2, ExternalLink } from "lucide-react"

import { RouteLink } from "@/components/navigation/RouteLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { SettingsDiff } from "@/features/monitors/components/SettingsDiff"
import { getMonitorSettingDiffs } from "@/features/monitors/utils/settings-diff"
import { stripMonitorPrefix } from "@/lib/monitor-tags"
import type { AppRoute, ConnectedKumaInstance, MonitorDifference, MonitorSyncRecord } from "@/types"

type DiffTableRowGroupProps = {
  groupName: string
  records: MonitorSyncRecord[]
  connectedInstances: ConnectedKumaInstance[]
  differences: MonitorDifference[]
  monitorToStatusPages: Map<string, string[]>
  onNavigate: (route: AppRoute) => void
  onSyncFrom: (sourceInstanceId: string, tag: string) => Promise<void>
}

export function DiffTableRowGroup({
  groupName,
  records,
  connectedInstances,
  differences,
  monitorToStatusPages,
  onNavigate,
  onSyncFrom,
}: DiffTableRowGroupProps) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell
          colSpan={connectedInstances.length + 4}
          className="py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {groupName}
        </TableCell>
      </TableRow>
      {records.map((record) => {
        const diff = differences.find((entry) => entry.tag === record.tag)
        const settingDiffs = getMonitorSettingDiffs(record, connectedInstances)
        const statusPages = monitorToStatusPages.get(record.tag) ?? []
        return (
          <Fragment key={record.tag}>
            <TableRow key={record.tag}>
              <TableCell>
                <Button variant="link" className="h-auto p-0 font-mono text-xs" asChild>
                  <RouteLink href={`/monitors/${encodeURIComponent(stripMonitorPrefix(record.tag))}`} onNavigate={onNavigate}>
                    {record.tag} <ArrowRight className="size-3" />
                  </RouteLink>
                </Button>
              </TableCell>
              {connectedInstances.map((instance) => {
                const monitor = record.monitorsByInstance[instance.config.id]
                return (
                  <TableCell key={instance.config.id}>
                    {monitor ? monitor.name : <span className="text-muted-foreground">Missing</span>}
                  </TableCell>
                )
              })}
              <TableCell>
                {statusPages.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {statusPages.map((sp) => (
                      <Button key={sp} variant="link" className="h-auto p-0 text-xs" asChild>
                        <RouteLink href={`/status-pages/${encodeURIComponent(sp)}`} onNavigate={onNavigate}>
                          <ExternalLink className="mr-0.5 size-3" /> {sp}
                        </RouteLink>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {settingDiffs.length > 0 ? (
                  <Badge variant="destructive">
                    <AlertCircle /> Out of sync
                  </Badge>
                ) : diff ? (
                  <Badge variant="destructive">{diff.description}</Badge>
                ) : (
                  <Badge style={{ backgroundColor: "rgba(74, 222, 128, 0.15)", color: "#4ade80" }}>
                    <CheckCircle2 /> In sync
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {(settingDiffs.length > 0 || diff) && (
                  <div className="flex flex-wrap justify-end gap-2">
                    {connectedInstances.map(
                      (instance) =>
                        record.monitorsByInstance[instance.config.id] && (
                          <Button
                            key={instance.config.id}
                            size="sm"
                            variant="outline"
                            onClick={() => onSyncFrom(instance.config.id, record.tag)}
                          >
                            <Check className="size-4" /> Use {instance.config.name}
                          </Button>
                        ),
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
            {settingDiffs.length > 0 && (
              <TableRow key={`${record.tag}-diff`}>
                <TableCell colSpan={connectedInstances.length + 4}>
                  <SettingsDiff diffs={settingDiffs} />
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        )
      })}
    </>
  )
}
