export interface Category {
  id: string
  name: string
  order: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface CreatorShare {
  creatorId: string
  percentage: number
}

export interface CatalogItem {
  id: string
  categoryId: string
  name: string
  price: number
  order: number
  active: boolean
  labelIds: string[]
  creatorShares: CreatorShare[]
  createdAt: string
  updatedAt: string
  deletedAt?: string
}
