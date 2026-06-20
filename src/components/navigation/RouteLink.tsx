import type { MouseEvent, ReactNode } from "react"

import type { AppRoute } from "@/types"

type RouteLinkProps = {
  href: AppRoute
  onNavigate: (route: AppRoute) => void
  children: ReactNode
  className?: string
}

export function RouteLink({ href, onNavigate, children, className }: RouteLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    onNavigate(href)
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  )
}
