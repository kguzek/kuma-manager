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

export type KumaStatusPage = {
  id: number
  title: string
  description: string
  slug: string
  icon: string
  theme: string
  published: boolean
  showTags: boolean
  showPoweredBy: boolean
  footerText: string
  customCSS: string
  domainNameList: string
  analyticsType: string
  analyticsId: string
  analyticsScriptUrl: string
  refreshInterval: number
  publicGroupList?: PublicGroup[]
  incidents?: KumaIncident[]
  [key: string]: unknown
}

export type PublicGroup = {
  id: number
  name: string
  weight: number
  monitorList: PublicGroupMonitor[]
}

export type PublicGroupMonitor = {
  id: number
  name: string
  sendUrl: boolean
}

export type SaveStatusPageResult = {
  ok: boolean
  msg?: string
  publicGroupList?: PublicGroup[]
}

export type KumaIncident = {
  id: number
  title: string
  description: string
  style: string
  pin: boolean
  createdDate: string
  lastUpdatedDate: string
  [key: string]: unknown
}

export type ConnectedKumaInstance = {
  config: KumaInstanceConfig
  token: string
  monitors: KumaMonitor[]
  statusPages?: KumaStatusPage[]
}
