export type TemplateToken = {
  token: string
  description: string
  color: string
  resolve: (instanceName: string, instanceUrl?: string) => string
  reverseResolve: (value: string, instanceName: string, instanceUrl?: string) => string
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
    token: "{INSTANCE_URL}",
    description: "Instance URL",
    color: "#a78bfa",
    resolve: (_instanceName, instanceUrl) => instanceUrl ?? "{INSTANCE_URL}",
    reverseResolve: (value, _instanceName, instanceUrl) => {
      if (!instanceUrl) return value
      const idx = value.indexOf(instanceUrl)
      if (idx === -1) return value
      return `${value.slice(0, idx)}{INSTANCE_URL}${value.slice(idx + instanceUrl.length)}`
    },
  },
]

export function resolveTokens(text: string, instanceName: string, instanceUrl?: string): string {
  let result = text
  for (const token of KNOWN_TEMPLATE_TOKENS) {
    result = result.replaceAll(token.token, token.resolve(instanceName, instanceUrl))
  }
  return result
}

export function normalizeWithTokens(value: string, instanceName: string, instanceUrl?: string): string {
  let normalized = value
  for (const token of KNOWN_TEMPLATE_TOKENS) {
    normalized = token.reverseResolve(normalized, instanceName, instanceUrl)
  }
  return normalized
}

export const TEMPLATE_SUPPORTED_FIELDS = new Set(["title", "description", "footerText"])
