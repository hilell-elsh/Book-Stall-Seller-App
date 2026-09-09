function csvEscape(field: string): string {
  if (/[",\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
}

// Prefix a BOM so Excel opens the UTF-8 (Hebrew) content correctly.
export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = '﻿' + rowsToCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
