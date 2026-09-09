import { Money } from '../../components/Money'
import { useAppData } from '../../context/AppDataContext'
import type { SaleRecord } from '../../types/sale'
import { RecordPanel } from './RecordPanel'

interface RecordListProps {
  records: SaleRecord[]
  expandedId: string | null
  onToggle: (id: string) => void
  onCloseExpanded: () => void
}

const dateFormatter = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' })

export function RecordList({ records, expandedId, onToggle, onCloseExpanded }: RecordListProps) {
  const { paymentMethods } = useAppData()
  const paymentMethodById = new Map(paymentMethods.map((method) => [method.id, method]))
  const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  if (sorted.length === 0) {
    return <p className="text-sm text-faint">אין עדיין מכירות שמורות.</p>
  }

  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {sorted.map((record) => {
        const itemCount = record.lines.reduce((sum, line) => sum + line.qty, 0)
        const paymentMethodName = record.paymentMethodId
          ? paymentMethodById.get(record.paymentMethodId)?.name
          : undefined
        const details = [
          `${itemCount} פריטים`,
          paymentMethodName,
          record.receiver,
          record.eventName,
        ].filter(Boolean)
        const isExpanded = record.id === expandedId
        return (
          <li key={record.id}>
            <button
              type="button"
              onClick={() => onToggle(record.id)}
              className="flex w-full items-center justify-between p-3 text-start transition-colors hover:bg-subtle"
            >
              <div>
                <p className="text-sm font-medium">
                  {dateFormatter.format(new Date(record.createdAt))}
                </p>
                <p className="text-xs text-muted">{details.join(' · ')}</p>
              </div>
              <span className="text-base font-semibold">
                <Money amount={record.total} />
              </span>
            </button>
            {isExpanded && (
              <div className="border-t border-line">
                <RecordPanel record={record} onClose={onCloseExpanded} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
