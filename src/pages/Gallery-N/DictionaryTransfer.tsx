import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { currentChapterAtom, currentDictIdAtom, customDictionaryResourcesAtom } from '@/store'
import type { Word } from '@/typings'
import { deleteCustomDictionary, exportCustomDictionary, saveCustomDictionary } from '@/utils/customDictionary'
import { dictionaryLanguageProfiles, parseCustomDictionaryImport, splitDictionaryTags } from '@/utils/customDictionaryStorage'
import { saveAs } from 'file-saver'
import { useAtom, useSetAtom } from 'jotai'
import type { ChangeEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import IconDownload from '~icons/tabler/download'
import IconFileImport from '~icons/tabler/file-import'
import IconTrash from '~icons/tabler/trash'
import IconUpload from '~icons/tabler/upload'

type FormState = {
  existingId?: string
  name: string
  description: string
  category: string
  tags: string
  profileId: string
}

const defaultProfile = dictionaryLanguageProfiles[0]

function getInitialFormState(): FormState {
  return {
    name: '',
    description: '',
    category: 'Custom Dictionaries',
    tags: 'custom',
    profileId: defaultProfile.id,
  }
}

function getProfileId(language?: string, languageCategory?: string) {
  return (
    dictionaryLanguageProfiles.find((profile) => profile.language === language && profile.languageCategory === languageCategory)?.id ??
    defaultProfile.id
  )
}

export default function DictionaryTransfer() {
  const [open, setOpen] = useState(false)
  const [customDictionaryResources, setCustomDictionaryResources] = useAtom(customDictionaryResourcesAtom)
  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)

  const [formState, setFormState] = useState<FormState>(getInitialFormState())
  const [parsedWords, setParsedWords] = useState<Word[]>([])
  const [selectedFileName, setSelectedFileName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sortedCustomDictionaries = useMemo(
    () => [...customDictionaryResources].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
    [customDictionaryResources],
  )

  const parsedWordCount = parsedWords.length

  const resetImportState = () => {
    setFormState(getInitialFormState())
    setParsedWords([])
    setSelectedFileName('')
    setErrorMessage('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const updateFormState = (key: keyof FormState, value: string) => {
    setFormState((current) => ({ ...current, [key]: value }))
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const parsed = parseCustomDictionaryImport(content)
      const fallbackName = file.name.replace(/\.[^.]+$/, '')

      setParsedWords(parsed.words)
      setSelectedFileName(file.name)
      setErrorMessage('')
      setSuccessMessage('')
      setFormState({
        existingId: parsed.dictionary?.id,
        name: parsed.dictionary?.name || fallbackName,
        description: parsed.dictionary?.description || '',
        category: parsed.dictionary?.category || 'Custom Dictionaries',
        tags: parsed.dictionary?.tags?.join(', ') || 'custom',
        profileId: getProfileId(parsed.dictionary?.language, parsed.dictionary?.languageCategory),
      })
    } catch (error) {
      setParsedWords([])
      setSelectedFileName('')
      setFormState(getInitialFormState())
      setSuccessMessage('')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse dictionary file.')
    }
  }

  const onImportDictionary = async () => {
    if (parsedWords.length === 0) {
      setErrorMessage('Please select a valid dictionary file first.')
      return
    }

    if (!formState.name.trim()) {
      setErrorMessage('Dictionary name is required.')
      return
    }

    const profile = dictionaryLanguageProfiles.find((item) => item.id === formState.profileId) ?? defaultProfile

    setIsImporting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const dictionary = await saveCustomDictionary({
        existingId: formState.existingId,
        name: formState.name.trim(),
        description: formState.description.trim(),
        category: formState.category.trim(),
        tags: splitDictionaryTags(formState.tags),
        words: parsedWords,
        language: profile.language,
        languageCategory: profile.languageCategory,
      })

      setCustomDictionaryResources((current) => {
        const next = current.filter((item) => item.id !== dictionary.id)
        return [...next, dictionary]
      })
      resetImportState()
      setSuccessMessage(`Imported "${dictionary.name}".`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import dictionary.')
    } finally {
      setIsImporting(false)
    }
  }

  const onExportDictionary = async (dictionaryId: string) => {
    const dictionary = customDictionaryResources.find((item) => item.id === dictionaryId)
    if (!dictionary) {
      return
    }

    setExportingId(dictionaryId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const bundle = await exportCustomDictionary(dictionary)
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' })
      saveAs(blob, `${dictionary.id}.json`)
      setSuccessMessage(`Exported "${dictionary.name}".`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export dictionary.')
    } finally {
      setExportingId(null)
    }
  }

  const onDeleteDictionary = async (dictionaryId: string) => {
    const dictionary = customDictionaryResources.find((item) => item.id === dictionaryId)
    if (!dictionary) {
      return
    }

    const confirmed = window.confirm(`Delete "${dictionary.name}" and its practice records?`)
    if (!confirmed) {
      return
    }

    setDeletingId(dictionaryId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteCustomDictionary(dictionaryId)
      setCustomDictionaryResources((current) => current.filter((item) => item.id !== dictionaryId))

      if (currentDictId === dictionaryId) {
        setCurrentDictId('cet4')
        setCurrentChapter(0)
      }

      setSuccessMessage(`Deleted "${dictionary.name}".`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete dictionary.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          resetImportState()
          setSuccessMessage('')
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="group flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <IconUpload className="h-4 w-4" />
          <span>Import/Export Dictionaries</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] w-[72rem] max-w-none overflow-hidden p-0">
        <div className="grid h-full min-h-[38rem] grid-cols-[1.15fr_0.85fr] overflow-hidden">
          <div className="border-r border-slate-200 p-6 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle>Import Dictionary</DialogTitle>
              <DialogDescription>
                Supports both plain arrays like <code>[&#123;"name","trans"&#125;]</code> and exported bundles with
                <code>dictionary</code> plus <code>words</code>.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertTitle>Request Failed</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert>
                  <AlertTitle>Request Completed</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={onFileChange} />

              <div className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Dictionary File</div>
                    <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                      {selectedFileName ? `${selectedFileName} | ${parsedWordCount} words` : 'No file selected'}
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={openFilePicker}>
                    <IconFileImport className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Name</span>
                  <input
                    value={formState.name}
                    onChange={(event) => updateFormState('name', event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="My TOEIC Notes"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Language Profile</span>
                  <select
                    value={formState.profileId}
                    onChange={(event) => updateFormState('profileId', event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {dictionaryLanguageProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Description</span>
                <input
                  value={formState.description}
                  onChange={(event) => updateFormState('description', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Optional summary of this dictionary"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Category</span>
                  <input
                    value={formState.category}
                    onChange={(event) => updateFormState('category', event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Custom Dictionaries"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Tags</span>
                  <input
                    value={formState.tags}
                    onChange={(event) => updateFormState('tags', event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Separate tags with commas"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <span>Imported dictionaries appear in the gallery immediately.</span>
                <Button type="button" onClick={onImportDictionary} disabled={isImporting || parsedWords.length === 0}>
                  {isImporting ? 'Importing...' : 'Import Dictionary'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col p-6">
            <DialogHeader>
              <DialogTitle>Custom Dictionaries</DialogTitle>
              <DialogDescription>Exports are re-importable. Deleting a dictionary also removes its practice records.</DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex-1 overflow-y-auto">
              {sortedCustomDictionaries.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No custom dictionaries yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedCustomDictionaries.map((dictionary) => (
                    <div
                      key={dictionary.id}
                      className="rounded-xl border border-slate-200 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{dictionary.name}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {dictionary.category} | {dictionary.length} words
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {dictionary.tags.map((tag) => (
                              <span
                                key={`${dictionary.id}-${tag}`}
                                className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onExportDictionary(dictionary.id)}
                            disabled={exportingId === dictionary.id}
                          >
                            <IconDownload className="mr-1.5 h-4 w-4" />
                            {exportingId === dictionary.id ? 'Exporting...' : 'Export'}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteDictionary(dictionary.id)}
                            disabled={deletingId === dictionary.id}
                          >
                            <IconTrash className="mr-1.5 h-4 w-4" />
                            {deletingId === dictionary.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
