import { startTransition, useEffect, useMemo, useRef, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, ArrowLeft, ArrowRightLeft, CheckCircle2, ChevronRight, KeyRound, Link, LogOut, Plus, RefreshCw, Server, ShieldCheck, Tags, Trash2, type LucideIcon } from "lucide-react"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createKumaApiClient, type KumaApiClient } from "@/lib/kuma-api"
import { clearTokens, loadInstances, loadTokens, saveInstances, saveTokens } from "@/lib/storage"
import type { ConnectedKumaInstance, KumaInstanceConfig, KumaMonitor, StoredKumaToken } from "@/lib/types"
import type { MonitorDifference } from "@/lib/types"
import { buildMonitorRecords, diffMonitorRecord, getSuggestedMonitorSyncTag, getUnmanagedMonitors, prepareMonitorForCreate, prepareMonitorForEdit } from "@/lib/monitor-sync"

const instanceSchema = z.object({
  instances: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Name is required"),
        url: z.string().min(1, "URL is required"),
      }),
    )
    .min(1, "Add at least one Kuma instance"),
})

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

type InstanceFormValues = z.infer<typeof instanceSchema>
type LoginFormValues = z.infer<typeof loginSchema>
type SessionState = "configuring" | "authenticating" | "authenticated"

export default function App() {
  const [instances, setInstances] = useState<KumaInstanceConfig[]>(() => loadInstances())
  const [tokens, setTokens] = useState<Record<string, StoredKumaToken>>(() => loadTokens())
  const [connectedInstances, setConnectedInstances] = useState<ConnectedKumaInstance[]>([])
  const [sessionState, setSessionState] = useState<SessionState>("configuring")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const clientsRef = useRef<Record<string, KumaApiClient>>({})

  const configuredInstances = useMemo(
    () => instances.filter((instance) => instance.url.trim()),
    [instances],
  )

  const monitorRecords = useMemo(() => buildMonitorRecords(connectedInstances), [connectedInstances])
  const differences = useMemo(
    () => monitorRecords.map((record) => diffMonitorRecord(record, connectedInstances)).filter((diff): diff is MonitorDifference => Boolean(diff)),
    [connectedInstances, monitorRecords],
  )
  const unmanagedMonitors = useMemo(() => getUnmanagedMonitors(connectedInstances), [connectedInstances])

  useEffect(() => {
    saveInstances(instances)
  }, [instances])

  useEffect(() => {
    saveTokens(tokens)
  }, [tokens])

  async function authenticateWithPassword(credentials: LoginFormValues) {
    setSessionState("authenticating")
    setErrorMessage(null)
    setStatusMessage("Logging in to every configured Kuma instance...")

    try {
      const connected = await Promise.all(
        configuredInstances.map(async (instance) => {
          const client = createKumaApiClient(instance)
          await client.connect()
          const login = await client.login(credentials)
          if (!login.ok || !login.token) {
            client.disconnect()
            throw new Error(`${instance.name}: ${login.msg ?? "login failed"}`)
          }
          const monitors = await client.getMonitors()
          clientsRef.current[instance.id] = client
          return { config: client.instance, token: login.token, monitors }
        }),
      )

      const nextTokens = Object.fromEntries(
        connected.map((instance) => [instance.config.id, { token: instance.token, savedAt: new Date().toISOString() }]),
      )
      startTransition(() => {
        setTokens(nextTokens)
        setConnectedInstances(connected)
        setSessionState("authenticated")
        setStatusMessage("Authenticated against every instance.")
      })
    } catch (error) {
      disconnectAll()
      setSessionState("configuring")
      setErrorMessage(error instanceof Error ? error.message : "Login failed")
    }
  }

  async function authenticateWithSavedTokens() {
    setSessionState("authenticating")
    setErrorMessage(null)
    setStatusMessage("Restoring saved Kuma sessions...")

    try {
      const connected = await Promise.all(
        configuredInstances.map(async (instance) => {
          const stored = tokens[instance.id]
          if (!stored?.token) throw new Error(`${instance.name}: no saved token`)
          const client = createKumaApiClient(instance)
          await client.connect()
          const login = await client.loginByToken(stored.token)
          if (!login.ok) {
            client.disconnect()
            throw new Error(`${instance.name}: saved token rejected`)
          }
          const monitors = await client.getMonitors()
          clientsRef.current[instance.id] = client
          return { config: client.instance, token: stored.token, monitors }
        }),
      )

      startTransition(() => {
        setConnectedInstances(connected)
        setSessionState("authenticated")
        setStatusMessage("Restored saved sessions.")
      })
    } catch (error) {
      disconnectAll()
      setSessionState("configuring")
      setErrorMessage(error instanceof Error ? error.message : "Saved token login failed")
    }
  }

  async function refreshMonitors() {
    setStatusMessage("Refreshing monitor configuration...")
    setErrorMessage(null)

    try {
      const refreshed = await Promise.all(
        connectedInstances.map(async (instance) => ({
          ...instance,
          monitors: await clientsRef.current[instance.config.id].getMonitors(),
        })),
      )
      setConnectedInstances(refreshed)
      setStatusMessage("Monitor configuration refreshed.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Refresh failed")
    }
  }

  async function syncFrom(sourceInstanceId: string, tag: string) {
    const record = monitorRecords.find((entry) => entry.tag === tag)
    const source = record?.monitorsByInstance[sourceInstanceId]
    if (!record || !source) return

    setStatusMessage(`Syncing ${tag} from ${instanceName(sourceInstanceId)}...`)
    setErrorMessage(null)

    try {
      for (const targetInstance of connectedInstances) {
        if (targetInstance.config.id === sourceInstanceId) continue
        const client = clientsRef.current[targetInstance.config.id]
        const target = record.monitorsByInstance[targetInstance.config.id]
        const response = target
          ? await client.editMonitor(prepareMonitorForEdit(source, target))
          : await client.addMonitor(prepareMonitorForCreate(source))
        if (!response.ok) throw new Error(`${targetInstance.config.name}: ${response.msg ?? "sync failed"}`)
      }
      await refreshMonitors()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sync failed")
    }
  }

  async function applySuggestedTag(instanceId: string, monitor: KumaMonitor, tag: string) {
    const client = clientsRef.current[instanceId]
    setStatusMessage(`Applying ${tag} to ${monitor.name}...`)
    setErrorMessage(null)

    try {
      const response = await client.editMonitor({
        ...monitor,
        tags: [...(monitor.tags ?? []), { name: tag, value: null, color: "#2563eb" }],
      })
      if (!response.ok) throw new Error(response.msg ?? "Failed to apply tag")
      await refreshMonitors()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to apply tag")
    }
  }

  function logout() {
    disconnectAll()
    clearTokens()
    setTokens({})
    setConnectedInstances([])
    setSessionState("configuring")
    setStatusMessage("Signed out and cleared saved Kuma tokens.")
  }

  function disconnectAll() {
    Object.values(clientsRef.current).forEach((client) => client.disconnect())
    clientsRef.current = {}
  }

  function instanceName(instanceId: string) {
    return connectedInstances.find((instance) => instance.config.id === instanceId)?.config.name ?? instanceId
  }

  return (
    <main className="dot-grid-bg min-h-svh px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className={`flex flex-col justify-between gap-4 py-4 ${sessionState === "authenticated" ? "md:flex-row md:items-center" : "items-center text-center"}`}>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Kuma Manager</h1>
            {sessionState === "authenticated" ? (
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
                Comparing monitor config by <code className="rounded bg-muted px-1 py-0.5">monitor:</code> tags.
              </p>
            ) : (
              <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                Manage synchronized Uptime Kuma instances from one dashboard.
              </p>
            )}
          </div>
          {sessionState === "authenticated" && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={refreshMonitors}><RefreshCw /> Refresh</Button>
              <Button variant="destructive" onClick={logout}><LogOut /> Log out</Button>
            </div>
          )}
        </header>

        {statusMessage && <StatusCard message={statusMessage} tone="success" />}
        {errorMessage && <StatusCard message={errorMessage} tone="error" />}

        {sessionState !== "authenticated" ? (
          <AuthWall
            instances={instances}
            tokens={tokens}
            authenticating={sessionState === "authenticating"}
            onInstancesChange={setInstances}
            onPasswordLogin={authenticateWithPassword}
            onTokenLogin={authenticateWithSavedTokens}
          />
        ) : (
          <Dashboard
            connectedInstances={connectedInstances}
            differences={differences}
            monitorRecords={monitorRecords}
            unmanagedMonitors={unmanagedMonitors}
            onSyncFrom={syncFrom}
            onApplySuggestedTag={applySuggestedTag}
          />
        )}
      </div>
    </main>
  )
}

