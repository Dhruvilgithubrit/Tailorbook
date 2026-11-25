import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/fabrics':   'Fabrics',
  '/orders':    'Orders',
  '/orders/new':'New Order',
  '/settings':  'Settings',
}

export default function Header() {
  const { pathname } = useLocation()

  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith('/customers/') ? 'Customer Profile' : '') ??
    (pathname.startsWith('/orders/') ? 'Order Detail' : '') ??
    'TailorBook'

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-[#1A1A2E] border-b border-[#2D2D4E]/40 px-4 py-3 flex items-center justify-between">
      <span className="font-playfair text-lg font-bold text-white tracking-wide">
        TailorBook
      </span>
      <span className="text-xs font-medium text-[#A0A0B0]">{title}</span>
    </header>
  )
}
