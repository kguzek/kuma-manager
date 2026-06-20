import type { KumaApiClient } from "@/api/kuma/client"
import type { KumaStatusPage } from "@/types"

export async function enrichInstancePages(pages: KumaStatusPage[], client: KumaApiClient): Promise<KumaStatusPage[]> {
  const enriched = await Promise.all(
    pages.map(async (page) => {
      const slug = page.slug || `page-${page.id}`
      const detail = await client.getStatusPage(slug)
      return detail ?? page
    }),
  )
  return enriched
}
