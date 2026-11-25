import React from 'react'

export default function StockBadge({ stock }) {
  let label, style

  if (stock >= 10) {
    label = 'In Stock'
    style = 'bg-green-100 text-green-700'
  } else if (stock >= 3) {
    label = 'Low Stock'
    style = 'bg-yellow-100 text-yellow-700'
  } else {
    label = 'Critical'
    style = 'bg-red-100 text-red-700'
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {label}
    </span>
  )
}
