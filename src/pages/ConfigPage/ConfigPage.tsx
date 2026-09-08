import { CategoryManager } from './CategoryManager'
import { ItemManager } from './ItemManager'

export function ConfigPage() {
  return (
    <div className="p-4 pb-8">
      <h1 className="text-lg font-semibold">הגדרות</h1>
      <div className="mt-3">
        <CategoryManager />
        <ItemManager />
      </div>
    </div>
  )
}
