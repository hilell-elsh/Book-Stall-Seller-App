import type { Category, CatalogItem } from '../types/catalog'
import { readJSON, writeJSON } from './localStorageDriver'

const CATEGORIES_KEY = 'categories'
const ITEMS_KEY = 'items'

export function getCategories(): Category[] {
  return readJSON<Category[]>(CATEGORIES_KEY, [])
}

export function saveCategories(categories: Category[]): void {
  writeJSON(CATEGORIES_KEY, categories)
}

export function getItems(): CatalogItem[] {
  return readJSON<CatalogItem[]>(ITEMS_KEY, [])
}

export function saveItems(items: CatalogItem[]): void {
  writeJSON(ITEMS_KEY, items)
}
