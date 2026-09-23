import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

// Sync is additive, never blocking (cross-cutting principle 3): every var
// below is optional, and the app must run exactly as Phase 1 (local-only)
// when they're absent — e.g. the offline single-file builds, or before this
// device's stall has a Firebase project configured at all.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const stallEmail: string | undefined = import.meta.env.VITE_STALL_EMAIL

export const isSyncConfigured = Boolean(
  config.apiKey && config.projectId && config.appId && stallEmail,
)

let app: FirebaseApp | undefined
let db: Firestore | undefined
let auth: Auth | undefined

function ensureInitialized(): void {
  if (!isSyncConfigured) {
    throw new Error('Firebase sync is not configured (missing VITE_FIREBASE_*/VITE_STALL_EMAIL env vars)')
  }
  if (app) return
  app = initializeApp(config)
  // Firestore's own offline write-queue/cache is the mechanism the Phase 2
  // plan leans on instead of hand-building one; multi-tab manager keeps it
  // consistent if the stall ever has two tabs open on one device. But
  // persistentLocalCache needs IndexedDB, which throws synchronously on some
  // mobile browsers under an opaque file:// origin (offline single-file
  // builds opened directly from disk) — per "sync is additive, never
  // blocking" above, that has to degrade to a non-persistent Firestore
  // instance (still works over the network, just no offline queueing/
  // multi-tab coordination), not crash the whole app.
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch (err) {
    console.error('Firestore persistent cache unavailable, falling back to in-memory cache:', err)
    db = initializeFirestore(app, {})
  }
  auth = getAuth(app)
}

export function getDb(): Firestore {
  ensureInitialized()
  return db!
}

export function getFirebaseAuth(): Auth {
  ensureInitialized()
  return auth!
}
