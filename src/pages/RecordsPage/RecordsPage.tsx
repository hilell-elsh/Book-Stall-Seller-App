import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { EventExport } from './EventExport'
import { RecordList } from './RecordList'

export function RecordsPage() {
  const { saleRecords } = useAppData()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-lg font-semibold">רשומות</h1>
      <div className="mt-3">
        <EventExport />
      </div>
      <div className="mt-3">
        <RecordList
          records={saleRecords}
          expandedId={expandedId}
          onToggle={handleToggle}
          onCloseExpanded={() => setExpandedId(null)}
        />
      </div>
    </div>
  )
}
