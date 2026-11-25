import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-[#4F46E5] text-white hover:bg-[#4338CA] border border-[#4F46E5]',
  secondary: 'bg-white border border-[#4F46E5] text-[#4F46E5] hover:bg-[#F5F3FF]',
  whatsapp: 'bg-[#25D366] text-white border border-[#25D366] hover:bg-[#20BD5A]',
  whatsappOutline: 'bg-white border border-[#25D366] text-[#25D366] hover:bg-[#F0FDF4]',
  danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] border border-[#DC2626]',
  ghost: 'bg-transparent text-[#6B7280] hover:bg-[#F8F7F4] hover:text-[#111827]',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm font-medium',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin text-current" />}
      {children}
    </button>
  )
}
