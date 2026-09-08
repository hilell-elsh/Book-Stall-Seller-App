import { useAppData } from '../../context/AppDataContext'

export function SellerSettings() {
  const { sellerName, setSellerName } = useAppData()

  return (
    <section>
      <h2 className="text-base font-semibold">השם שלך</h2>
      <p className="mt-1 text-xs text-gray-500">
        יישמר על כל מכירה שתתועד במכשיר הזה.
      </p>
      <input
        type="text"
        defaultValue={sellerName}
        onBlur={(e) => setSellerName(e.target.value.trim())}
        placeholder="לדוגמה: דנה"
        className="mt-2 w-full rounded border border-gray-300 px-2 py-2 text-sm"
      />
    </section>
  )
}
