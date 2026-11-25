import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Layers, LogOut, Settings, ShoppingBag, Users } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/fabrics', label: 'Fabrics', icon: Layers },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Navbar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-[#E5E3DE] bg-white">
      <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <NavLink to="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5] text-base font-bold text-white">
            T
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-base font-bold text-[#111827]">TailorBook</span>
            <span className="block max-w-36 truncate text-[11px] text-[#6B7280]">
              {profile?.shop_name || 'Tailor Shop'}
            </span>
          </span>
        </NavLink>

        <nav aria-label="Main navigation" className="hidden h-full items-center gap-7 md:flex">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-full items-center border-b-2 pt-0.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-[#4F46E5] text-[#111827]'
                    : 'border-transparent text-[#6B7280] hover:text-[#111827]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden text-right leading-tight sm:block">
            <p className="max-w-40 truncate text-sm font-medium text-[#111827]">
              {profile?.owner_name || profile?.email?.split('@')[0] || 'Tailor'}
            </p>
            <p className="text-[11px] text-[#6B7280]">Shop Owner</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F8F7F4] hover:text-[#111827]"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
