import { useState } from "react"
import { Tags } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UnmanagedMonitorRow } from "@/features/dashboard/components/UnmanagedMonitorRow"
import type { getUnmanagedMonitors } from "@/features/monitors/utils/monitor-sync"
import type { KumaMonitor } from "@/types"

type UnmanagedMonitorsCardProps = {
  unmanagedMonitors: ReturnType<typeof getUnmanagedMonitors>
  onApplySuggestedTag: (instanceId: string, monitor: KumaMonitor, tag: string) => Promise<void>
}

export function UnmanagedMonitorsCard({ unmanagedMonitors, onApplySuggestedTag }: UnmanagedMonitorsCardProps) {
  const [customTags, setCustomTags] = useState<Record<string, string>>({})
  const [editingTags, setEditingTags] = useState<Record<string, boolean>>({})

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Tags className="size-5" /> Unmanaged monitors</CardTitle>
        <CardDescription>These monitors do not have a <code>monitor:</code> tag. Suggested tags are initially based on the URL or hostname domain.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {unmanagedMonitors.map(({ instance, monitor, suggestedTag }) => {
          const key = `${instance.config.id}-${monitor.id}`

          return (
            <UnmanagedMonitorRow
              key={key}
              instance={instance}
              monitor={monitor}
              suggestedTag={suggestedTag}
              customTag={customTags[key]}
              editing={!!editingTags[key]}
              onCustomTagChange={(tag) => setCustomTags((current) => ({ ...current, [key]: tag }))}
              onToggleEdit={() => {
                setCustomTags((current) => ({ ...current, [key]: current[key] ?? suggestedTag ?? "monitor:" }))
                setEditingTags((current) => ({ ...current, [key]: !current[key] }))
              }}
              onApplyTag={(tag) => void onApplySuggestedTag(instance.config.id, monitor, tag)}
            />
          )
        })}
        {unmanagedMonitors.length === 0 && <p className="text-sm text-muted-foreground">Every loaded monitor has a sync tag.</p>}
      </CardContent>
    </Card>
  )
}
