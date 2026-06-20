import { ChevronRight } from "lucide-react"
import type { FieldArrayWithId, FieldErrors, UseFieldArrayAppend, UseFieldArrayRemove, UseFormRegister } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AddInstanceCard } from "@/features/auth/components/AddInstanceCard"
import { InstanceCard } from "@/features/auth/components/InstanceCard"
import type { InstanceFormValues, KumaInstanceConfig } from "@/types"

type InstanceStepProps = {
  fields: Array<FieldArrayWithId<InstanceFormValues, "instances", "id">>
  activeInstanceCount: number
  errors: FieldErrors<InstanceFormValues>
  register: UseFormRegister<InstanceFormValues>
  append: UseFieldArrayAppend<InstanceFormValues, "instances">
  remove: UseFieldArrayRemove
  getInstances: () => KumaInstanceConfig[]
  onInstancesChange: (instances: KumaInstanceConfig[]) => void
  onNext: () => void
}

export function InstanceStep({ fields, activeInstanceCount, errors, register, append, remove, getInstances, onInstancesChange, onNext }: InstanceStepProps) {
  return (
    <Card className="setup-panel">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Add Kuma instances</CardTitle>
        <CardDescription>Your instances are saved to this device automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-6" onSubmit={onNext}>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field, index) => (
              <InstanceCard
                key={field.id}
                index={index}
                canRemove={fields.length > 1}
                errors={errors}
                register={register}
                onRemove={() => {
                  const nextInstances = getInstances().filter((_, itemIndex) => itemIndex !== index)
                  remove(index)
                  onInstancesChange(nextInstances)
                }}
              />
            ))}
            <AddInstanceCard
              onAdd={() => {
                const instance = { id: crypto.randomUUID(), name: `Kuma ${fields.length + 1}`, url: "" }
                const nextInstances = [...getInstances(), instance]
                append(instance)
                onInstancesChange(nextInstances)
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={activeInstanceCount === 0}>Next <ChevronRight /></Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
