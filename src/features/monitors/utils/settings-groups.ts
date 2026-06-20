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
    label: "Ping & ICMP",
    defaultOpen: false,
    fields: ["ping_numeric", "ping_count", "ping_per_request_timeout", "packetSize"],
  },
  {
    label: "Game Server",
    defaultOpen: false,
    fields: ["game", "gamedigGivenPortOnly", "gamedigToken"],
  },
  {
    label: "SNMP",
    defaultOpen: false,
    fields: ["snmpOid", "snmpVersion"],
  },
  {
    label: "SMTP",
    defaultOpen: false,
    fields: ["smtpSecurity"],
  },
  {
    label: "WebSocket",
    defaultOpen: false,
    fields: ["wsIgnoreSecWebsocketAcceptHeader", "wsSubprotocol"],
  },
  {
    label: "Other",
    defaultOpen: false,
    fields: [
      "proxyId",
      "notificationIDList",
      "maintenance",
      "location",
      "protocol",
      "childrenIDs",
      "includeSensitiveData",
      "pushToken",
      "smtpSecurity",
    ],
  },
]

const knownFieldSet = new Set(KNOWN_FIELD_GROUPS.flatMap((group) => group.fields))

export function getFieldGroupLabel(field: string): string | null {
  for (const group of KNOWN_FIELD_GROUPS) {
    if (group.fields.includes(field)) return group.label
  }
  return null
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
