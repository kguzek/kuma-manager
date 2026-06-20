import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

type StatusCardProps = {
  message: string
  tone: "success" | "error" | "loading"
  onDismiss: () => void
}

export function StatusCard({ message, tone, onDismiss }: StatusCardProps) {
  const Icon = tone === "loading" ? RefreshCw : tone === "success" ? CheckCircle2 : AlertCircle

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${tone === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-background/80"}`}
    >
      <Icon className={`mt-0.5 size-4 ${tone === "loading" ? "animate-spin" : ""}`} />
      <div className="min-w-0 flex-1">{message}</div>
      {tone !== "loading" && (
        <Button size="sm" variant="ghost" className="-my-1" onClick={onDismiss}>
          Dismiss
        </Button>
      )}
    </div>
  )
}
