import { useCallback, useState } from "react"
import { LogOut, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SessionState } from "@/types"

type AppHeaderProps = {
  sessionState: SessionState
  onLogout: () => void
  onRefresh: () => Promise<void>
}

export function AppHeader({ sessionState, onLogout, onRefresh }: AppHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

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
          <Button variant="outline" disabled={isRefreshing} onClick={handleRefresh}>
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="destructive" onClick={onLogout}>
            <LogOut /> Log out
          </Button>
        </div>
      )}
    </header>
  )
}
