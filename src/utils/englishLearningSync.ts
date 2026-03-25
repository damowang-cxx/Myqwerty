import type { Word } from '@/typings'

export const ENGLISH_LEARNING_GLOBAL_DICT_ID = 'english-learning-global'
export const ENGLISH_LEARNING_GLOBAL_DICT_NAME = '\u542c\u529b\u751f\u8bcd'
export const ENGLISH_LEARNING_GLOBAL_DICT_CATEGORY = '\u4e2d\u56fd\u8003\u8bd5'
export const ENGLISH_LEARNING_GLOBAL_DICT_TAGS = ['\u6211\u7684']
export const DEFAULT_ENGLISH_LEARNING_EXPORT_URL = '/listen/api/vocabulary/global/export'

export interface EnglishLearningExportWord {
  name: string
  trans?: string[]
  usphone?: string
  ukphone?: string
  notation?: string
}

export interface EnglishLearningExportPayload {
  version: number
  generatedAt: string
  totalWords: number
  words: EnglishLearningExportWord[]
}

export interface EnglishLearningMergeResult {
  mergedWords: Word[]
  addedCount: number
  updatedCount: number
  unchangedCount: number
}

function normalizeWordName(value: string) {
  return value.trim().toLowerCase()
}

function dedupeTranslations(values: string[] = []) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function normalizePhone(value: string | undefined) {
  return (value || '').trim()
}

function normalizeExportWord(word: EnglishLearningExportWord): Word | null {
  const name = normalizeWordName(word.name || '')

  if (!name) {
    return null
  }

  return {
    name,
    trans: dedupeTranslations(word.trans || []),
    usphone: normalizePhone(word.usphone),
    ukphone: normalizePhone(word.ukphone),
    notation: normalizePhone(word.notation) || undefined,
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export function resolveEnglishLearningExportUrl(configuredUrl?: string) {
  const fromEnv = (configuredUrl || '').trim()
  if (!fromEnv) {
    return DEFAULT_ENGLISH_LEARNING_EXPORT_URL
  }

  if (isHttpUrl(fromEnv) || fromEnv.startsWith('/')) {
    return fromEnv
  }

  return `/${fromEnv.replace(/^\/+/, '')}`
}

export async function fetchEnglishLearningExport(sourceUrl: string): Promise<EnglishLearningExportPayload> {
  const response = await fetch(sourceUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`)
  }

  const data = (await response.json()) as Partial<EnglishLearningExportPayload>
  const words = Array.isArray(data.words) ? data.words : []

  return {
    version: typeof data.version === 'number' ? data.version : 1,
    generatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : new Date().toISOString(),
    totalWords: typeof data.totalWords === 'number' ? data.totalWords : words.length,
    words,
  }
}

export function mergeEnglishLearningWords(existingWords: Word[], incomingWords: EnglishLearningExportWord[]): EnglishLearningMergeResult {
  const mergedWords = existingWords.map((word) => ({
    ...word,
    trans: dedupeTranslations(word.trans || []),
    usphone: normalizePhone(word.usphone),
    ukphone: normalizePhone(word.ukphone),
    notation: normalizePhone(word.notation) || undefined,
  }))

  const wordIndexMap = new Map<string, number>()
  for (const [index, word] of mergedWords.entries()) {
    wordIndexMap.set(normalizeWordName(word.name), index)
  }

  let addedCount = 0
  let updatedCount = 0
  let unchangedCount = 0

  for (const sourceWord of incomingWords) {
    const incoming = normalizeExportWord(sourceWord)
    if (!incoming) {
      continue
    }

    const key = normalizeWordName(incoming.name)
    const existingIndex = wordIndexMap.get(key)

    if (existingIndex === undefined) {
      wordIndexMap.set(key, mergedWords.length)
      mergedWords.push(incoming)
      addedCount += 1
      continue
    }

    const current = mergedWords[existingIndex]
    const mergedTrans = dedupeTranslations([...current.trans, ...incoming.trans])
    const nextUsphone = current.usphone || incoming.usphone
    const nextUkphone = current.ukphone || incoming.ukphone
    const nextNotation = current.notation || incoming.notation

    const changed =
      mergedTrans.length !== current.trans.length ||
      nextUsphone !== current.usphone ||
      nextUkphone !== current.ukphone ||
      nextNotation !== current.notation

    if (changed) {
      mergedWords[existingIndex] = {
        ...current,
        trans: mergedTrans,
        usphone: nextUsphone,
        ukphone: nextUkphone,
        notation: nextNotation,
      }
      updatedCount += 1
    } else {
      unchangedCount += 1
    }
  }

  return {
    mergedWords,
    addedCount,
    updatedCount,
    unchangedCount,
  }
}
