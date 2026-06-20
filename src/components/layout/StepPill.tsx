import type { LucideIcon } from "lucide-react"

type StepPillProps = {
  active: boolean
  icon: LucideIcon
  label: string
}

export function StepPill({ active, icon: Icon, label }: StepPillProps) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground"}`}>
      <Icon className="size-3.5" />
      {label}
    </div>
  )
}
