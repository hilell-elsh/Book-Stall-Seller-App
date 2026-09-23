import { newId } from '../domain/ids'
import * as store from '../data/store'
import type { Category, CatalogItem } from '../types/catalog'
import type { Creator } from '../types/creator'
import type { Label } from '../types/label'
import type { PaymentMethod } from '../types/paymentMethod'

// Fills an empty store with a small, realistic catalog so testers can try
// the selling flow (browse, add to cart, discounts, payment) without first
// setting up categories/items/labels/creators/payment methods themselves.
// Never touches a store that already has data (see seedDemoDataIfEmpty).
export function seedDemoDataIfEmpty(): void {
  if (store.getCategories().length > 0) return

  const now = new Date().toISOString()

  const categories: Category[] = [
    { id: newId(), name: 'ספרי ילדים', order: 0, createdAt: now, updatedAt: now },
    { id: newId(), name: 'רומנים', order: 1, createdAt: now, updatedAt: now },
    { id: newId(), name: 'עיון', order: 2, createdAt: now, updatedAt: now },
  ]
  const [kidsCategory, novelsCategory, nonfictionCategory] = categories

  const labels: Label[] = [
    { id: newId(), name: 'מבצע', createdAt: now, updatedAt: now },
    { id: newId(), name: 'חדש', createdAt: now, updatedAt: now },
  ]
  const [saleLabel, newLabel] = labels

  const creators: Creator[] = [
    { id: newId(), name: 'נועה כהן', createdAt: now, updatedAt: now },
    { id: newId(), name: 'איתי לוי', createdAt: now, updatedAt: now },
    { id: newId(), name: 'מאיה בר', createdAt: now, updatedAt: now },
  ]
  const [noa, itay, maya] = creators

  const paymentMethods: PaymentMethod[] = [
    { id: newId(), name: 'מזומן', createdAt: now, updatedAt: now },
    { id: newId(), name: 'ביט', createdAt: now, updatedAt: now },
    { id: newId(), name: 'אשראי', createdAt: now, updatedAt: now },
  ]

  const items: CatalogItem[] = [
    {
      id: newId(),
      categoryId: kidsCategory.id,
      name: 'הנסיכה הקטנה',
      price: 42,
      order: 0,
      active: true,
      labelIds: [saleLabel.id],
      creatorShares: [{ creatorId: noa.id, percentage: 100 }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId(),
      categoryId: kidsCategory.id,
      name: 'דינוזאורים לילדים',
      price: 38,
      order: 1,
      active: true,
      labelIds: [],
      creatorShares: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId(),
      categoryId: novelsCategory.id,
      name: 'אהבה בשנות העשרים',
      price: 68,
      order: 0,
      active: true,
      labelIds: [newLabel.id],
      creatorShares: [
        { creatorId: itay.id, percentage: 60 },
        { creatorId: maya.id, percentage: 40 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId(),
      categoryId: novelsCategory.id,
      name: 'לילה בירושלים',
      price: 54,
      order: 1,
      active: true,
      labelIds: [],
      creatorShares: [{ creatorId: itay.id, percentage: 100 }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId(),
      categoryId: nonfictionCategory.id,
      name: 'היסטוריה של הקפה',
      price: 76,
      order: 0,
      active: true,
      labelIds: [newLabel.id, saleLabel.id],
      creatorShares: [{ creatorId: maya.id, percentage: 100 }],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId(),
      categoryId: nonfictionCategory.id,
      name: 'מדריך לצילום',
      price: 89,
      order: 1,
      active: true,
      labelIds: [],
      creatorShares: [],
      createdAt: now,
      updatedAt: now,
    },
  ]

  store.saveCategories(categories)
  store.saveLabels(labels)
  store.saveCreators(creators)
  store.savePaymentMethods(paymentMethods)
  store.saveItems(items)
  store.saveEventName({ name: 'יריד ניסיון (דמו)', updatedAt: now })
}
