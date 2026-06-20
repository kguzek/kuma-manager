import { Plus } from "lucide-react"

type AddInstanceCardProps = {
  onAdd: () => void
}

export function AddInstanceCard({ onAdd }: AddInstanceCardProps) {
  return (
    <button
      type="button"
      className="add-instance-card group grid min-h-64 place-items-center rounded-xl border border-dashed p-6 text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={onAdd}
    >
      <span className="grid gap-3 text-center">
        <span className="add-instance-plus mx-auto grid size-14 place-items-center rounded-full">
          <Plus className="size-7" />
        </span>
        <span className="text-sm font-medium">Add instance</span>
      </span>
    </button>
  )
}
