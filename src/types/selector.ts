export type ItemSelector =
  | { type: 'filter'; categoryIds: string[]; labelIds: string[] }
  | { type: 'item'; itemIds: string[] }
