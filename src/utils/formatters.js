/**
 * formatters.js — Shared formatting helpers
 */

/** Format a number as Indian Rupees: ₹1,23,456 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Format a date string or Date object as "24 Nov 2026" */
export function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/** Format a date as "24/11/2026" */
export function formatDateShort(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

/** Format a phone number for display */
export function formatPhone(phone) {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  return phone
}

/** Return today's date as YYYY-MM-DD */
export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

/** Check if a date string is today */
export function isToday(dateStr) {
  return dateStr?.split('T')[0] === todayISO()
}

/** Return first day of current month as YYYY-MM-DD */
export function startOfMonthISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

