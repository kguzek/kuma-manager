import { ArrowLeft, ArrowRight, GitCompareArrows } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RouteLink } from "@/components/navigation/RouteLink"
import { DiffTable } from "@/features/dashboard/components/DiffTable"
import { UnmanagedMonitorsCard } from "@/features/dashboard/components/UnmanagedMonitorsCard"
import type { getMonitorGroupViews, getUnmanagedMonitors } from "@/features/monitors/utils/monitor-sync"
import type { AppRoute, ConnectedKumaInstance, KumaMonitor, MonitorDifference, MonitorSyncRecord } from "@/types"

type MonitorsPageProps = {
  connectedInstances: ConnectedKumaInstance[]
  differences: MonitorDifference[]
  monitorRecords: MonitorSyncRecord[]
  unmanagedMonitors: ReturnType<typeof getUnmanagedMonitors>
  monitorGroups: ReturnType<typeof getMonitorGroupViews>
  monitorToStatusPages: Map<string, string[]>
  onSyncFrom: (sourceInstanceId: string, tag: string) => Promise<void>
  onApplySuggestedTag: (instanceId: string, monitor: KumaMonitor, tag: string) => Promise<void>
  onRefresh: () => Promise<void>
  onNavigate: (route: AppRoute) => void
}

export function MonitorsPage({
  connectedInstances,
  differences,
  monitorRecords,
  unmanagedMonitors,
  monitorGroups,
  monitorToStatusPages,
  onSyncFrom,
  onApplySuggestedTag,
  onRefresh,
  onNavigate,
}: MonitorsPageProps) {
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
              differences.length === 0
                ? "border-transparent bg-muted/30 text-muted-foreground"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <GitCompareArrows className="size-4" />
            <span className="font-medium">{differences.length}</span>
            <span className="text-muted-foreground">diff{differences.length !== 1 ? "s" : ""}</span>
          </div>
          <Button variant="ghost" asChild>
            <RouteLink href="/status-pages" onNavigate={onNavigate}>
              Switch to Status Pages <ArrowRight className="size-4" />
            </RouteLink>
          </Button>
        </div>
      </div>
      <DiffTable
        connectedInstances={connectedInstances}
        differences={differences}
        monitorRecords={monitorRecords}
        monitorGroups={monitorGroups}
        monitorToStatusPages={monitorToStatusPages}
        onSyncFrom={onSyncFrom}
        onRefresh={onRefresh}
        onNavigate={onNavigate}
      />
      <UnmanagedMonitorsCard unmanagedMonitors={unmanagedMonitors} onApplySuggestedTag={onApplySuggestedTag} />
    </div>
  )
}
