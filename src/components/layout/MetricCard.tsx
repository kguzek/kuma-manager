import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type MetricCardProps = {
  title: string
  value: number
  description: string
}

export function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
    </Card>
  )
}
