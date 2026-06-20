export type TemplateToken = {
  token: string
  description: string
  color: string
  resolve: (instanceName: string) => string
  reverseResolve: (value: string, instanceName: string) => string
}

export const KNOWN_TEMPLATE_TOKENS: TemplateToken[] = [
  {
    token: "{INSTANCE}",
    description: "Instance name",
    color: "#22c55e",
    resolve: (instanceName) => instanceName,
    reverseResolve: (value, instanceName) => {
      const idx = value.indexOf(instanceName)
      if (idx === -1) return value
      return `${value.slice(0, idx)}{INSTANCE}${value.slice(idx + instanceName.length)}`
    },
  },
  {
    token: "{INSTANCE_ID}",
    description: "Instance ID",
    color: "#a78bfa",
    resolve: (instanceName) => instanceName,
    reverseResolve: (value, _instanceName) => value,
  },
]

export function resolveTokens(text: string, instanceName: string): string {
  let result = text
  for (const token of KNOWN_TEMPLATE_TOKENS) {
    result = result.replaceAll(token.token, token.resolve(instanceName))
  }
  return result
}

export function normalizeWithTokens(value: string, instanceName: string): string {
  let normalized = value
  for (const token of KNOWN_TEMPLATE_TOKENS) {
    normalized = token.reverseResolve(normalized, instanceName)
  }
  return normalized
}

export function getTokenComponent() {
  return KNOWN_TEMPLATE_TOKENS
}

export const TEMPLATE_SUPPORTED_FIELDS = new Set(["title", "description", "footerText"])
