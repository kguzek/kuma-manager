export type FieldGroup = {
  label: string
  defaultOpen: boolean
  fields: string[]
}

const KNOWN_FIELD_GROUPS: FieldGroup[] = [
  {
    label: "Core",
    defaultOpen: true,
    fields: [
      "name",
      "url",
      "hostname",
      "port",
      "method",
      "type",
      "subtype",
      "interval",
      "retryInterval",
      "maxretries",
      "timeout",
      "active",
      "weight",
      "description",
      "path",
      "resendInterval",
      "retryOnlyOnStatusCodeFailure",
    ],
  },
  {
    label: "HTTP & API",
    defaultOpen: false,
    fields: [
      "accepted_statuscodes",
      "maxredirects",
      "headers",
      "body",
      "httpBodyEncoding",
      "jsonPath",
      "expectedValue",
      "jsonPathOperator",
      "saveResponse",
      "saveErrorResponse",
      "responseMaxLength",
      "cacheBust",
      "screenshot",
      "remote_browser",
      "grpcUrl",
      "grpcProtobuf",
      "grpcMethod",
      "grpcServiceName",
      "grpcEnableTls",
      "grpcBody",
      "grpcMetadata",
    ],
  },
  {
    label: "SSL / TLS / Certificate",
    defaultOpen: false,
    fields: ["expiryNotification", "domainExpiryNotification", "ignoreTls", "expectedTlsAlert", "tlsCa", "tlsCert", "tlsKey"],
  },
  {
    label: "Keyword & Content",
    defaultOpen: false,
    fields: ["keyword", "invertKeyword", "conditions", "upsideDown"],
  },
  {
    label: "DNS",
    defaultOpen: false,
    fields: ["dns_resolve_type", "dns_resolve_server", "dns_last_result", "ipFamily"],
  },
  {
    label: "Authentication",
    defaultOpen: false,
    fields: [
      "authMethod",
      "basic_auth_user",
      "basic_auth_pass",
      "oauth_client_id",
      "oauth_client_secret",
      "oauth_token_url",
      "oauth_scopes",
      "oauth_audience",
      "oauth_auth_method",
      "bearer_token",
      "authWorkstation",
      "authDomain",
      "radiusUsername",
      "radiusPassword",
      "radiusSecret",
      "radiusCalledStationId",
      "radiusCallingStationId",
    ],
  },
  {
    label: "MQTT",
    defaultOpen: false,
    fields: ["mqttTopic", "mqttSuccessMessage", "mqttCheckType", "mqttUsername", "mqttPassword", "mqttWebsocketPath"],
  },
  {
    label: "Database",
    defaultOpen: false,
    fields: ["databaseQuery", "databaseConnectionString"],
  },
  {
    label: "Message Queues",
    defaultOpen: false,
    fields: [
      "kafkaProducerTopic",
      "kafkaProducerBrokers",
      "kafkaProducerSsl",
      "kafkaProducerAllowAutoTopicCreation",
      "kafkaProducerMessage",
      "kafkaProducerSaslOptions",
      "rabbitmqNodes",
      "rabbitmqUsername",
      "rabbitmqPassword",
    ],
  },
  {
    label: "Container & System",
    defaultOpen: false,
    fields: ["docker_container", "docker_host", "system_service_name"],
  },
  {
    label: "Misc Protocols",
    defaultOpen: false,
    fields: [
      "ping_numeric",
      "ping_count",
      "ping_per_request_timeout",
      "packetSize",
      "game",
      "gamedigGivenPortOnly",
      "gamedigToken",
      "snmpOid",
      "snmpVersion",
      "smtpSecurity",
      "wsIgnoreSecWebsocketAcceptHeader",
      "wsSubprotocol",
    ],
  },
  {
    label: "Other",
    defaultOpen: false,
    fields: ["proxyId", "notificationIDList", "maintenance", "location", "protocol", "childrenIDs", "includeSensitiveData", "pushToken"],
  },
]

const knownFieldSet = new Set(KNOWN_FIELD_GROUPS.flatMap((group) => group.fields))

