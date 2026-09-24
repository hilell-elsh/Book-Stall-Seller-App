import { beforeEach, describe, expect, it } from 'vitest'

const store = new Map<string, string>()
const fakeLocalStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
}
// @ts-expect-error -- minimal localStorage stand-in for a Node test environment
globalThis.localStorage = fakeLocalStorage
// @ts-expect-error -- minimal window stand-in so installGlobalErrorLogging() doesn't no-op
globalThis.window = { addEventListener: () => {} }

const {
  appendLogEntry,
  clearDebugLog,
  formatDebugLogForSharing,
  getDebugLogSnapshot,
  subscribeDebugLog,
  installGlobalErrorLogging,
} = await import('./errorLog')

describe('errorLog', () => {
  beforeEach(() => {
    clearDebugLog()
  })

  it('starts empty', () => {
    expect(getDebugLogSnapshot()).toEqual([])
  })

  it('appends an entry with a timestamp and source', () => {
    appendLogEntry('console.error', 'boom')
    const [entry] = getDebugLogSnapshot()
    expect(entry.source).toBe('console.error')
    expect(entry.message).toBe('boom')
    expect(entry.timestamp).toEqual(expect.any(String))
  })

  it('persists entries to localStorage', () => {
    appendLogEntry('window.error', 'crash')
    expect(store.get('shaatnez:v1:debugLog')).toContain('crash')
  })

  it('caps the log at 200 entries, dropping the oldest', () => {
    for (let i = 0; i < 205; i++) appendLogEntry('console.warn', `entry-${i}`)
    const log = getDebugLogSnapshot()
    expect(log).toHaveLength(200)
    expect(log[0].message).toBe('entry-5')
    expect(log[199].message).toBe('entry-204')
  })

  it('truncates very long messages', () => {
    appendLogEntry('console.error', 'x'.repeat(3000))
    expect(getDebugLogSnapshot()[0].message.length).toBeLessThan(3000)
  })

  it('clears the log', () => {
    appendLogEntry('console.error', 'boom')
    clearDebugLog()
    expect(getDebugLogSnapshot()).toEqual([])
  })

  it('notifies subscribers on append and clear', () => {
    let calls = 0
    const unsubscribe = subscribeDebugLog(() => {
      calls++
    })
    appendLogEntry('console.error', 'boom')
    clearDebugLog()
    expect(calls).toBe(2)
    unsubscribe()
    appendLogEntry('console.error', 'after unsubscribe')
    expect(calls).toBe(2)
  })

  describe('installGlobalErrorLogging', () => {
    it('filters Firestore WebChannel reconnect noise out of the ring buffer, but still captures other warnings', () => {
      installGlobalErrorLogging()
      console.warn(
        "@firebase/firestore: Firestore (12.19.0): WebChannelConnection RPC 'Listen' stream 0x259d6bcc transport errored. Name:  Message: ",
      )
      console.warn('a real warning worth keeping')
      const log = getDebugLogSnapshot()
      expect(log).toHaveLength(1)
      expect(log[0].message).toBe('a real warning worth keeping')
    })
  })

  describe('formatDebugLogForSharing', () => {
    it('describes an empty log in Hebrew', () => {
      expect(formatDebugLogForSharing([])).toBe('(אין רשומות ביומן)')
    })

    it('formats entries as one line each', () => {
      const text = formatDebugLogForSharing([
        { timestamp: 't1', source: 'console.error', message: 'boom' },
        { timestamp: 't2', source: 'unhandledrejection', message: 'oops' },
      ])
      expect(text).toBe('[t1] [console.error] boom\n[t2] [unhandledrejection] oops')
    })
  })
})
