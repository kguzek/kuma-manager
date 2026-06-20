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
    window.history.pushState(null, "", nextRoute)
    setRoute(nextRoute)
  }

  return { route, navigate }
}
