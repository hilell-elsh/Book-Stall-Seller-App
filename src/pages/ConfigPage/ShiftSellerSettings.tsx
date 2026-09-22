import { useShiftSeller } from '../../hooks/useShiftSeller'

// Private, device-local — sets who this device defaults the sale page's
// receiver field to (see domain/shiftSeller.ts). Plain free text, not a
// Creator reference: whoever's minding the till for a shift isn't
// necessarily in the `creators` revenue-share roster. Lives on the Settings
// page (not the Sale page itself) so picking it happens once per shift,
// before selling starts, rather than fighting with an in-progress sale.
export function ShiftSellerSettings() {
  const { shiftSeller, setShiftSeller, clearShiftSeller } = useShiftSeller()

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">מי מוכר/ת עכשיו</h2>
      <p className="mt-1 text-sm text-faint">
        קובע ברירת מחדל לשדה "מקבל/ת התשלום" במכירה חדשה, במכשיר הזה בלבד. אפשר לשנות אותו לכל מכירה בנפרד.
      </p>
      <input
        type="text"
        defaultValue={shiftSeller?.name ?? ''}
        onBlur={(e) => {
          const trimmed = e.target.value.trim()
          if (trimmed === (shiftSeller?.name ?? '')) return
          if (trimmed === '') clearShiftSeller()
          else setShiftSeller(trimmed)
        }}
        placeholder="שם מי שמוכר/ת עכשיו"
        className="mt-2 w-full rounded border border-line-strong px-2 py-2 text-sm"
      />
    </section>
  )
}
