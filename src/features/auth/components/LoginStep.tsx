import { ArrowLeft, RefreshCw, Server, ShieldCheck } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { AppRoute, KumaInstanceConfig, LoginCredentials, LoginFormValues } from "@/types"

type LoginStepProps = {
  instances: KumaInstanceConfig[]
  authenticating: boolean
  onNavigate: (route: AppRoute) => void
  onPasswordLogin: (credentials: LoginCredentials) => Promise<void>
}

export function LoginStep({ instances, authenticating, onNavigate, onPasswordLogin }: LoginStepProps) {
  const loginForm = useForm<LoginFormValues>({
    defaultValues: {
      separate: false,
      username: "",
      password: "",
      credentials: Object.fromEntries(instances.map((instance) => [instance.id, { username: "", password: "" }])),
    },
  })
  const separateCredentials = loginForm.watch("separate")
  const activeInstances = instances.filter((instance) => instance.url.trim())

  function submitLogin(values: LoginFormValues) {
    const credentials = values.separate
      ? Object.fromEntries(activeInstances.map((instance) => [instance.id, values.credentials[instance.id] ?? { username: "", password: "" }]))
      : Object.fromEntries(activeInstances.map((instance) => [instance.id, { username: values.username, password: values.password }]))

    const missing = Object.entries(credentials).find(([, credential]) => !credential.username.trim() || !credential.password)
    if (missing) {
      const instance = activeInstances.find((entry) => entry.id === missing[0])
      loginForm.setError("root", { message: `Enter credentials for ${instance?.name ?? "every instance"}.` })
      return
    }

    void onPasswordLogin(credentials)
  }

  return (
    <Card className="setup-panel mx-auto max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>{activeInstances.length} instance{activeInstances.length === 1 ? "" : "s"} configured</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={loginForm.handleSubmit(submitLogin)}>
          {authenticating && (
            <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
              <RefreshCw className="size-4 animate-spin" /> Signing in...
            </div>
          )}
          <Field orientation="horizontal" className="items-center justify-between rounded-xl border bg-muted/30 p-3">
            <div>
              <FieldLabel htmlFor="separate-credentials">Separate credentials</FieldLabel>
              <FieldDescription>Use different login details per instance.</FieldDescription>
            </div>
            <Switch id="separate-credentials" checked={separateCredentials} onCheckedChange={(checked) => loginForm.setValue("separate", checked, { shouldDirty: true })} />
          </Field>
          {separateCredentials ? (
            <div className="grid gap-4">
              {activeInstances.map((instance) => (
                <div key={instance.id} className="grid gap-3 rounded-xl border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium"><Server className="size-4" /> {instance.name}</div>
                  <Field>
                    <FieldLabel htmlFor={`${instance.id}-username`}>Username</FieldLabel>
                    <Input id={`${instance.id}-username`} autoComplete="username" {...loginForm.register(`credentials.${instance.id}.username`)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${instance.id}-password`}>Password</FieldLabel>
                    <Input id={`${instance.id}-password`} type="password" autoComplete="current-password" {...loginForm.register(`credentials.${instance.id}.password`)} />
                  </Field>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input id="username" autoComplete="username" {...loginForm.register("username")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" autoComplete="current-password" {...loginForm.register("password")} />
                <FieldDescription>Used for every instance.</FieldDescription>
              </Field>
            </>
          )}
          <FieldError errors={[loginForm.formState.errors.root]} />
          <div className="grid gap-2">
            <Button type="submit" size="lg" disabled={authenticating}>{authenticating ? <RefreshCw className="animate-spin" /> : <ShieldCheck />} Sign in</Button>
          </div>
          <Button type="button" variant="ghost" onClick={() => onNavigate("/instances")}><ArrowLeft /> Back</Button>
        </form>
      </CardContent>
    </Card>
  )
}
