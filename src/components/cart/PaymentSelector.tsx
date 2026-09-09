import type { PaymentMethod } from '../../types/paymentMethod'

interface PaymentSelectorProps {
  paymentMethods: PaymentMethod[]
  paymentMethodId: string
  receiver: string
  onPaymentMethodChange: (id: string) => void
  onReceiverChange: (name: string) => void
  onSubmit?: () => void
}

export function PaymentSelector({
  paymentMethods,
  paymentMethodId,
  receiver,
  onPaymentMethodChange,
  onReceiverChange,
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
        <input
          type="text"
          value={receiver}
          onChange={(e) => onReceiverChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit?.()
            }
          }}
          placeholder="שם מי שקיבל/ה את התשלום"
          className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
        />
      </div>
    </div>
  )
}
