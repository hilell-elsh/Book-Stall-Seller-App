import type { Creator } from '../../types/creator'
import type { PaymentMethod } from '../../types/paymentMethod'

export const OTHER_RECEIVER = '__other__'

interface PaymentSelectorProps {
  paymentMethods: PaymentMethod[]
  paymentMethodId: string
  creators: Creator[]
  receiverSelection: string
  receiverOther: string
  onPaymentMethodChange: (id: string) => void
  onReceiverSelectionChange: (value: string) => void
  onReceiverOtherChange: (value: string) => void
  onSubmit?: () => void
}

export function PaymentSelector({
  paymentMethods,
  paymentMethodId,
  creators,
  receiverSelection,
  receiverOther,
  onPaymentMethodChange,
  onReceiverSelectionChange,
  onReceiverOtherChange,
  onSubmit,
}: PaymentSelectorProps) {
  if (paymentMethods.length === 0) {
    return (
      <p className="p-3 text-sm text-faint">
        יש להגדיר אמצעי תשלום במסך ההגדרות לפני שמירת מכירה.
      </p>
    )
  }

  return (
    <div className="space-y-2 p-3">
      <div>
        <label className="block text-sm text-muted">אמצעי תשלום</label>
        <select
          value={paymentMethodId}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
        >
          <option value="">בחירה...</option>
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-muted">מקבל/ת התשלום</label>
        <select
          value={receiverSelection}
          onChange={(e) => onReceiverSelectionChange(e.target.value)}
          className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
        >
          <option value="">בחירה...</option>
          {creators.map((creator) => (
            <option key={creator.id} value={creator.name}>
              {creator.name}
            </option>
          ))}
          <option value={OTHER_RECEIVER}>אחר...</option>
        </select>
        {receiverSelection === OTHER_RECEIVER && (
          <input
            type="text"
            value={receiverOther}
            onChange={(e) => onReceiverOtherChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSubmit?.()
              }
            }}
            placeholder="שם מי שקיבל/ה את התשלום"
            className="mt-2 w-full rounded border border-line-strong px-2 py-2 text-sm"
          />
        )}
      </div>
    </div>
  )
}
