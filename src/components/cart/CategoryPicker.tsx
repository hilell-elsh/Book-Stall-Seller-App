import type { Category } from '../../types/catalog'

interface CategoryPickerProps {
  categories: Category[]
  activeCategoryId: string
  onSelect: (categoryId: string) => void
}

export function CategoryPicker({ categories, activeCategoryId, onSelect }: CategoryPickerProps) {
  return (
    <div className="flex gap-2 overflow-x-auto p-3">
      <button
        type="button"
        onClick={() => onSelect('')}
        className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
          activeCategoryId === ''
            ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-gray-300 text-gray-700'
        }`}
      >
        הכל
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
            category.id === activeCategoryId
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-gray-300 text-gray-700'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
