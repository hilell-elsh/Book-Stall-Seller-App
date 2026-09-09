import type { Category, CatalogItem } from '../../types/catalog'
import type { Creator } from '../../types/creator'
import type { Label } from '../../types/label'
import type { ItemSelector } from '../../types/selector'

interface TargetPickerProps {
  categories: Category[]
  labels: Label[]
  creators: Creator[]
  items: CatalogItem[]
  value: ItemSelector
  onChange: (next: ItemSelector) => void
}

function toggleInArray(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]
}

export function TargetPicker({ categories, labels, creators, items, value, onChange }: TargetPickerProps) {
  return (
    <div className="space-y-2">
      <select
        value={value.type}
        onChange={(e) => {
          const type = e.target.value as ItemSelector['type']
          if (type === 'filter') onChange({ type, categoryIds: [], labelIds: [], creatorIds: [] })
          else onChange({ type, itemIds: [] })
        }}
        className="w-full rounded border border-line-strong px-2 py-2 text-sm"
      >
        <option value="filter">קטגוריה, תווית ו/או יוצר</option>
        <option value="item">פריט ספציפי</option>
      </select>

      {value.type === 'filter' && (
        <>
          <div>
            <span className="block text-xs text-muted">קטגוריה (אופציונלי)</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-1 rounded border border-line-strong px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={value.categoryIds.includes(category.id)}
                    onChange={() =>
                      onChange({
                        ...value,
                        categoryIds: toggleInArray(value.categoryIds, category.id),
                      })
                    }
                  />
                  {category.name}
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-faint">אין עדיין קטגוריות.</p>
              )}
            </div>
          </div>
          <div>
            <span className="block text-xs text-muted">תווית (אופציונלי)</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {labels.map((label) => (
                <label
                  key={label.id}
                  className="flex items-center gap-1 rounded border border-line-strong px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={value.labelIds.includes(label.id)}
                    onChange={() =>
                      onChange({ ...value, labelIds: toggleInArray(value.labelIds, label.id) })
                    }
                  />
                  {label.name}
                </label>
              ))}
              {labels.length === 0 && <p className="text-sm text-faint">אין עדיין תוויות.</p>}
            </div>
          </div>
          <div>
            <span className="block text-xs text-muted">יוצר (אופציונלי)</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {creators.map((creator) => (
                <label
                  key={creator.id}
                  className="flex items-center gap-1 rounded border border-line-strong px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={value.creatorIds.includes(creator.id)}
                    onChange={() =>
                      onChange({
                        ...value,
                        creatorIds: toggleInArray(value.creatorIds, creator.id),
                      })
                    }
                  />
                  {creator.name}
                </label>
              ))}
              {creators.length === 0 && <p className="text-sm text-faint">אין עדיין יוצרים.</p>}
            </div>
          </div>
        </>
      )}

      {value.type === 'item' && (
        <div className="space-y-2">
          {categories.map((category) => {
            const categoryItems = items.filter((item) => item.categoryId === category.id)
            if (categoryItems.length === 0) return null
            return (
              <div key={category.id}>
                <span className="text-xs text-muted">{category.name}</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {categoryItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-1 rounded border border-line-strong px-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={value.itemIds.includes(item.id)}
                        onChange={() =>
                          onChange({ type: 'item', itemIds: toggleInArray(value.itemIds, item.id) })
                        }
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
          {items.length === 0 && <p className="text-sm text-faint">אין עדיין פריטים.</p>}
        </div>
      )}
    </div>
  )
}
