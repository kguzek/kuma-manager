import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"

type StatusCardProps = {
  message: string
  tone: "success" | "error" | "loading"
}

export function StatusCard({ message, tone }: StatusCardProps) {
  const Icon = tone === "loading" ? RefreshCw : tone === "success" ? CheckCircle2 : AlertCircle

  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${tone === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-background/80"}`}>
      <Icon className={`mt-0.5 size-4 ${tone === "loading" ? "animate-spin" : ""}`} />
      <div>{message}</div>
    </div>
  )
}
