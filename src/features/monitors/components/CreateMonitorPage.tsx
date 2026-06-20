import { useState } from "react"
import { useForm } from "react-hook-form"
import { ArrowLeft, Plus, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RouteLink } from "@/components/navigation/RouteLink"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Switch } from "@/components/ui/switch"
import type { getMonitorGroupViews } from "@/features/monitors/utils/monitor-sync"
import { FIELD_LABELS, KNOWN_FIELD_GROUPS } from "@/features/monitors/utils/settings-groups"
import type { AppRoute, MonitorDetailsValues } from "@/types"

const DEFAULT_MONITOR_VALUES: Record<string, unknown> = {
  name: "",
  url: "",
  hostname: "",
  port: 0,
  method: "GET",
  type: "http",
  subtype: "",
  interval: 60,
  retryInterval: 60,
  maxretries: 0,
  timeout: 30,
  active: true,
  weight: 0,
  description: "",
  path: "",
  resendInterval: 0,
  retryOnlyOnStatusCodeFailure: false,
  accepted_statuscodes: "",
  maxredirects: 0,
  headers: "",
  body: "",
  httpBodyEncoding: "",
  expectedValue: "",
  jsonPathOperator: "",
  saveResponse: false,
  saveErrorResponse: false,
  responseMaxLength: 0,
  cacheBust: false,
  screenshot: false,
  remote_browser: "",
  grpcUrl: "",
  grpcProtobuf: "",
  grpcMethod: "",
  grpcServiceName: "",
  grpcEnableTls: false,
  grpcBody: "",
  grpcMetadata: "",
  expiryNotification: false,
  domainExpiryNotification: false,
  ignoreTls: false,
  expectedTlsAlert: "",
  tlsCa: "",
  tlsCert: "",
  tlsKey: "",
  keyword: "",
  invertKeyword: false,
  conditions: "",
  upsideDown: false,
  dns_resolve_type: "",
  dns_resolve_server: "",
  dns_last_result: "",
  ipFamily: "",
  authMethod: "",
  basic_auth_user: "",
  basic_auth_pass: "",
  oauth_client_id: "",
  oauth_client_secret: "",
  oauth_token_url: "",
  oauth_scopes: "",
  oauth_audience: "",
  oauth_auth_method: "",
  bearer_token: "",
  authWorkstation: "",
  authDomain: "",
  radiusUsername: "",
  radiusPassword: "",
  radiusSecret: "",
  radiusCalledStationId: "",
  radiusCallingStationId: "",
  mqttTopic: "",
  mqttSuccessMessage: "",
  mqttCheckType: "",
  mqttUsername: "",
  mqttPassword: "",
  mqttWebsocketPath: "",
  databaseQuery: "",
  databaseConnectionString: "",
  kafkaProducerTopic: "",
  kafkaProducerBrokers: "",
  kafkaProducerSsl: false,
  kafkaProducerAllowAutoTopicCreation: false,
  kafkaProducerMessage: "",
  kafkaProducerSaslOptions: "",
  rabbitmqNodes: "",
  rabbitmqUsername: "",
  rabbitmqPassword: "",
  docker_container: "",
  docker_host: "",
  system_service_name: "",
  ping_numeric: false,
  ping_count: 0,
  ping_per_request_timeout: 0,
  packetSize: 0,
  game: "",
  gamedigGivenPortOnly: false,
  gamedigToken: "",
  snmpOid: "",
  snmpVersion: "",
  smtpSecurity: "",
  wsIgnoreSecWebsocketAcceptHeader: false,
  wsSubprotocol: "",
  proxyId: 0,
  notificationIDList: "",
  maintenance: false,
  location: "",
  childrenIDs: "",
  includeSensitiveData: false,
  pushToken: "",
}

type CreateMonitorPageProps = {
  monitorGroups: ReturnType<typeof getMonitorGroupViews>
  onBack: () => void
  onNavigate: (route: AppRoute) => void
  onCreate: (tag: string, values: MonitorDetailsValues, groupName?: string) => Promise<void>
}

export function CreateMonitorPage({ monitorGroups, onBack: _onBack, onNavigate, onCreate }: CreateMonitorPageProps) {
  const [tagSuffix, setTagSuffix] = useState("")
  const [selectedGroup, setSelectedGroup] = useState("")

  const form = useForm<MonitorDetailsValues>({
    defaultValues: DEFAULT_MONITOR_VALUES,
  })

  const tag = `monitor:${tagSuffix.trim()}`
  const allGroupNames = [...new Set(monitorGroups.map((g) => g.group.name))].sort()

  function renderField(field: string) {
    const value = DEFAULT_MONITOR_VALUES[field]
    const label = FIELD_LABELS[field] ?? field

    if (typeof value === "boolean") {
      return (
        <div key={field} className="flex h-12 items-center gap-2 self-end rounded-lg bg-background/40 px-3">
          <label className="flex-1 text-sm" htmlFor={`monitor-${field}`}>
            {label}
          </label>
          <Switch id={`monitor-${field}`} checked={!!form.watch(field)} onCheckedChange={(checked) => form.setValue(field, checked)} />
        </div>
      )
    }

    if (typeof value === "number") {
      return (
        <Field key={field}>
          <FieldLabel htmlFor={`monitor-${field}`}>{label}</FieldLabel>
          <Input id={`monitor-${field}`} type="number" {...form.register(field, { valueAsNumber: true })} />
        </Field>
      )
    }

    return (
      <Field key={field}>
        <FieldLabel htmlFor={`monitor-${field}`}>{label}</FieldLabel>
        <Input id={`monitor-${field}`} {...form.register(field)} />
      </Field>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-2">
        <Button variant="ghost" asChild>
          <RouteLink href="/dashboard" onNavigate={onNavigate}>
            <ArrowLeft /> Back
          </RouteLink>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5" /> New monitor
          </CardTitle>
          <CardDescription>Create a new synced monitor on every connected instance.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3">
            <div className="text-sm font-medium">Sync tag</div>
            <InputGroup className="max-w-sm font-mono">
              <InputGroupAddon>monitor:</InputGroupAddon>
              <InputGroupInput
                value={tagSuffix}
                placeholder="example.com"
                onChange={(event) => setTagSuffix(event.target.value.replace(/^monitor:/, ""))}
              />
            </InputGroup>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="monitor-group">
              Monitor group
            </label>
            <select
              id="monitor-group"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">None</option>
              {allGroupNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <form className="grid gap-5" onSubmit={form.handleSubmit((values) => onCreate(tag, values, selectedGroup || undefined))}>
            <Accordion type="multiple" defaultValue={["Core"]} className="grid gap-3">
              {KNOWN_FIELD_GROUPS.filter((g) => g.fields.length > 0).map((group) => (
                <AccordionItem key={group.label} value={group.label} className="rounded-2xl border bg-muted/20">
                  <AccordionTrigger>{group.label}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-2">{group.fields.map((field) => renderField(field))}</div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="flex justify-end">
              <Button type="submit" disabled={!tagSuffix.trim()}>
                <Save /> Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
