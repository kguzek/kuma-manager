import { Server } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { getMonitorGroupViews } from "@/features/monitors/utils/monitor-sync"

type MonitorGroupsCardProps = {
  monitorGroups: ReturnType<typeof getMonitorGroupViews>
}

export function MonitorGroupsCard({ monitorGroups }: MonitorGroupsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Server className="size-5" /> Monitor groups</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {monitorGroups.map(({ instance, group, children }) => (
          <div key={`${instance.config.id}-${group.id}`} className="rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium"><Server className="size-4 text-muted-foreground" /> {group.name}</div>
              <Badge variant="outline">{instance.config.name}</Badge>
            </div>
            <div className="mt-3 grid gap-2 border-l pl-4">
              {children.map((monitor) => (
                <div key={monitor.id} className="flex items-center justify-between gap-3 rounded-lg bg-background/40 px-3 py-2 text-sm">
                  <span>{monitor.name}</span>
                  <span className="text-muted-foreground">{monitor.url ?? monitor.hostname ?? monitor.type}</span>
                </div>
              ))}
              {children.length === 0 && <p className="text-sm text-muted-foreground">No child monitors.</p>}
            </div>
          </div>
        ))}
        {monitorGroups.length === 0 && <p className="text-sm text-muted-foreground">No monitor groups found.</p>}
      </CardContent>
    </Card>
  )
}
