import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { getDb } from './firebaseConfig'

// Thin adapter over the Firestore SDK, kept deliberately small so a later
// backend migration (Supabase/custom server) doesn't mean ripping out every
// call site — see the Phase 2 plan's backend-choice discussion.
//
// Task 11 scope only: bulk push/pull of a whole entity collection, for the
// one-off manual "push all local data" debug action and its readback check.
// Per-op incremental sync through the outbox is Task 12/13/14's job.

const FIRESTORE_BATCH_LIMIT = 500

export async function pushAll<T extends { id: string }>(entity: string, rows: T[]): Promise<void> {
  const db = getDb()
  for (let start = 0; start < rows.length; start += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const row of rows.slice(start, start + FIRESTORE_BATCH_LIMIT)) {
      batch.set(doc(db, entity, row.id), row)
    }
    await batch.commit()
  }
}

export async function pullAll<T>(entity: string): Promise<T[]> {
  const db = getDb()
  const snapshot = await getDocs(collection(db, entity))
  return snapshot.docs.map((docSnapshot) => docSnapshot.data() as T)
}
