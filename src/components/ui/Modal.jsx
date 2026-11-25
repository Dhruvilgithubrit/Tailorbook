import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#111827]/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Card Panel */}
      <div
        className={`relative w-full ${maxWidth} z-10 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[20px] rounded-b-none border border-[#E5E3DE] bg-white pb-[env(safe-area-inset-bottom)] md:max-h-[90vh] md:rounded-lg md:pb-0`}
      >
        <div className="mx-auto mt-2.5 mb-0 h-1 w-10 shrink-0 rounded-full bg-[#D1D5DB] md:hidden" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E3DE]">
          <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F8F7F4] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
