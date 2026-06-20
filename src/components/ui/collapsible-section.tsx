import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

type CollapsibleSectionProps = {
  label: string
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({ label, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl border bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
      </button>
      {open && <div className="border-t px-4 pb-4 pt-3">{children}</div>}
    </div>
  )
}
