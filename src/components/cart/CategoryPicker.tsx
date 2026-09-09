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
        className={`flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-medium ${
          activeCategoryId === ''
            ? 'border-accent-600 bg-accent-600 text-white'
            : 'border-line-strong text-ink transition-colors hover:bg-subtle'
        }`}
      >
        הכל
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          className={`flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-medium ${
            category.id === activeCategoryId
              ? 'border-accent-600 bg-accent-600 text-white'
              : 'border-line-strong text-ink transition-colors hover:bg-subtle'
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
