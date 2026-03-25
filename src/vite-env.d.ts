/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string
  readonly VITE_PORT?: string
  readonly VITE_PREVIEW_PORT?: string
  readonly VITE_ENGLISH_LEARNING_EXPORT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const LATEST_COMMIT_HASH: string
