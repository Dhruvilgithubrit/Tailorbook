import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, ShoppingBag, Layers, Settings } from 'lucide-react'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/orders',    label: 'Orders',    icon: ShoppingBag },
  { to: '/fabrics',   label: 'Fabrics',   icon: Layers },
  { to: '/settings',  label: 'Settings',  icon: Settings },
]

export default function MobileNav() {
  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#1A1A2E] pb-[env(safe-area-inset-bottom,12px)] md:hidden">
      <div className="flex h-16 items-stretch">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#4F46E5]' : 'text-[#6B7280]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} className={isActive ? 'text-[#4F46E5]' : 'text-[#6B7280]'} />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
