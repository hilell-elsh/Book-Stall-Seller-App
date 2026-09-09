import { useState } from 'react'
import type { SaleRecord } from '../../types/sale'
import { RecordDetails } from './RecordDetails'
import { RecordEditor } from './RecordEditor'

interface RecordPanelProps {
  record: SaleRecord
  onClose: () => void
}

export function RecordPanel({ record, onClose }: RecordPanelProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  if (mode === 'edit') {
    return <RecordEditor record={record} onDone={() => setMode('view')} />
  }

  return <RecordDetails record={record} onEdit={() => setMode('edit')} onClose={onClose} />
}
