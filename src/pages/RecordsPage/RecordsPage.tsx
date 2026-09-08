import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { RecordEditor } from './RecordEditor'
import { RecordList } from './RecordList'

export function RecordsPage() {
  const { saleRecords } = useAppData()
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingRecord = saleRecords.find((record) => record.id === editingId) ?? null

  if (editingRecord) {
    return <RecordEditor record={editingRecord} onClose={() => setEditingId(null)} />
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">רשומות</h1>
      <div className="mt-3">
        <RecordList records={saleRecords} onSelect={(record) => setEditingId(record.id)} />
      </div>
    </div>
  )
}
