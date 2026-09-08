import type { PaymentMethod } from '../../types/paymentMethod'
import type { Receiver } from '../../types/receiver'

interface PaymentSelectorProps {
  paymentMethods: PaymentMethod[]
  receivers: Receiver[]
  paymentMethodId: string
  receiverId: string
  onPaymentMethodChange: (id: string) => void
  onReceiverChange: (id: string) => void
}

export function PaymentSelector({
  paymentMethods,
  receivers,
  paymentMethodId,
  receiverId,
  onPaymentMethodChange,
  onReceiverChange,
}: PaymentSelectorProps) {
  if (paymentMethods.length === 0 || receivers.length === 0) {
    return (
      <p className="p-3 text-sm text-gray-400">
        יש להגדיר אמצעי תשלום ומקבל/ת תשלום במסך ההגדרות לפני שמירת מכירה.
      </p>
    )
  }

  return (
    <div className="space-y-2 p-3">
      <div>
        <label className="block text-sm text-gray-600">אמצעי תשלום</label>
        <select
          value={paymentMethodId}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
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
        <label className="block text-sm text-gray-600">מקבל/ת התשלום</label>
        <select
          value={receiverId}
          onChange={(e) => onReceiverChange(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm"
        >
          <option value="">בחירה...</option>
          {receivers.map((receiver) => (
            <option key={receiver.id} value={receiver.id}>
              {receiver.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
