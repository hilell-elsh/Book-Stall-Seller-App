import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { downloadCsv } from '../../domain/csv'
import { buildPaymentReportRows, buildSalesCsvRows, eventNamesFromRecords, recordsForEvent } from '../../domain/reports'

export function EventExport() {
  const { saleRecords, paymentMethods } = useAppData()
  const eventNames = eventNamesFromRecords(saleRecords)
  const [selected, setSelected] = useState(eventNames[0] ?? '')

  if (eventNames.length === 0) return null

  const eventName = eventNames.includes(selected) ? selected : eventNames[0]
  const records = recordsForEvent(saleRecords, eventName)
  const label = eventName || 'ללא אירוע'

  function handleExportSales() {
    downloadCsv(`מכירות - ${label}.csv`, buildSalesCsvRows(records, paymentMethods))
  }

  function handleExportPayments() {
    downloadCsv(`דוח תשלומים - ${label}.csv`, buildPaymentReportRows(records, paymentMethods))
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">ייצוא דוחות</h2>

      <label className="mt-2 block text-sm text-muted">
        אירוע
        <select
          value={eventName}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-1 block w-full rounded border border-line-strong px-2 py-2 text-sm"
        >
          {eventNames.map((name) => (
            <option key={name} value={name}>
              {name || 'ללא אירוע'}
            </option>
          ))}
        </select>
      </label>

      <p className="mt-2 text-xs text-faint">{records.length} מכירות באירוע זה</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExportSales}
          disabled={records.length === 0}
          className="flex min-h-11 items-center rounded border border-line-strong px-3 text-sm font-medium transition-colors hover:bg-subtle disabled:opacity-50"
        >
          ייצוא מכירות (CSV)
        </button>
        <button
          type="button"
          onClick={handleExportPayments}
          disabled={records.length === 0}
          className="flex min-h-11 items-center rounded border border-line-strong px-3 text-sm font-medium transition-colors hover:bg-subtle disabled:opacity-50"
        >
          ייצוא דוח תשלומים (CSV)
        </button>
      </div>
    </section>
  )
}
