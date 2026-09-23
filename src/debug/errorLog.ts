import { useSyncExternalStore } from 'react'
import { readJSON, writeJSON } from '../data/localStorageDriver'

// Private, device-local debug aid — never synced (same bucket as deviceId
// and the sync outbox). Captures console.error/console.warn calls plus
// otherwise-invisible failures (uncaught exceptions, unhandled promise
// rejections) into a small persisted ring buffer, so a seller hitting a
// silent bug (an event-handler exception shows nothing on screen — see the
// crypto.randomUUID incident) can copy/share what actually happened instead
// of describing "it just doesn't work."
const STORAGE_KEY = 'debugLog'
const MAX_ENTRIES = 200
const MAX_MESSAGE_LENGTH = 2000

export type LogSource = 'console.error' | 'console.warn' | 'window.error' | 'unhandledrejection' | 'errorBoundary'

export interface LogEntry {
  timestamp: string
  source: LogSource
  message: string
}

function truncate(message: string): string {
  return message.length > MAX_MESSAGE_LENGTH ? message.slice(0, MAX_MESSAGE_LENGTH) + '…' : message
}

let entries: LogEntry[] = readJSON<LogEntry[]>(STORAGE_KEY, [])
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function appendLogEntry(source: LogSource, message: string): void {
  entries = [...entries, { timestamp: new Date().toISOString(), source, message: truncate(message) }].slice(
    -MAX_ENTRIES,
  )
  writeJSON(STORAGE_KEY, entries)
  notify()
}

export function clearDebugLog(): void {
  entries = []
  writeJSON(STORAGE_KEY, entries)
  notify()
}

export function getDebugLogSnapshot(): LogEntry[] {
  return entries
}

export function subscribeDebugLog(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDebugLog(): LogEntry[] {
  return useSyncExternalStore(subscribeDebugLog, getDebugLogSnapshot)
}

export function formatDebugLogForSharing(log: LogEntry[]): string {
  if (log.length === 0) return '(אין רשומות ביומן)'
  return log.map((entry) => `[${entry.timestamp}] [${entry.source}] ${entry.message}`).join('\n')
}

function stringifyArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) return `${arg.message}\n${arg.stack ?? ''}`
      if (typeof arg === 'string') return arg
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}

let installed = false

// Called once at app startup (main.tsx). Wraps console.error/warn (so every
// existing call site across the app — drain.ts's failures, firebaseConfig's
// fallback notice, ErrorBoundary's componentDidCatch — is captured for free,
// no extra instrumentation needed) and adds window-level listeners for the
// failures that never reach the console at all: an uncaught error in an
// event handler and an unhandled promise rejection.
export function installGlobalErrorLogging(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const originalError = console.error
  console.error = (...args: unknown[]) => {
    appendLogEntry('console.error', stringifyArgs(args))
    originalError(...args)
  }

  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    appendLogEntry('console.warn', stringifyArgs(args))
    originalWarn(...args)
  }

  window.addEventListener('error', (event) => {
    appendLogEntry('window.error', `${event.message}\n${event.error?.stack ?? ''}`)
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    appendLogEntry(
      'unhandledrejection',
      reason instanceof Error ? `${reason.message}\n${reason.stack ?? ''}` : String(reason),
    )
  })
}
