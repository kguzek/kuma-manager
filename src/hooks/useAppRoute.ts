import { useEffect, useState } from "react"

import { getInitialRoute } from "@/lib/routes"
import type { AppRoute } from "@/types"

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(() => getInitialRoute())

  useEffect(() => {
    const onPopState = () => setRoute(getInitialRoute())
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  function navigate(nextRoute: AppRoute) {
    const updateRoute = () => {
      window.history.pushState(null, "", nextRoute)
      setRoute(nextRoute)
    }

    if (document.startViewTransition) {
      document.startViewTransition(updateRoute)
      return
    }

    updateRoute()
  }

  return { route, navigate }
}
