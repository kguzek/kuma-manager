import type { SettingDiff } from "@/features/monitors/utils/settings-diff"

type SettingsDiffProps = {
  diffs: SettingDiff[]
  emptyMessage?: string
}

export function SettingsDiff({ diffs, emptyMessage = "No setting differences." }: SettingsDiffProps) {
  if (diffs.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background/60 font-mono text-xs">
      {diffs.map((diff) => (
        <div key={diff.field} className="border-b last:border-b-0">
          <div className="bg-muted/50 px-3 py-2 text-muted-foreground">@@ {diff.field} @@</div>
          {diff.values.map((entry, index) => (
            <div
              key={`${diff.field}-${entry.instanceName}`}
              className={index === 0 ? "px-3 py-1.5 text-emerald-300" : "px-3 py-1.5 text-red-300"}
            >
              <span>{index === 0 ? "+" : "-"}</span> {entry.instanceName}: {entry.value}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
