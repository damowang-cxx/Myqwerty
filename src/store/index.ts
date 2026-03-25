import atomForConfig from './atomForConfig'
import { reviewInfoAtom } from './reviewInfoAtom'
import { DISMISS_START_CARD_DATE_KEY, defaultFontSizeConfig } from '@/constants'
import { dictionaries as builtInDictionaries, idDictionaryMap as builtInDictionaryMap } from '@/resources/dictionary'
import { correctSoundResources, keySoundResources, wrongSoundResources } from '@/resources/soundResource'
import type {
  Dictionary,
  DictionaryResource,
  InfoPanelState,
  LoopWordTimesOption,
  PhoneticType,
  PronunciationType,
  WordDictationOpenBy,
  WordDictationType,
} from '@/typings'
import { calcChapterCount } from '@/utils'
import { buildCustomDictionaryUrl, readStoredCustomDictionaryResources } from '@/utils/customDictionaryStorage'
import type { ReviewRecord } from '@/utils/db/record'
import {
  ENGLISH_LEARNING_GLOBAL_DICT_CATEGORY,
  ENGLISH_LEARNING_GLOBAL_DICT_ID,
  ENGLISH_LEARNING_GLOBAL_DICT_NAME,
  ENGLISH_LEARNING_GLOBAL_DICT_TAGS,
} from '@/utils/englishLearningSync'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const currentDictIdAtom = atomWithStorage('currentDict', 'cet4')
export const customDictionaryResourcesAtom = atomWithStorage<DictionaryResource[]>(
  'customDictionaryResources',
  readStoredCustomDictionaryResources(),
)

export const allDictionariesAtom = atom<Dictionary[]>((get) => {
  const customResources = get(customDictionaryResourcesAtom)
  const syncedListeningDictionary = customResources.find((resource) => resource.id === ENGLISH_LEARNING_GLOBAL_DICT_ID)

  const customDictionaries = customResources
    .filter((resource) => resource.id !== ENGLISH_LEARNING_GLOBAL_DICT_ID)
    .map((resource) => ({
      ...resource,
      chapterCount: calcChapterCount(resource.length),
    }))

  const listeningVocabularyDictionary: Dictionary = {
    id: ENGLISH_LEARNING_GLOBAL_DICT_ID,
    name: ENGLISH_LEARNING_GLOBAL_DICT_NAME,
    description: 'Synced from English_Learning global vocabulary.',
    category: '中国考试',
    tags: ['我的'],
    url: buildCustomDictionaryUrl(ENGLISH_LEARNING_GLOBAL_DICT_ID),
    length: syncedListeningDictionary?.length ?? 0,
    language: 'en',
    languageCategory: 'en',
    source: 'custom',
    updatedAt: syncedListeningDictionary?.updatedAt,
    chapterCount: calcChapterCount(syncedListeningDictionary?.length ?? 0),
  }
  listeningVocabularyDictionary.category = ENGLISH_LEARNING_GLOBAL_DICT_CATEGORY
  listeningVocabularyDictionary.tags = ENGLISH_LEARNING_GLOBAL_DICT_TAGS

  return [...builtInDictionaries, ...customDictionaries, listeningVocabularyDictionary]
})

export const dictionaryMapAtom = atom<Record<string, Dictionary>>((get) =>
  Object.fromEntries(get(allDictionariesAtom).map((dict) => [dict.id, dict])),
)

export const currentDictInfoAtom = atom<Dictionary>((get) => {
  const id = get(currentDictIdAtom)
  const dictionaryMap = get(dictionaryMapAtom)
  let dict = dictionaryMap[id]

  if (!dict) {
    dict = builtInDictionaryMap.cet4
  }
  return dict
})

export const currentChapterAtom = atomWithStorage('currentChapter', 0)

export const loopWordConfigAtom = atomForConfig<{ times: LoopWordTimesOption }>('loopWordConfig', {
  times: 1,
})

export const keySoundsConfigAtom = atomForConfig('keySoundsConfig', {
  isOpen: true,
  isOpenClickSound: true,
  volume: 1,
  resource: keySoundResources[0],
})

export const hintSoundsConfigAtom = atomForConfig('hintSoundsConfig', {
  isOpen: true,
  volume: 1,
  isOpenWrongSound: true,
  isOpenCorrectSound: true,
  wrongResource: wrongSoundResources[0],
  correctResource: correctSoundResources[0],
})

export const pronunciationConfigAtom = atomForConfig('pronunciation', {
  isOpen: true,
  volume: 1,
  type: 'us' as PronunciationType,
  name: '美音',
  isLoop: false,
  isTransRead: false,
  transVolume: 1,
  rate: 1,
})

export const fontSizeConfigAtom = atomForConfig('fontsize', defaultFontSizeConfig)

export const pronunciationIsOpenAtom = atom((get) => get(pronunciationConfigAtom).isOpen)
export const pronunciationIsTransReadAtom = atom((get) => get(pronunciationConfigAtom).isTransRead)

export const randomConfigAtom = atomForConfig('randomConfig', {
  isOpen: false,
})

export const isShowPrevAndNextWordAtom = atomWithStorage('isShowPrevAndNextWord', true)
export const isIgnoreCaseAtom = atomWithStorage('isIgnoreCase', true)
export const isShowAnswerOnHoverAtom = atomWithStorage('isShowAnswerOnHover', true)
export const isTextSelectableAtom = atomWithStorage('isTextSelectable', false)

export const reviewModeInfoAtom = reviewInfoAtom({
  isReviewMode: false,
  reviewRecord: undefined as ReviewRecord | undefined,
})
export const isReviewModeAtom = atom((get) => get(reviewModeInfoAtom).isReviewMode)

export const phoneticConfigAtom = atomForConfig('phoneticConfig', {
  isOpen: true,
  type: 'us' as PhoneticType,
})

export const isOpenDarkModeAtom = atomWithStorage('isOpenDarkModeAtom', window.matchMedia('(prefers-color-scheme: dark)').matches)
export const isShowSkipAtom = atom(false)
export const isInDevModeAtom = atom(false)

export const infoPanelStateAtom = atom<InfoPanelState>({
  donate: false,
  vsc: false,
  community: false,
  redBook: false,
})

export const wordDictationConfigAtom = atomForConfig('wordDictationConfig', {
  isOpen: false,
  type: 'hideAll' as WordDictationType,
  openBy: 'auto' as WordDictationOpenBy,
})

export const dismissStartCardDateAtom = atomWithStorage<Date | null>(DISMISS_START_CARD_DATE_KEY, null)
export const hasSeenEnhancedPromotionAtom = atomWithStorage('hasSeenEnhancedPromotion', false)
