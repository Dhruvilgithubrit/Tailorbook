import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Layers,
  Settings,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/orders',    label: 'Orders',    icon: ShoppingBag },
  { to: '/fabrics',   label: 'Fabrics',   icon: Layers },
  { to: '/settings',  label: 'Settings',  icon: Settings },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-[220px] min-h-screen bg-[#1A1A2E] border-r border-[#2D2D4E]/30 shrink-0 select-none">
      {/* Top Header / Branding */}
      <div className="px-5 py-6 border-b border-[#2D2D4E]/50">
        <h1 className="font-playfair text-[20px] font-bold text-white tracking-wide">
          TailorBook
        </h1>
        <p className="text-[11px] text-[#A0A0B0] truncate mt-1">
          {profile?.shop_name || 'Tailor Shop'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${
                isActive
                  ? 'bg-[#2D2D4E] text-white font-medium before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#2563EB] before:rounded-r'
                  : 'text-[#A0A0B0] hover:text-white hover:bg-[#2D2D4E]/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-[#2563EB]' : 'text-[#6B7280]'} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Footer Info & Logout */}
      <div className="px-4 py-4 border-t border-[#2D2D4E]/50 space-y-2">
        <div className="px-2">
          <p className="text-[11px] text-[#A0A0B0] truncate font-medium">
            {profile?.owner_name || profile?.email?.split('@')[0] || 'Master Tailor'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-xs text-[#6B7280] hover:text-white hover:bg-[#2D2D4E]/40 transition-colors"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
