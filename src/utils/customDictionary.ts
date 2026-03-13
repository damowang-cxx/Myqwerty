import {
  buildCustomDictionaryBundle,
  buildCustomDictionaryResource,
  buildCustomDictionaryUrl,
  parseCustomDictionaryId,
} from './customDictionaryStorage'
import type { DictionaryResource, LanguageCategoryType, LanguageType, Word } from '@/typings'
import { db } from '@/utils/db'

export async function getCustomDictionaryWordsById(id: string) {
  const record = await db.customDictionaries.get(id)
  return record?.words ?? []
}

export async function getCustomDictionaryWordsByUrl(url: string) {
  return getCustomDictionaryWordsById(parseCustomDictionaryId(url))
}

export async function saveCustomDictionary({
  existingId,
  name,
  description,
  category,
  tags,
  words,
  language,
  languageCategory,
  defaultPronIndex,
}: {
  existingId?: string
  name: string
  description: string
  category: string
  tags: string[]
  words: Word[]
  language: LanguageType
  languageCategory: LanguageCategoryType
  defaultPronIndex?: number
}) {
  const dictionary = buildCustomDictionaryResource({
    existingId,
    name,
    description,
    category,
    tags,
    words,
    language,
    languageCategory,
    defaultPronIndex,
  })

  await db.customDictionaries.put({
    id: dictionary.id,
    words,
    updatedAt: dictionary.updatedAt ?? Date.now(),
  })

  return {
    ...dictionary,
    url: buildCustomDictionaryUrl(dictionary.id),
  } as DictionaryResource
}

export async function exportCustomDictionary(dictionary: DictionaryResource) {
  const words = await getCustomDictionaryWordsById(dictionary.id)
  return buildCustomDictionaryBundle(dictionary, words)
}

export async function deleteCustomDictionary(id: string) {
  await Promise.all([
    db.customDictionaries.delete(id),
    db.wordRecords.where('dict').equals(id).delete(),
    db.chapterRecords.where('dict').equals(id).delete(),
    db.reviewRecords.where('dict').equals(id).delete(),
  ])
}
