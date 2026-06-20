import { Activity, ArrowRight, FileBarChart } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RouteLink } from "@/components/navigation/RouteLink"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/layout/MetricCard"
import type {
  AppRoute,
  ConnectedKumaInstance,
  MonitorDifference,
  MonitorSyncRecord,
  StatusPageDifference,
  StatusPageSyncRecord,
} from "@/types"

type DashboardPageProps = {
  connectedInstances: ConnectedKumaInstance[]
  differences: MonitorDifference[]
  statusPageDifferences: StatusPageDifference[]
  monitorRecords: MonitorSyncRecord[]
  statusPageRecords: StatusPageSyncRecord[]
  onNavigate: (route: AppRoute) => void
}

export function DashboardPage({
  connectedInstances,
  differences,
  statusPageDifferences,
  monitorRecords,
  statusPageRecords,
  onNavigate,
}: DashboardPageProps) {
  const totalDiffs = differences.length + statusPageDifferences.length

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Instances" value={connectedInstances.length} description="Authenticated Kuma servers" />
        <MetricCard
          title="Managed monitors"
          value={monitorRecords.length}
          description={
            <>
              Record{monitorRecords.length === 1 ? "" : "s"} with{" "}
              <Badge className="font-mono" variant="ghost">
                monitor:*
              </Badge>{" "}
              tags
            </>
          }
        />
        <MetricCard
          title="Configuration conflicts"
          value={totalDiffs}
          description={`${differences.length} monitor diff${differences.length === 1 ? "" : "s"} · ${statusPageDifferences.length} status page diff${statusPageDifferences.length === 1 ? "" : "s"}`}
          tone={totalDiffs === 0 ? "success" : "error"}
        />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" /> Monitors
            </CardTitle>
            <CardDescription>
              {monitorRecords.length} managed monitor
              {monitorRecords.length !== 1 ? "s" : ""}
              {differences.length > 0 && (
                <span className="ml-2">
                  <Badge variant="destructive">
                    {differences.length} diff
                    {differences.length !== 1 ? "s" : ""}
                  </Badge>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <RouteLink href="/monitors" onNavigate={onNavigate}>
                Manage monitors <ArrowRight className="size-4" />
              </RouteLink>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="size-5" /> Status Pages
            </CardTitle>
            <CardDescription>
              {statusPageRecords.length} status page
              {statusPageRecords.length !== 1 ? "s" : ""}
              {statusPageDifferences.length > 0 && (
                <span className="ml-2">
                  <Badge variant="destructive">
                    {statusPageDifferences.length} diff
                    {statusPageDifferences.length !== 1 ? "s" : ""}
                  </Badge>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <RouteLink href="/status-pages" onNavigate={onNavigate}>
                Manage status pages <ArrowRight className="size-4" />
              </RouteLink>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
