import { Money } from '../../components/Money'
import { useAppData } from '../../context/AppDataContext'
import type { SaleRecord } from '../../types/sale'

interface RecordListProps {
  records: SaleRecord[]
  onSelect: (record: SaleRecord) => void
}

const dateFormatter = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' })

export function RecordList({ records, onSelect }: RecordListProps) {
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
        const details = [`${itemCount} פריטים`, paymentMethodName, record.receiver].filter(
          Boolean,
        )
        return (
          <li key={record.id}>
            <button
              type="button"
              onClick={() => onSelect(record)}
              className="flex w-full items-center justify-between p-3 text-start"
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
          </li>
        )
      })}
    </ul>
  )
}
