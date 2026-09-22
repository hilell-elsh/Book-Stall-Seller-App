import { useAppData } from '../../context/AppDataContext'
import { useShiftSeller } from '../../hooks/useShiftSeller'

// Private, device-local — sets who this device defaults the sale page's
// receiver field to (see domain/shiftSeller.ts). Lives on the Settings page
// (not the Sale page itself) so picking it happens once per shift, before
// selling starts, rather than fighting with an in-progress sale's fields.
export function ShiftSellerSettings() {
  const { creators } = useAppData()
  const { shiftSeller, setShiftSeller, clearShiftSeller } = useShiftSeller()

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">מי מוכר/ת עכשיו</h2>
      <p className="mt-1 text-sm text-faint">
        קובע ברירת מחדל לשדה "מקבל/ת התשלום" במכירה חדשה, במכשיר הזה בלבד. אפשר לשנות אותו לכל מכירה בנפרד.
      </p>
      {creators.length === 0 ? (
        <p className="mt-2 text-sm text-faint">יש להוסיף קודם יוצרים במסך "יוצרים".</p>
      ) : (
        <select
          value={shiftSeller?.creatorId ?? ''}
          onChange={(e) => (e.target.value ? setShiftSeller(e.target.value) : clearShiftSeller())}
          className="mt-2 w-full rounded border border-line-strong px-2 py-2 text-sm"
        >
          <option value="">לא נבחר</option>
          {creators.map((creator) => (
            <option key={creator.id} value={creator.id}>
              {creator.name}
            </option>
          ))}
        </select>
      )}
    </section>
  )
}
