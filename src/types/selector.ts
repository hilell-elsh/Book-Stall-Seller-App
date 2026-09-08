export type ItemSelector =
  | { type: 'category'; categoryIds: string[] }
  | { type: 'label'; labelIds: string[] }
  | { type: 'item'; itemIds: string[] }
