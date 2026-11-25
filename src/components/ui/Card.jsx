export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-[#E5E3DE] p-5 ${
        onClick ? 'cursor-pointer hover:border-[#D1CECA] transition-colors' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
