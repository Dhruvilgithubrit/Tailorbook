const statusStyles = {
  Received: 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]',
  Cutting: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE]',
  'First Fitting': 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  Alteration: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]',
  Ready: 'bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]',
  Delivered: 'bg-[#374151] text-white border-[#374151]',
}

export default function Badge({ status, className = '' }) {
  const norm = status ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') : 'Received'
  const style = statusStyles[norm] || 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]'

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${style} ${className}`}
    >
      {norm}
    </span>
  )
}
