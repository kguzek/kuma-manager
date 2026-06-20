export function getPendingTag(customTag: string | undefined, suggestedTag: string | null) {
  return (customTag ?? suggestedTag ?? "").trim()
}

export function stripMonitorPrefix(tag: string) {
  return tag.startsWith("monitor:") ? tag.slice("monitor:".length) : tag
}

export function getTagSuffix(tag: string | null | undefined) {
  return stripMonitorPrefix(tag ?? "")
}
