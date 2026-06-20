import { Pencil, Tags, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { getPendingTag, getTagSuffix } from "@/lib/monitor-tags"
import type { ConnectedKumaInstance, KumaMonitor } from "@/types"

type UnmanagedMonitorRowProps = {
  instance: ConnectedKumaInstance
  monitor: KumaMonitor
  suggestedTag: string | null
  customTag: string | undefined
  editing: boolean
  onCustomTagChange: (tag: string) => void
  onToggleEdit: () => void
  onApplyTag: (tag: string) => void
}

export function UnmanagedMonitorRow({ instance, monitor, suggestedTag, customTag, editing, onCustomTagChange, onToggleEdit, onApplyTag }: UnmanagedMonitorRowProps) {
  const pendingTag = getPendingTag(customTag, suggestedTag)

  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border p-4 md:flex-row md:items-center">
      <div>
        <div className="font-medium">{monitor.name}</div>
        <div className="text-sm text-muted-foreground">{instance.config.name} · {monitor.url ?? monitor.hostname ?? "No URL/hostname"}</div>
      </div>
      <div className="flex min-w-80 flex-wrap items-center justify-end gap-2">
        {editing ? (
          <InputGroup className="w-72 font-mono">
            <InputGroupAddon>monitor:</InputGroupAddon>
            <InputGroupInput value={getTagSuffix(customTag ?? suggestedTag)} placeholder="example.com" onChange={(event) => onCustomTagChange(`monitor:${event.target.value.replace(/^monitor:/, "")}`)} />
          </InputGroup>
        ) : (
          <Badge variant="outline" className="w-72 justify-start font-mono">{suggestedTag ?? "No suggestion"}</Badge>
        )}
        <Button size="sm" variant="ghost" aria-label="Edit tag" onClick={onToggleEdit}>{editing ? <X /> : <Pencil />}</Button>
        <Button size="sm" variant="outline" disabled={!pendingTag.startsWith("monitor:")} onClick={() => onApplyTag(pendingTag)}><Tags /> Add</Button>
      </div>
    </div>
  )
}
