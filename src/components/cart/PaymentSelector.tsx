import type { Creator } from '../../types/creator'
import type { PaymentMethod } from '../../types/paymentMethod'

const OTHER_VALUE = '__other__'

interface PaymentSelectorProps {
  paymentMethods: PaymentMethod[]
  paymentMethodId: string
  creators: Creator[]
  receiver: string
  isCustomReceiver: boolean
  onPaymentMethodChange: (id: string) => void
  onReceiverChange: (name: string, isCustom: boolean) => void
  onSubmit?: () => void
}

export function PaymentSelector({
  paymentMethods,
  paymentMethodId,
  creators,
  receiver,
  isCustomReceiver,
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

  const selectedCreator = creators.find((creator) => creator.name === receiver)
  const receiverSelectValue = isCustomReceiver ? OTHER_VALUE : (selectedCreator?.id ?? '')

  function handleReceiverSelectChange(value: string) {
    if (value === OTHER_VALUE) {
      onReceiverChange('', true)
      return
    }
    if (value === '') {
      onReceiverChange('', false)
      return
    }
    const creator = creators.find((entry) => entry.id === value)
    onReceiverChange(creator?.name ?? '', false)
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
          value={receiverSelectValue}
          onChange={(e) => handleReceiverSelectChange(e.target.value)}
          className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
        >
          <option value="">בחירה...</option>
          {creators.map((creator) => (
            <option key={creator.id} value={creator.id}>
              {creator.name}
            </option>
          ))}
          <option value={OTHER_VALUE}>אחר...</option>
        </select>
        {isCustomReceiver && (
          <input
            type="text"
            value={receiver}
            onChange={(e) => onReceiverChange(e.target.value, true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSubmit?.()
              }
            }}
            placeholder="שם מי שקיבל/ה את התשלום"
            autoFocus
            className="mt-1 w-full rounded border border-line-strong px-2 py-2 text-sm"
          />
        )}
      </div>
    </div>
  )
}
