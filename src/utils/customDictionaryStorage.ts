import { idDictionaryMap } from '@/resources/dictionary'
import type { DictionaryResource, LanguageCategoryType, LanguageType, Word } from '@/typings'

export const CUSTOM_DICTIONARY_STORAGE_KEY = 'customDictionaryResources'
export const CUSTOM_DICTIONARY_URL_PREFIX = 'custom://'

const DEFAULT_CATEGORY = 'Custom Dictionaries'
const DEFAULT_TAG = 'custom'

export type DictionaryLanguageProfile = {
  id: string
  label: string
  language: LanguageType
  languageCategory: LanguageCategoryType
}

export type ParsedCustomDictionaryImport = {
  words: Word[]
  dictionary?: Partial<DictionaryResource>
}

export type CustomDictionaryBundle = {
  version: 1
  dictionary: DictionaryResource
  words: Word[]
}

export const dictionaryLanguageProfiles: DictionaryLanguageProfile[] = [
  { id: 'en', label: 'English', language: 'en', languageCategory: 'en' },
  { id: 'code', label: 'Code', language: 'code', languageCategory: 'code' },
  { id: 'ja-romaji', label: 'Japanese (Romaji)', language: 'romaji', languageCategory: 'ja' },
  { id: 'de', label: 'German', language: 'de', languageCategory: 'de' },
  { id: 'kk-hapin', label: 'Kazakh (Hapin)', language: 'hapin', languageCategory: 'kk' },
  { id: 'id', label: 'Indonesian', language: 'id', languageCategory: 'id' },
]

function isLanguageType(value: unknown): value is LanguageType {
  return ['en', 'romaji', 'zh', 'ja', 'code', 'de', 'kk', 'hapin', 'id'].includes(String(value))
}

function isLanguageCategoryType(value: unknown): value is LanguageCategoryType {
  return ['en', 'ja', 'de', 'code', 'kk', 'id'].includes(String(value))
}

export function buildCustomDictionaryUrl(id: string) {
  return `${CUSTOM_DICTIONARY_URL_PREFIX}${id}`
}

export function isCustomDictionaryUrl(url: string) {
  return url.startsWith(CUSTOM_DICTIONARY_URL_PREFIX)
}

export function parseCustomDictionaryId(url: string) {
  return url.slice(CUSTOM_DICTIONARY_URL_PREFIX.length)
}

export function splitDictionaryTags(input: string) {
  const tags = input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  return tags.length > 0 ? Array.from(new Set(tags)) : [DEFAULT_TAG]
}

export function createDictionaryId(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || `custom-dict-${Date.now()}`
}

function ensureUniqueCustomDictionaryId(id: string, customMap: Map<string, DictionaryResource>) {
  let nextId = id
  let suffix = 2

  while (idDictionaryMap[nextId] || customMap.has(nextId)) {
    nextId = `${id}-${suffix}`
    suffix += 1
  }

  return nextId
}

function sanitizeDictionaryResource(input: unknown): DictionaryResource | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const item = input as Partial<DictionaryResource>
  const id = typeof item.id === 'string' ? item.id.trim() : ''
  const name = typeof item.name === 'string' ? item.name.trim() : ''

  if (!id || !name) {
    return null
  }

  const tags = Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0) : []

  return {
    id,
    name,
    description: typeof item.description === 'string' ? item.description.trim() : '',
    category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : DEFAULT_CATEGORY,
    tags: tags.length > 0 ? Array.from(new Set(tags)) : [DEFAULT_TAG],
    url: buildCustomDictionaryUrl(id),
    length: typeof item.length === 'number' && item.length >= 0 ? item.length : 0,
    language: isLanguageType(item.language) ? item.language : 'en',
    languageCategory: isLanguageCategoryType(item.languageCategory) ? item.languageCategory : 'en',
    source: 'custom',
    updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
    defaultPronIndex: typeof item.defaultPronIndex === 'number' ? item.defaultPronIndex : undefined,
  }
}

