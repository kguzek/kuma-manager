import type { DiffBypassRule } from "@/types/monitor"

export const DIFF_BYPASS_RULES: DiffBypassRule[] = [
  {
    instanceName: "Solvro-WCSS",
    monitorMatchTag: "guzek-vpn",
    ignoreDiffFields: ["upsideDown"],
  },
]
