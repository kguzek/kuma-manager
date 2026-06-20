import { MetricCard } from "@/components/layout/MetricCard"
import { DiffTable } from "@/features/dashboard/components/DiffTable"
import { MonitorGroupsCard } from "@/features/dashboard/components/MonitorGroupsCard"
import { UnmanagedMonitorsCard } from "@/features/dashboard/components/UnmanagedMonitorsCard"
import type { getMonitorGroupViews, getUnmanagedMonitors } from "@/features/monitors/utils/monitor-sync"
import type { AppRoute, ConnectedKumaInstance, KumaMonitor, MonitorDifference, MonitorSyncRecord } from "@/types"

type DashboardPageProps = {
  connectedInstances: ConnectedKumaInstance[]
  differences: MonitorDifference[]
  monitorRecords: MonitorSyncRecord[]
  unmanagedMonitors: ReturnType<typeof getUnmanagedMonitors>
  monitorGroups: ReturnType<typeof getMonitorGroupViews>
  onSyncFrom: (sourceInstanceId: string, tag: string) => Promise<void>
  onApplySuggestedTag: (instanceId: string, monitor: KumaMonitor, tag: string) => Promise<void>
  onNavigate: (route: AppRoute) => void
}

export function DashboardPage({ connectedInstances, differences, monitorRecords, unmanagedMonitors, monitorGroups, onSyncFrom, onApplySuggestedTag, onNavigate }: DashboardPageProps) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Instances" value={connectedInstances.length} description="Authenticated Kuma servers" />
        <MetricCard title="Managed monitors" value={monitorRecords.length} description="Records with monitor:* tags" />
        <MetricCard title="Diffs" value={differences.length} description="Missing or different configs" />
      </section>
      <DiffTable connectedInstances={connectedInstances} differences={differences} monitorRecords={monitorRecords} onSyncFrom={onSyncFrom} onNavigate={onNavigate} />
      <MonitorGroupsCard monitorGroups={monitorGroups} />
      <UnmanagedMonitorsCard unmanagedMonitors={unmanagedMonitors} onApplySuggestedTag={onApplySuggestedTag} />
    </div>
  )
}
