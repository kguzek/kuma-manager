import { Link, Server, Trash2 } from "lucide-react"
import type { FieldErrors, UseFormRegister } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { InstanceFormValues } from "@/types"

type InstanceCardProps = {
  index: number
  canRemove: boolean
  errors: FieldErrors<InstanceFormValues>
  register: UseFormRegister<InstanceFormValues>
  onRemove: () => void
}

export function InstanceCard({ index, canRemove, errors, register, onRemove }: InstanceCardProps) {
  return (
    <Card className="instance-card relative overflow-hidden border-input">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
            <Server className="size-4" />
          </div>
          <CardTitle className="text-base">Instance {index + 1}</CardTitle>
        </div>
        <Button type="button" size="icon-sm" variant="ghost" disabled={!canRemove} aria-label="Remove instance" onClick={onRemove}>
          <Trash2 />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field data-invalid={!!errors.instances?.[index]?.name}>
          <FieldLabel htmlFor={`instance-${index}-name`}>Name</FieldLabel>
          <Input id={`instance-${index}-name`} {...register(`instances.${index}.name`)} />
          <FieldError errors={[errors.instances?.[index]?.name]} />
        </Field>
        <Field data-invalid={!!errors.instances?.[index]?.url}>
          <FieldLabel htmlFor={`instance-${index}-url`}>URL</FieldLabel>
          <div className="relative">
            <Link className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`instance-${index}-url`}
              className="pl-9"
              placeholder="https://kuma.example.com"
              {...register(`instances.${index}.url`)}
            />
          </div>
          <FieldError errors={[errors.instances?.[index]?.url]} />
        </Field>
      </CardContent>
    </Card>
  )
}
