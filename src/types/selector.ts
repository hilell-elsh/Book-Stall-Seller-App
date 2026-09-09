export type ItemSelector =
  | { type: 'filter'; categoryIds: string[]; labelIds: string[]; creatorIds: string[] }
  | { type: 'item'; itemIds: string[] }
