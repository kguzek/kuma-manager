export type KumaInstanceConfig = {
  id: string
  name: string
  url: string
}

export type StoredKumaToken = {
  token: string
  savedAt: string
}

export type KumaTag = {
  id?: number
  tag_id?: number
  monitor_id?: number
  value: string | null
  name: string
  color?: string
}

export type KumaMonitor = {
  id: number
  name: string
  type: string
  url?: string | null
  hostname?: string | null
  port?: number | string | null
  method?: string | null
  interval?: number
  retryInterval?: number
  resendInterval?: number
  maxretries?: number
  active?: boolean
  parent?: number | null
  tags?: KumaTag[]
  notificationIDList?: Record<string, boolean>
  accepted_statuscodes_json?: string
  conditions?: string
  [key: string]: unknown
}

export type KumaLoginResult = {
  ok: boolean
  msg?: string
  token?: string
  tokenRequired?: boolean
}

export type KumaCommandResult = {
  ok: boolean
  msg?: string
  monitorID?: number
  [key: string]: unknown
}

export type KumaTagListResult = {
  ok: boolean
  msg?: string
  tags?: Array<{ id: number; name: string; color: string }>
}

export type ConnectedKumaInstance = {
  config: KumaInstanceConfig
  token: string
  monitors: KumaMonitor[]
}
