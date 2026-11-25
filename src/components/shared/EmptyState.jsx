export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6 bg-white border border-[#E5E3DE] rounded-lg">
      {Icon && <Icon size={20} className="text-[#9CA3AF] mb-3" />}
      <p className="text-[#111827] font-semibold text-sm">{title}</p>
      {description && <p className="text-[#6B7280] text-xs mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
