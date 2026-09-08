const formatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
})

export function Money({ amount }: { amount: number }) {
  return <span>{formatter.format(amount)}</span>
}