export function readStoredCustomDictionaryResources() {
  if (typeof window === 'undefined') {
    return [] as DictionaryResource[]
  }

  try {
    const raw = window.localStorage.getItem(CUSTOM_DICTIONARY_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map((item) => sanitizeDictionaryResource(item)).filter((item): item is DictionaryResource => item !== null)
  } catch {
    return []
  }
}

export function buildCustomDictionaryResource({
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
  const now = Date.now()
  const customResources = readStoredCustomDictionaryResources()
  const customMap = new Map(customResources.map((resource) => [resource.id, resource]))

  const requestedId = existingId?.trim() || createDictionaryId(name)
  let finalId = requestedId

  if (existingId?.trim()) {
    if (idDictionaryMap[finalId] && !customMap.has(finalId)) {
      finalId = ensureUniqueCustomDictionaryId(`custom-${finalId}`, customMap)
    }
  } else {
    finalId = ensureUniqueCustomDictionaryId(finalId, customMap)
  }

  return {
    id: finalId,
    name: name.trim(),
    description: description.trim(),
    category: category.trim() || DEFAULT_CATEGORY,
    tags: tags.length > 0 ? Array.from(new Set(tags)) : [DEFAULT_TAG],
    url: buildCustomDictionaryUrl(finalId),
    length: words.length,
    language,
    languageCategory,
    source: 'custom' as const,
    updatedAt: now,
    defaultPronIndex,
  }
}

export function normalizeWords(input: unknown): Word[] {
  if (!Array.isArray(input)) {
    throw new Error('Dictionary file must be an array.')
  }

  return input.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Entry ${index + 1} is not a valid object.`)
    }

    const record = item as Partial<Word>
    const name = typeof record.name === 'string' ? record.name.trim() : ''
    if (!name) {
      throw new Error(`Entry ${index + 1} is missing a valid name.`)
    }

    const trans = Array.isArray(record.trans)
      ? record.trans
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      : typeof record.trans === 'string'
      ? [record.trans.trim()].filter(Boolean)
      : []

    return {
      name,
      trans,
      usphone: typeof record.usphone === 'string' ? record.usphone : '',
      ukphone: typeof record.ukphone === 'string' ? record.ukphone : '',
      notation: typeof record.notation === 'string' && record.notation.trim() ? record.notation.trim() : undefined,
    }
  })
}

function normalizeImportDictionaryMeta(input: unknown) {
  if (!input || typeof input !== 'object') {
    return undefined
  }

  const item = input as Partial<DictionaryResource>
  return {
    id: typeof item.id === 'string' ? item.id.trim() : undefined,
    name: typeof item.name === 'string' ? item.name.trim() : undefined,
    description: typeof item.description === 'string' ? item.description.trim() : undefined,
    category: typeof item.category === 'string' ? item.category.trim() : undefined,
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0) : undefined,
    language: isLanguageType(item.language) ? item.language : undefined,
    languageCategory: isLanguageCategoryType(item.languageCategory) ? item.languageCategory : undefined,
    defaultPronIndex: typeof item.defaultPronIndex === 'number' ? item.defaultPronIndex : undefined,
  }
}

export function parseCustomDictionaryImport(content: string): ParsedCustomDictionaryImport {
  const parsed = JSON.parse(content) as unknown

  if (Array.isArray(parsed)) {
    return { words: normalizeWords(parsed) }
  }

  if (parsed && typeof parsed === 'object') {
    const bundle = parsed as { words?: unknown; dictionary?: unknown; meta?: unknown }
    if (bundle.words) {
      return {
        words: normalizeWords(bundle.words),
        dictionary: normalizeImportDictionaryMeta(bundle.dictionary ?? bundle.meta ?? bundle),
      }
    }
  }

  throw new Error('Unsupported dictionary file format.')
}

export function buildCustomDictionaryBundle(dictionary: DictionaryResource, words: Word[]): CustomDictionaryBundle {
  return {
    version: 1,
    dictionary: {
      ...dictionary,
      source: 'custom',
      url: buildCustomDictionaryUrl(dictionary.id),
      length: words.length,
    },
    words,
  }
}
