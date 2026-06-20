import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ReactNode } from "react"

type MetricCardProps = {
  title: string
  value: number
  description: ReactNode
  tone?: "neutral" | "success" | "error"
}

export function MetricCard({ title, value, description, tone = "neutral" }: MetricCardProps) {
  const borderClass = tone === "success" ? "border-emerald-700/40" : tone === "error" ? "border-red-700/40" : ""
  const valueClass = tone === "success" ? "text-emerald-400" : tone === "error" ? "text-red-400" : ""

  return (
    <Card className={borderClass}>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className={`text-3xl ${valueClass}`}>{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
    </Card>
  )
}
