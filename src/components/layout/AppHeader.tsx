import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SessionState } from "@/types"

type AppHeaderProps = {
  sessionState: SessionState
  onLogout: () => void
}

export function AppHeader({ sessionState, onLogout }: AppHeaderProps) {
  return (
    <header
      className={`flex flex-col justify-between gap-4 py-4 ${sessionState === "authenticated" ? "md:flex-row md:items-center" : "items-center text-center"}`}
    >
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Kuma Manager</h1>
        {sessionState === "authenticated" ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Consistent monitoring configurations across all your Kuma instances.
          </p>
        ) : (
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Manage synchronized Uptime Kuma instances from one dashboard.
          </p>
        )}
      </div>
      {sessionState === "authenticated" && (
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" onClick={onLogout}>
            <LogOut /> Log out
          </Button>
        </div>
      )}
    </header>
  )
}
