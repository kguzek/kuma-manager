import { z } from "zod"

export const instanceSchema = z.object({
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

export type InstanceFormValues = z.infer<typeof instanceSchema>
export type SessionState = "configuring" | "authenticating" | "authenticated"
export type AppRoute = "/instances" | "/login" | "/dashboard" | `/monitors/${string}`
