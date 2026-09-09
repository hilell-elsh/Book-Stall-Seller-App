import { useAppData } from '../../context/AppDataContext'

export function EventSettings() {
  const { eventName, setEventName } = useAppData()

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">אירוע נוכחי</h2>
      <p className="mt-1 text-sm text-faint">
        שם האירוע (יריד, דוכן וכו') יופיע בכל מכירה שתישמר מעכשיו.
      </p>
      <input
        type="text"
        defaultValue={eventName}
        onBlur={(e) => {
          const trimmed = e.target.value.trim()
          if (trimmed !== eventName) setEventName(trimmed)
        }}
        placeholder="לדוגמה: יריד ספרים חנוכה תשפ״ו"
        className="mt-2 w-full min-w-0 rounded border border-line-strong px-2 py-2 text-sm"
      />
    </section>
  )
}
