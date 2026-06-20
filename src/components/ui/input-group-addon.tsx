import type * as React from "react"

import { cn } from "@/lib/utils"

function InputGroupAddon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn("flex h-full items-center border-r bg-muted px-2 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export { InputGroupAddon }
