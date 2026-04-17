export function toLocalDateYmd(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function shiftLocalDateYmd(baseDate: Date, offsetDays: number): string {
  const d = new Date(baseDate)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return toLocalDateYmd(d)
}
