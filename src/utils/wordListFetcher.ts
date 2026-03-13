import type { Word } from '@/typings'
import { withBase } from '@/utils/basePath'
import { getCustomDictionaryWordsByUrl } from '@/utils/customDictionary'
import { isCustomDictionaryUrl } from '@/utils/customDictionaryStorage'

export async function wordListFetcher(url: string): Promise<Word[]> {
  if (isCustomDictionaryUrl(url)) {
    return getCustomDictionaryWordsByUrl(url)
  }

  const response = await fetch(withBase(url))
  const words: Word[] = await response.json()
  return words
}