function AuthWall({
  instances,
  tokens,
  authenticating,
  onInstancesChange,
  onPasswordLogin,
  onTokenLogin,
}: {
  instances: KumaInstanceConfig[]
  tokens: Record<string, StoredKumaToken>
  authenticating: boolean
  onInstancesChange: (instances: KumaInstanceConfig[]) => void
  onPasswordLogin: (credentials: LoginFormValues) => Promise<void>
  onTokenLogin: () => Promise<void>
}) {
  const [step, setStep] = useState<"instances" | "login">("instances")
  const instanceForm = useForm<InstanceFormValues>({ resolver: zodResolver(instanceSchema), values: { instances } })
  const loginForm = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } })
  const { fields, append, remove } = useFieldArray({ control: instanceForm.control, name: "instances" })
  const watchedInstances = instanceForm.watch("instances")
  const activeInstances = watchedInstances.filter((instance) => instance.url.trim())
  const hasSavedTokens = activeInstances.length > 0 && activeInstances.every((instance) => tokens[instance.id]?.token)

  useEffect(() => {
    const subscription = instanceForm.watch((value) => {
      const nextInstances = value.instances?.flatMap((instance) => {
        if (!instance?.id) return []

        return {
          id: instance.id,
          name: instance.name ?? "",
          url: instance.url ?? "",
        }
      })

      if (nextInstances?.length) onInstancesChange(nextInstances)
    })

    return () => subscription.unsubscribe()
  }, [instanceForm, onInstancesChange])

  const goToLogin = instanceForm.handleSubmit((values) => {
    onInstancesChange(values.instances)
    setStep("login")
  })

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-5 flex items-center justify-center gap-3 text-sm text-muted-foreground">
        <StepPill active={step === "instances"} icon={Server} label="Instances" />
        <ChevronRight className="size-4" />
        <StepPill active={step === "login"} icon={KeyRound} label="Login" />
      </div>

      {step === "instances" ? (
        <Card className="setup-panel">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Add Kuma instances</CardTitle>
            <CardDescription>Your instances are saved to this device automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-6" onSubmit={goToLogin}>
              <div className="grid gap-4 md:grid-cols-2">
                {fields.map((field, index) => (
                  <Card key={field.id} className="instance-card relative overflow-hidden border-input">
                    <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
                          <Server className="size-4" />
                        </div>
                        <CardTitle className="text-base">Instance {index + 1}</CardTitle>
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={fields.length === 1}
                        aria-label="Remove instance"
                        onClick={() => remove(index)}
                      >
                        <Trash2 />
                      </Button>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <Field data-invalid={!!instanceForm.formState.errors.instances?.[index]?.name}>
                        <FieldLabel htmlFor={`instance-${index}-name`}>Name</FieldLabel>
                        <Input id={`instance-${index}-name`} {...instanceForm.register(`instances.${index}.name`)} />
                        <FieldError errors={[instanceForm.formState.errors.instances?.[index]?.name]} />
                      </Field>
                      <Field data-invalid={!!instanceForm.formState.errors.instances?.[index]?.url}>
                        <FieldLabel htmlFor={`instance-${index}-url`}>URL</FieldLabel>
                        <div className="relative">
                          <Link className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id={`instance-${index}-url`} className="pl-9" placeholder="https://kuma.example.com" {...instanceForm.register(`instances.${index}.url`)} />
                        </div>
                        <FieldError errors={[instanceForm.formState.errors.instances?.[index]?.url]} />
                      </Field>
                    </CardContent>
                  </Card>
                ))}

                <button
                  type="button"
                  className="add-instance-card group grid min-h-64 place-items-center rounded-xl border border-dashed p-6 text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  onClick={() => append({ id: crypto.randomUUID(), name: `Kuma ${fields.length + 1}`, url: "" })}
                >
                  <span className="grid gap-3 text-center">
                    <span className="add-instance-plus mx-auto grid size-14 place-items-center rounded-full">
                      <Plus className="size-7" />
                    </span>
                    <span className="text-sm font-medium">Add instance</span>
                  </span>
                </button>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={activeInstances.length === 0}>
                  Next <ChevronRight />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="setup-panel mx-auto max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>{activeInstances.length} instance{activeInstances.length === 1 ? "" : "s"} configured</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-5" onSubmit={loginForm.handleSubmit(onPasswordLogin)}>
              <Field data-invalid={!!loginForm.formState.errors.username}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input id="username" autoComplete="username" {...loginForm.register("username")} />
                <FieldError errors={[loginForm.formState.errors.username]} />
              </Field>
              <Field data-invalid={!!loginForm.formState.errors.password}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" autoComplete="current-password" {...loginForm.register("password")} />
                <FieldDescription>Must work on every instance.</FieldDescription>
                <FieldError errors={[loginForm.formState.errors.password]} />
              </Field>
              <div className="grid gap-2">
                <Button type="submit" size="lg" disabled={authenticating}>
                  {authenticating ? <RefreshCw className="animate-spin" /> : <ShieldCheck />} Sign in
                </Button>
                <Button type="button" variant="outline" disabled={authenticating || !hasSavedTokens} onClick={onTokenLogin}>
                  <KeyRound /> Use saved login
                </Button>
              </div>
              <Button type="button" variant="ghost" onClick={() => setStep("instances")}>
                <ArrowLeft /> Back
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StepPill({ active, icon: Icon, label }: { active: boolean; icon: LucideIcon; label: string }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground"}`}>
      <Icon className="size-3.5" />
      {label}
    </div>
  )
}

function Dashboard({
  connectedInstances,
  differences,
  monitorRecords,
  unmanagedMonitors,
  onSyncFrom,
  onApplySuggestedTag,
}: {
  connectedInstances: ConnectedKumaInstance[]
  differences: MonitorDifference[]
  monitorRecords: ReturnType<typeof buildMonitorRecords>
  unmanagedMonitors: ReturnType<typeof getUnmanagedMonitors>
  onSyncFrom: (sourceInstanceId: string, tag: string) => Promise<void>
  onApplySuggestedTag: (instanceId: string, monitor: KumaMonitor, tag: string) => Promise<void>
}) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Instances" value={connectedInstances.length} description="Authenticated Kuma servers" />
        <MetricCard title="Managed monitors" value={monitorRecords.length} description="Records with monitor:* tags" />
        <MetricCard title="Diffs" value={differences.length} description="Missing or different configs" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="size-5" /> Diff page</CardTitle>
          <CardDescription>Only monitors with at least one <code>monitor:</code> tag are compared. History, current status, ping, cert info, and IDs are ignored.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sync tag</TableHead>
                  {connectedInstances.map((instance) => <TableHead key={instance.config.id}>{instance.config.name}</TableHead>)}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monitorRecords.map((record) => {
                  const diff = differences.find((entry) => entry.tag === record.tag)
                  return (
                    <TableRow key={record.tag}>
                      <TableCell className="font-mono text-xs">{record.tag}</TableCell>
                      {connectedInstances.map((instance) => {
                        const monitor = record.monitorsByInstance[instance.config.id]
                        return <TableCell key={instance.config.id}>{monitor ? monitor.name : <span className="text-muted-foreground">Missing</span>}</TableCell>
                      })}
                      <TableCell>
                        {diff ? <Badge variant="destructive">{diff.description}</Badge> : <Badge variant="secondary"><CheckCircle2 /> In sync</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {connectedInstances.map((instance) => record.monitorsByInstance[instance.config.id] && (
                            <Button key={instance.config.id} size="sm" variant="outline" onClick={() => onSyncFrom(instance.config.id, record.tag)}>
                              Use {instance.config.name}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {monitorRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={connectedInstances.length + 3} className="py-10 text-center text-muted-foreground">No managed monitors yet. Add monitor:* tags below to opt monitors into sync.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Tags className="size-5" /> Unmanaged monitors</CardTitle>
          <CardDescription>These monitors do not have a <code>monitor:</code> tag. Suggested tags are initially based on the URL or hostname domain.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {unmanagedMonitors.map(({ instance, monitor, suggestedTag }) => (
            <div key={`${instance.config.id}-${monitor.id}`} className="flex flex-col justify-between gap-3 rounded-2xl border p-4 md:flex-row md:items-center">
              <div>
                <div className="font-medium">{monitor.name}</div>
                <div className="text-sm text-muted-foreground">{instance.config.name} · {monitor.url ?? monitor.hostname ?? "No URL/hostname"}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono">{suggestedTag ?? "No suggestion"}</Badge>
                <Button size="sm" variant="outline" disabled={!suggestedTag} onClick={() => suggestedTag && onApplySuggestedTag(instance.config.id, monitor, suggestedTag)}>Apply tag</Button>
              </div>
            </div>
          ))}
          {unmanagedMonitors.length === 0 && <p className="text-sm text-muted-foreground">Every loaded monitor has a sync tag.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value, description }: { title: string; value: number; description: string }) {
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

function getPendingTag(customTag: string | undefined, suggestedTag: string | null) {
  return (customTag ?? suggestedTag ?? "").trim()
}

function StatusCard({ message, tone }: { message: string; tone: "success" | "error" }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${tone === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-background/80"}`}>
      <Icon className="mt-0.5 size-4" />
      <div>{message}</div>
    </div>
  )
}
