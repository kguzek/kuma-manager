import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronRight, KeyRound, Server } from "lucide-react"

import { StepPill } from "@/components/layout/StepPill"
import { InstanceStep } from "@/features/auth/components/InstanceStep"
import { LoginStep } from "@/features/auth/components/LoginStep"
import { instanceSchema } from "@/types"
import type { AppRoute, InstanceFormValues, KumaInstanceConfig, LoginCredentials } from "@/types"

type AuthFlowProps = {
  route: "/instances" | "/login"
  instances: KumaInstanceConfig[]
  authenticating: boolean
  onInstancesChange: (instances: KumaInstanceConfig[]) => void
  onNavigate: (route: AppRoute) => void
  onPasswordLogin: (credentials: LoginCredentials) => Promise<void>
}

export function AuthFlow({ route, instances, authenticating, onInstancesChange, onNavigate, onPasswordLogin }: AuthFlowProps) {
  const instanceForm = useForm<InstanceFormValues>({ resolver: zodResolver(instanceSchema), defaultValues: { instances } })
  const { fields, append, remove } = useFieldArray({ control: instanceForm.control, name: "instances" })
  const watchedInstances = instanceForm.watch("instances")
  const activeInstances = watchedInstances.filter((instance) => instance.url.trim())

  useEffect(() => {
    const subscription = instanceForm.watch((value) => {
      const nextInstances = value.instances?.flatMap((instance) => {
        if (!instance?.id) return []
        return { id: instance.id, name: instance.name ?? "", url: instance.url ?? "" }
      })

      if (nextInstances?.length) onInstancesChange(nextInstances)
    })

    return () => subscription.unsubscribe()
  }, [instanceForm, onInstancesChange])

  const goToLogin = instanceForm.handleSubmit((values) => {
    onInstancesChange(values.instances)
    onNavigate("/login")
  })

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-5 flex items-center justify-center gap-3 text-sm text-muted-foreground">
        <StepPill active={route === "/instances"} icon={Server} label="Instances" />
        <ChevronRight className="size-4" />
        <StepPill active={route === "/login"} icon={KeyRound} label="Login" />
      </div>
      {route === "/instances" ? (
        <InstanceStep
          fields={fields}
          activeInstanceCount={activeInstances.length}
          errors={instanceForm.formState.errors}
          register={instanceForm.register}
          append={append}
          remove={remove}
          getInstances={() => instanceForm.getValues("instances")}
          onInstancesChange={onInstancesChange}
          onNext={goToLogin}
        />
      ) : (
        <LoginStep instances={activeInstances} authenticating={authenticating} onNavigate={onNavigate} onPasswordLogin={onPasswordLogin} />
      )}
    </div>
  )
}