export const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  url: "URL",
  hostname: "Hostname",
  port: "Port",
  method: "Method",
  type: "Type",
  subtype: "Subtype",
  interval: "Interval",
  retryInterval: "Retry interval",
  maxretries: "Maximum retry count",
  timeout: "Timeout",
  active: "Active",
  weight: "Weight",
  description: "Description",
  path: "Path",
  resendInterval: "Resend interval",
  retryOnlyOnStatusCodeFailure: "Retry only on status code failure",
  accepted_statuscodes: "Accepted status codes",
  maxredirects: "Maximum redirects",
  headers: "Headers",
  body: "Body",
  httpBodyEncoding: "HTTP body encoding",
  jsonPath: "JSON path",
  expectedValue: "Expected value",
  jsonPathOperator: "JSON path operator",
  saveResponse: "Save response",
  saveErrorResponse: "Save error response",
  responseMaxLength: "Response max length",
  cacheBust: "Cache bust",
  screenshot: "Screenshot",
  remote_browser: "Remote browser",
  grpcUrl: "gRPC URL",
  grpcProtobuf: "gRPC protobuf",
  grpcMethod: "gRPC method",
  grpcServiceName: "gRPC service name",
  grpcEnableTls: "gRPC enable TLS",
  grpcBody: "gRPC body",
  grpcMetadata: "gRPC metadata",
  expiryNotification: "Certificate expiry notification",
  domainExpiryNotification: "Domain expiry notification",
  ignoreTls: "Ignore TLS errors",
  expectedTlsAlert: "Expected TLS alert",
  tlsCa: "TLS CA certificate",
  tlsCert: "TLS client certificate",
  tlsKey: "TLS client key",
  keyword: "Keyword",
  invertKeyword: "Invert keyword match",
  conditions: "Conditions",
  upsideDown: "Upside-down mode",
  dns_resolve_type: "DNS resolve type",
  dns_resolve_server: "DNS resolve server",
  dns_last_result: "DNS last result",
  ipFamily: "IP family",
  authMethod: "Auth method",
  basic_auth_user: "Basic auth username",
  basic_auth_pass: "Basic auth password",
  oauth_client_id: "OAuth client ID",
  oauth_client_secret: "OAuth client secret",
  oauth_token_url: "OAuth token URL",
  oauth_scopes: "OAuth scopes",
  oauth_audience: "OAuth audience",
  oauth_auth_method: "OAuth auth method",
  bearer_token: "Bearer token",
  authWorkstation: "Auth workstation",
  authDomain: "Auth domain",
  radiusUsername: "RADIUS username",
  radiusPassword: "RADIUS password",
  radiusSecret: "RADIUS secret",
  radiusCalledStationId: "RADIUS called station ID",
  radiusCallingStationId: "RADIUS calling station ID",
  mqttTopic: "MQTT topic",
  mqttSuccessMessage: "MQTT success message",
  mqttCheckType: "MQTT check type",
  mqttUsername: "MQTT username",
  mqttPassword: "MQTT password",
  mqttWebsocketPath: "MQTT WebSocket path",
  databaseQuery: "Database query",
  databaseConnectionString: "Database connection string",
  kafkaProducerTopic: "Kafka topic",
  kafkaProducerBrokers: "Kafka brokers",
  kafkaProducerSsl: "Kafka SSL",
  kafkaProducerAllowAutoTopicCreation: "Kafka auto create topic",
  kafkaProducerMessage: "Kafka message",
  kafkaProducerSaslOptions: "Kafka SASL options",
  rabbitmqNodes: "RabbitMQ nodes",
  rabbitmqUsername: "RabbitMQ username",
  rabbitmqPassword: "RabbitMQ password",
  docker_container: "Docker container",
  docker_host: "Docker host",
  system_service_name: "System service name",
  ping_numeric: "Numeric ping output",
  ping_count: "Ping count",
  ping_per_request_timeout: "Ping per-request timeout",
  packetSize: "Packet size",
  game: "Game",
  gamedigGivenPortOnly: "GameDig given port only",
  gamedigToken: "GameDig token",
  snmpOid: "SNMP OID",
  snmpVersion: "SNMP version",
  smtpSecurity: "SMTP security",
  wsIgnoreSecWebsocketAcceptHeader: "Ignore Sec-WebSocket-Accept",
  wsSubprotocol: "WebSocket subprotocol",
  proxyId: "Proxy ID",
  notificationIDList: "Notification ID list",
  maintenance: "Maintenance",
  location: "Location",
  protocol: "Protocol",
  childrenIDs: "Children IDs",
  includeSensitiveData: "Include sensitive data",
  pushToken: "Push token",
}

export function getFieldGroupLabel(field: string): string | null {
  for (const group of KNOWN_FIELD_GROUPS) {
    if (group.fields.includes(field)) return group.label
  }
  return null
}

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}

export function getFieldGroupsForMonitor(monitorFields: string[]): {
  groups: Array<FieldGroup & { actualFields: string[] }>
  unlistedFields: string[]
} {
  const known: Map<string, string[]> = new Map()

  for (const field of monitorFields) {
    if (!knownFieldSet.has(field)) continue
    const label = getFieldGroupLabel(field)
    if (!label) continue
    known.set(label, [...(known.get(label) ?? []), field])
  }

  const unlistedFields = monitorFields.filter((field) => !knownFieldSet.has(field))

  const groups = KNOWN_FIELD_GROUPS.flatMap((group) => {
    const actualFields = known.get(group.label)
    if (!actualFields || actualFields.length === 0) return []
    return [{ ...group, actualFields }]
  })

  return { groups, unlistedFields }
}
