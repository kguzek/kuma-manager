import { useForm } from "react-hook-form"
import { ArrowLeft, Save, Tags } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RouteLink } from "@/components/navigation/RouteLink"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { AppRoute, ConnectedKumaInstance, MonitorDetailsValues, MonitorSyncRecord } from "@/types"

type MonitorPageProps = {
  route: AppRoute
  connectedInstances: ConnectedKumaInstance[]
  monitorRecords: MonitorSyncRecord[]
  onBack: () => void
  onNavigate: (route: AppRoute) => void
  onSave: (tag: string, values: MonitorDetailsValues) => Promise<void>
}

export function MonitorPage({ route, connectedInstances, monitorRecords, onBack, onNavigate, onSave }: MonitorPageProps) {
  const tagSuffix = route.startsWith("/monitors/") ? decodeURIComponent(route.replace("/monitors/", "")) : ""
  const tag = `monitor:${tagSuffix}`
  const record = monitorRecords.find((entry) => entry.tag === tag)
  const firstMonitor = connectedInstances.map((instance) => record?.monitorsByInstance[instance.config.id]).find(Boolean)
  const form = useForm<MonitorDetailsValues>({
    values: {
      name: firstMonitor?.name ?? "",
      url: typeof firstMonitor?.url === "string" ? firstMonitor.url : "",
      interval: Number(firstMonitor?.interval ?? 60),
      retryInterval: Number(firstMonitor?.retryInterval ?? 60),
      maxretries: Number(firstMonitor?.maxretries ?? 0),
    },
  })

  if (!record || !firstMonitor) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Monitor not found</CardTitle>
          <CardDescription>No synced monitor exists for <code>{tag}</code>.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild><RouteLink href="/dashboard" onNavigate={onNavigate}><ArrowLeft /> Back</RouteLink></Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <div className="mb-2">
          <Button variant="ghost" asChild><RouteLink href="/dashboard" onNavigate={onNavigate}><ArrowLeft /> Back</RouteLink></Button>
        </div>
        <CardTitle className="flex items-center gap-2"><Tags className="size-5" /> {tag}</CardTitle>
        <CardDescription>Edit shared monitor fields and save them to every instance where this tag exists.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={form.handleSubmit((values) => onSave(tag, values))}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="monitor-name">Name</FieldLabel>
              <Input id="monitor-name" {...form.register("name", { required: true })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="monitor-url">URL</FieldLabel>
              <Input id="monitor-url" {...form.register("url")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="monitor-interval">Interval seconds</FieldLabel>
              <Input id="monitor-interval" type="number" min={1} {...form.register("interval", { valueAsNumber: true })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="monitor-retry-interval">Retry interval seconds</FieldLabel>
              <Input id="monitor-retry-interval" type="number" min={1} {...form.register("retryInterval", { valueAsNumber: true })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="monitor-max-retries">Max retries</FieldLabel>
              <Input id="monitor-max-retries" type="number" min={0} {...form.register("maxretries", { valueAsNumber: true })} />
            </Field>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="mb-3 text-sm font-medium">Instances</div>
            <div className="grid gap-2">
              {connectedInstances.map((instance) => {
                const monitor = record.monitorsByInstance[instance.config.id]
                return (
                  <div key={instance.config.id} className="flex items-center justify-between gap-3 rounded-lg bg-background/40 px-3 py-2 text-sm">
                    <span>{instance.config.name}</span>
                    {monitor ? <Badge variant="secondary">{monitor.name}</Badge> : <Badge variant="destructive">Missing</Badge>}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit"><Save /> Save</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
