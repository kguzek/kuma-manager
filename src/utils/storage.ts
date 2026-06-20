import type { KumaInstanceConfig, StoredKumaToken } from "@/types"

const INSTANCE_KEY = "kuma-manager.instances"
const TOKEN_KEY = "kuma-manager.tokens"

const defaultInstances: KumaInstanceConfig[] = [
  { id: crypto.randomUUID(), name: "Kuma 1", url: "" },
]

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadInstances(): KumaInstanceConfig[] {
  const instances = readJson<KumaInstanceConfig[]>(INSTANCE_KEY, defaultInstances)
  return instances.length > 0 ? instances : defaultInstances
}

export function saveInstances(instances: KumaInstanceConfig[]) {
  localStorage.setItem(INSTANCE_KEY, JSON.stringify(instances))
}

export function loadTokens(): Record<string, StoredKumaToken> {
  return readJson<Record<string, StoredKumaToken>>(TOKEN_KEY, {})
}

export function saveTokens(tokens: Record<string, StoredKumaToken>) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
}
