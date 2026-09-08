export interface Category {
  id: string
  name: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface CatalogItem {
  id: string
  categoryId: string
  name: string
  price: number
  order: number
  active: boolean
  createdAt: string
  updatedAt: string
}
