import { useDeleteWordRecord } from '../../../utils/db'
import Chapter from '../Chapter'
import { ErrorTable } from '../ErrorTable'
import { getRowsFromErrorWordData } from '../ErrorTable/columns'
import { ReviewDetail } from '../ReviewDetail'
import useErrorWordData from '../hooks/useErrorWords'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { currentChapterAtom, currentDictIdAtom, customDictionaryResourcesAtom, reviewModeInfoAtom } from '@/store'
import type { Dictionary } from '@/typings'
import { getCustomDictionaryWordsById, saveCustomDictionary } from '@/utils/customDictionary'
import {
  ENGLISH_LEARNING_GLOBAL_DICT_CATEGORY,
  ENGLISH_LEARNING_GLOBAL_DICT_ID,
  ENGLISH_LEARNING_GLOBAL_DICT_NAME,
  ENGLISH_LEARNING_GLOBAL_DICT_TAGS,
  fetchEnglishLearningExport,
  mergeEnglishLearningWords,
  resolveEnglishLearningExportUrl,
} from '@/utils/englishLearningSync'
import range from '@/utils/range'
import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IcOutlineCollectionsBookmark from '~icons/ic/outline-collections-bookmark'
import MajesticonsPaperFoldTextLine from '~icons/majesticons/paper-fold-text-line'
import PajamasReviewList from '~icons/pajamas/review-list'

enum Tab {
  Chapters = 'chapters',
  Errors = 'errors',
  Review = 'review',
}

