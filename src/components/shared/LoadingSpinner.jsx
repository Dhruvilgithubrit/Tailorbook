export default function LoadingSpinner({ size = 'md' }) {
  const s = { sm: 'h-4 w-4 border-2', md: 'h-7 w-7 border-2', lg: 'h-10 w-10 border-3' }[size]
  return (
    <div className="flex items-center justify-center py-12">
      <div className={`animate-spin rounded-full border-[#4F46E5] border-t-transparent ${s}`} />
    </div>
  )
}
