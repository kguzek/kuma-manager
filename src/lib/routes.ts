import type { AppRoute } from "@/types"

export function getInitialRoute(): AppRoute {
  if (window.location.pathname === "/login") return "/login"
  if (window.location.pathname === "/dashboard") return "/dashboard"
  if (window.location.pathname === "/monitors") return "/monitors"
  if (window.location.pathname.startsWith("/monitors/")) return window.location.pathname as AppRoute
  if (window.location.pathname === "/status-pages") return "/status-pages"
  if (window.location.pathname.startsWith("/status-pages/")) return window.location.pathname as AppRoute
  return "/instances"
}