export default function DictDetail({ dictionary: dict }: { dictionary: Dictionary }) {
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const [, setCustomDictionaryResources] = useAtom(customDictionaryResourcesAtom)
  const [curTab, setCurTab] = useState<Tab>(Tab.Chapters)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const navigate = useNavigate()
  const { deleteWordRecord } = useDeleteWordRecord()
  const [reload, setReload] = useState(false)

  const isListeningVocabularyDictionary = dict.id === ENGLISH_LEARNING_GLOBAL_DICT_ID
  const chapter = useMemo(() => (dict.id === currentDictId ? currentChapter : 0), [currentChapter, currentDictId, dict.id])
  const { errorWordData, isLoading, error } = useErrorWordData(dict, reload)

  const tableData = useMemo(() => getRowsFromErrorWordData(errorWordData), [errorWordData])

  const onDelete = useCallback(
    async (word: string) => {
      await deleteWordRecord(word, dict.id)
      setReload((old) => !old)
    },
    [deleteWordRecord, dict.id],
  )

  const onChangeChapter = useCallback(
    (index: number) => {
      setCurrentDictId(dict.id)
      setCurrentChapter(index)
      setReviewModeInfo((old) => ({ ...old, isReviewMode: false }))
      navigate('/')
    },
    [dict.id, navigate, setCurrentChapter, setCurrentDictId, setReviewModeInfo],
  )

  const handleTabChange = useCallback(
    (value: string) => {
      if (!value) {
        return
      }

      const nextTab = value as Tab
      if (nextTab !== curTab) {
        setCurTab(nextTab)
      }
    },
    [curTab],
  )

  const onSyncListeningVocabulary = useCallback(async () => {
    setIsSyncing(true)
    setSyncError(null)
    setSyncMessage(null)

    try {
      const sourceUrl = resolveEnglishLearningExportUrl(import.meta.env.VITE_ENGLISH_LEARNING_EXPORT_URL)
      const payload = await fetchEnglishLearningExport(sourceUrl)
      const existingWords = await getCustomDictionaryWordsById(ENGLISH_LEARNING_GLOBAL_DICT_ID)
      const mergeResult = mergeEnglishLearningWords(existingWords, payload.words)

      const dictionary = await saveCustomDictionary({
        existingId: ENGLISH_LEARNING_GLOBAL_DICT_ID,
        name: ENGLISH_LEARNING_GLOBAL_DICT_NAME,
        description: `Synced from English_Learning (${sourceUrl})`,
        category: ENGLISH_LEARNING_GLOBAL_DICT_CATEGORY,
        tags: ENGLISH_LEARNING_GLOBAL_DICT_TAGS,
        words: mergeResult.mergedWords,
        language: 'en',
        languageCategory: 'en',
      })

      setCustomDictionaryResources((current) => {
        const next = current.filter((item) => item.id !== dictionary.id)
        return [...next, dictionary]
      })

      setCurrentDictId(ENGLISH_LEARNING_GLOBAL_DICT_ID)
      setCurrentChapter(0)
      setReviewModeInfo((old) => ({ ...old, isReviewMode: false }))

      setSyncMessage(
        `\u540c\u6b65\u5b8c\u6210\uff1a\u65b0\u589e ${mergeResult.addedCount}\uff0c\u66f4\u65b0 ${mergeResult.updatedCount}\uff0c\u672a\u53d8\u5316 ${mergeResult.unchangedCount}\u3002`,
      )
    } catch (syncActionError) {
      setSyncError(syncActionError instanceof Error ? syncActionError.message : '\u540c\u6b65\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002')
    } finally {
      setIsSyncing(false)
    }
  }, [setCurrentChapter, setCurrentDictId, setCustomDictionaryResources, setReviewModeInfo])

  return (
    <div className="flex flex-col rounded-[4rem] px-4 py-3 pl-5 text-gray-800 dark:text-gray-300">
      <div className="relative flex h-40 flex-col gap-2">
        <h3 className="text-2xl font-semibold">{dict.name}</h3>
        {!isListeningVocabularyDictionary && <p className="mt-1">{dict.chapterCount} chapters</p>}
        <p>{dict.length} words</p>
        <p>{dict.description}</p>

        <div className="absolute bottom-5 right-4">
          {!isListeningVocabularyDictionary ? (
            <ToggleGroup type="single" value={curTab} onValueChange={handleTabChange}>
              <ToggleGroupItem
                value={Tab.Chapters}
                disabled={curTab === Tab.Chapters}
                className={`${curTab === Tab.Chapters ? 'text-primary-foreground bg-primary' : ''} disabled:opacity-100`}
              >
                <MajesticonsPaperFoldTextLine className="mr-1.5 text-gray-500" />
                Chapter
              </ToggleGroupItem>
              {errorWordData.length > 0 && (
                <>
                  <ToggleGroupItem
                    value={Tab.Errors}
                    disabled={curTab === Tab.Errors}
                    className={`${curTab === Tab.Errors ? 'text-primary-foreground bg-primary' : ''} disabled:opacity-100`}
                  >
                    <IcOutlineCollectionsBookmark className="mr-1.5 text-gray-500" />
                    Errors
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={Tab.Review}
                    disabled={curTab === Tab.Review}
                    className={`${curTab === Tab.Review ? 'text-primary-foreground bg-primary' : ''} disabled:opacity-100`}
                  >
                    <PajamasReviewList className="mr-1.5 text-gray-500" />
                    Review
                  </ToggleGroupItem>
                </>
              )}
            </ToggleGroup>
          ) : (
            <button
              type="button"
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void onSyncListeningVocabulary()}
              disabled={isSyncing}
            >
              {isSyncing ? '\u540c\u6b65\u4e2d...' : '\u540c\u6b65\u542c\u529b\u751f\u8bcd'}
            </button>
          )}
        </div>
      </div>

      <div className="flex pl-0">
        {isListeningVocabularyDictionary ? (
          <div className="dark:border-indigo-500/35 h-[30rem] w-full rounded-xl border border-dashed border-indigo-300/50 px-4 py-5">
            <div className="space-y-3 text-sm">
              <p className="text-gray-700 dark:text-gray-200">
                {
                  '\u70b9\u51fb\u300c\u540c\u6b65\u542c\u529b\u751f\u8bcd\u300d\u540e\uff0c\u4f1a\u4ece English_Learning \u7684\u5168\u5c40\u751f\u8bcd\u5e93\u62c9\u53d6\u5e76\u5408\u5e76\u5230\u5f53\u524d\u8bcd\u5e93\u3002'
                }
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {
                  '\u8be5\u8bcd\u5e93\u4e0d\u663e\u793a\u7ae0\u8282\uff0c\u4f7f\u7528\u624b\u52a8\u540c\u6b65\u4fdd\u6301\u8bcd\u8868\u6700\u65b0\u3002'
                }
              </p>
              {syncMessage && <p className="text-emerald-600 dark:text-emerald-300">{syncMessage}</p>}
              {syncError && <p className="text-red-600 dark:text-red-300">{syncError}</p>}
            </div>
          </div>
        ) : (
          <Tabs value={curTab} className="h-[30rem] w-full">
            <TabsContent value={Tab.Chapters} className="h-full">
              <ScrollArea className="h-[30rem]">
                <div className="flex w-full flex-wrap gap-3">
                  {range(0, dict.chapterCount, 1).map((index) => (
                    <Chapter
                      key={`${dict.id}-${index}`}
                      index={index}
                      checked={chapter === index}
                      dictID={dict.id}
                      onChange={onChangeChapter}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value={Tab.Errors} className="h-full">
              <ErrorTable data={tableData} isLoading={isLoading} error={error} onDelete={onDelete} />
            </TabsContent>
            <TabsContent value={Tab.Review} className="h-full">
              <ReviewDetail errorData={errorWordData} dict={dict} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
