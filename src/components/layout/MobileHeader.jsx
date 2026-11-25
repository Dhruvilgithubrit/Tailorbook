import { useLocation } from 'react-router-dom'

const PAGE_TITLES = [
  ['/dashboard', 'Dashboard'],
  ['/customers', 'Customers'],
  ['/orders/new', 'New Order'],
  ['/orders', 'Orders'],
  ['/fabrics', 'Fabrics'],
  ['/settings', 'Settings'],
]

export default function MobileHeader() {
  const { pathname } = useLocation()
  const isCustomerDetail = pathname.startsWith('/customers/')
  const isOrderDetail = pathname.startsWith('/orders/') && pathname !== '/orders/new'
  const title = isCustomerDetail
    ? 'Customer Details'
    : isOrderDetail
      ? 'Order Details'
      : PAGE_TITLES.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] ||
        'TailorBook'

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-[#E5E3DE] bg-white px-4 md:hidden">
      <h1 className="truncate text-lg font-bold text-[#111827]">{title}</h1>
    </header>
  )
}
