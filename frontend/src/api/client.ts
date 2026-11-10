import type { PageData } from '../types'
import { assertOk, dufsUrl } from '../lib/dufs'

export async function getDirectoryData(): Promise<PageData> {
  const url = new URL(dufsUrl(`${location.pathname}${location.search}`))
  url.searchParams.set('__dufs_api', 'v1')
  const response = await assertOk(await fetch(url, { headers: { Accept: 'application/json' } }))
  return await response.json() as PageData
}
