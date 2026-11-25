import React, { useRef } from 'react'

export default function ColorPicker({ value = '#4F46E5', onChange }) {
  const inputRef = useRef(null)

  return (
    <div className="flex items-center gap-3">
      {/* Color swatch */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-9 h-9 rounded-lg border border-[#E5E3DE] cursor-pointer transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
        style={{ backgroundColor: value }}
        aria-label="Pick a color"
      />

      {/* Hidden native color input */}
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Hex label */}
      <span className="text-sm text-gray-600 font-mono">{value}</span>
    </div>
  )
}
