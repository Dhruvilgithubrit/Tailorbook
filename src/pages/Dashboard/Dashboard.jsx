import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { formatCurrency, formatDate, todayISO } from '../../utils/formatters'
import {
  fetchShopFabrics,
  fetchShopOrders,
  getCachedShopData,
} from '../../lib/shopData'
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Clock3,
  Layers,
  Package,
  Plus,
  Scissors,
  Wallet,
} from 'lucide-react'
import Button from '../../components/ui/Button'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getOrderTotal(order) {
  return (order.order_items ?? []).reduce(
    (sum, item) =>
      sum + (parseFloat(item.total_price) || parseFloat(item.stitching_price) || 0),
    0
  )
}

function getItemsLabel(order) {
  const itemTypes = (order.order_items ?? []).map((item) => item.item_type).filter(Boolean)
  return itemTypes.length ? itemTypes.join(', ') : 'Custom Order'
}

export default function Dashboard() {
  const { session, profile } = useAuth()
  const tailorId = session?.user?.id || profile?.id

  const [stats, setStats] = useState({
    dueToday: 0,
    lowStock: 0,
    pendingOrders: 0,
    todaysRevenue: 0,
    cashCollected: 0,
    pendingPayments: 0,
    inProgress: 0,
  })
  const [dueOrders, setDueOrders] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(() => !(
    getCachedShopData('orders', tailorId) && getCachedShopData('fabrics', tailorId)
  ))

  const today = todayISO()
  const formattedTodayDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  useEffect(() => {
    if (!tailorId) return

    let isMounted = true

    async function loadDashboardData() {
      try {
        const [allOrders, fabrics] = await Promise.all([
          fetchShopOrders(tailorId),
          fetchShopFabrics(tailorId),
        ])

        if (!isMounted) return

        const dueList = allOrders
          .filter((order) =>
            order.delivery_date === today && !['delivered'].includes((order.status || '').toLowerCase())
          )
          .slice(0, 20)
        const activeProductionStages = new Set(['cutting', 'first_fitting', 'alteration', 'ready'])

        let inProgressCount = 0
        let todaysRevenue = 0
        let cashCollected = 0
        let pendingPayments = 0
        let pendingOrders = 0

        for (const order of allOrders) {
          const status = (order.status || '').toLowerCase()
          const total = getOrderTotal(order)
          const advance = parseFloat(order.advance_paid) || 0
          const remaining = Math.max(0, total - advance)

          if (activeProductionStages.has(status)) inProgressCount++
          if (order.created_at?.slice(0, 10) === today) {
            todaysRevenue += total
            if ((order.payment_mode || '').toLowerCase() === 'cash') cashCollected += advance
          }
          if (status !== 'delivered') {
            pendingPayments += remaining
            if (remaining > 0) pendingOrders++
          }
        }

        const lowStockCount = fabrics.filter((fabric) => {
          const configuredThreshold = parseFloat(fabric.low_stock_alert_at)
          const threshold = Number.isFinite(configuredThreshold) ? configuredThreshold : 2
          return (parseFloat(fabric.stock_meters) || 0) <= threshold
        }).length

        setStats({
          dueToday: dueList.length,
          lowStock: lowStockCount,
          pendingOrders,
          todaysRevenue,
          cashCollected,
          pendingPayments,
          inProgress: inProgressCount,
        })
        setDueOrders(dueList)
        setRecentOrders(allOrders.slice(0, 5))
      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDashboardData()
    return () => {
      isMounted = false
    }
  }, [tailorId, today])

  if (loading) return <LoadingSpinner />

  const statCards = [
    {
      label: "TODAY'S REVENUE",
      value: formatCurrency(stats.todaysRevenue),
      description: 'Total value of orders created today',
      Icon: Banknote,
      accent: '#4F46E5',
    },
    {
      label: 'CASH',
      value: formatCurrency(stats.cashCollected),
      description: 'Cash advances recorded today',
      Icon: Wallet,
      accent: '#16A34A',
    },
    {
      label: 'PENDING PAYMENTS',
      value: formatCurrency(stats.pendingPayments),
      description: 'Remaining balance on active orders',
      Icon: Clock3,
      accent: '#DC2626',
    },
    {
      label: 'ORDERS IN PROGRESS',
      value: stats.inProgress,
      description: 'In cutting, fitting, alteration, or ready',
      Icon: Scissors,
      accent: '#D97706',
    },
  ]

  const alerts = [
    {
      label: 'Orders Due Today',
      count: stats.dueToday,
      subtitle: 'Scheduled for pickup today',
      to: '/orders',
      Icon: CalendarDays,
      badgeClass: 'bg-[#FEF3C7] text-[#D97706]',
    },
    {
      label: 'Low Stock Fabrics',
      count: stats.lowStock,
      subtitle: 'At or below your stock alert level',
      to: '/fabrics',
      Icon: Layers,
      badgeClass: 'bg-[#FEE2E2] text-[#DC2626]',
    },
    {
      label: 'Pending Payments',
      count: stats.pendingOrders,
      subtitle: 'Orders with a balance due',
      to: '/orders',
      Icon: Wallet,
      badgeClass: 'bg-[#EFF6FF] text-[#2563EB]',
    },
  ]

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-xl border border-[#E5E3DE] bg-[#F5F3FF] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
            {getGreeting()}, {profile?.owner_name || 'Tailor'}
          </p>
          <h1 className="font-playfair mt-2 break-words text-2xl font-semibold leading-tight text-[#111827] sm:text-4xl">
            {profile?.shop_name || 'Your Tailoring Studio'}
          </h1>
          <p className="mt-2 hidden text-[13px] text-[#6B7280] sm:block">{formattedTodayDate}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
          <Link to="/orders/new">
            <Button variant="secondary" className="border-[#4F46E5] text-[#4F46E5]">
              <Plus size={16} />
              <span>New Order</span>
            </Button>
          </Link>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#4F46E5] hover:underline"
          >
            View Orders <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section aria-label="Shop alerts" className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 md:grid md:grid-cols-3 md:overflow-visible">
        {alerts.map(({ label, count, subtitle, to, Icon, badgeClass }) => (
          <div
            key={label}
            className="flex min-w-[240px] shrink-0 items-center gap-3 rounded-[10px] border border-[#E5E3DE] bg-white p-4 md:min-w-0 md:shrink"
          >
            <span className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold ${badgeClass}`}>
              {count}
            </span>
            <Icon size={16} className="shrink-0 text-[#6B7280]" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-[#111827]">{label}</h2>
              <p className="truncate text-xs text-[#6B7280]">{subtitle}</p>
            </div>
            <Link
              to={to}
              className="shrink-0 text-xs font-medium text-[#4F46E5] hover:underline"
            >
              View <span aria-hidden="true">→</span>
            </Link>
          </div>
        ))}
      </section>

      <section aria-label="Shop statistics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {statCards.map(({ label, value, description, Icon, accent }) => (
          <div
            key={label}
            className="rounded-xl border border-[#E5E3DE] border-t-[3px] bg-white p-4 sm:p-6"
            style={{ borderTopColor: accent }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                {label}
              </span>
              <Icon size={16} className="shrink-0 text-[#6B7280]" />
            </div>
            <p className="my-3 break-words text-2xl font-bold leading-tight tracking-tight text-[#111827] sm:my-4 sm:text-3xl">
              {value}
            </p>
            <p className="text-xs text-[#6B7280]">{description}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-5">
        <div className="overflow-hidden rounded-xl border border-[#E5E3DE] bg-white xl:col-span-3">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="text-[#6B7280]" />
              <h2 className="text-sm font-semibold text-[#111827]">Recent Orders</h2>
            </div>
            <Link
              to="/orders"
              className="flex items-center gap-1 text-xs font-medium text-[#4F46E5] hover:underline"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-[#111827]">No recent orders</p>
              <p className="mt-1 text-xs text-[#6B7280]">New customer orders will appear here.</p>
            </div>
          ) : (
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-[#E5E3DE] text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-3 py-3">Items</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DE]">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="text-sm hover:bg-[#F8F7F4]">
                      <td className="px-5 py-3.5">
                        <Link to={`/orders/${order.id}`} className="font-medium text-[#111827] hover:text-[#4F46E5]">
                          {order.customers?.name || 'Customer'}
                        </Link>
                        {order.bill_number && (
                          <span className="ml-1.5 text-[11px] text-[#6B7280]">#{order.bill_number}</span>
                        )}
                      </td>
                      <td className="max-w-40 truncate px-3 py-3.5 text-xs text-[#6B7280]">
                        {getItemsLabel(order)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-right text-xs font-semibold text-[#111827]">
                        {formatCurrency(getOrderTotal(order))}
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge status={order.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs text-[#6B7280]">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {recentOrders.length > 0 && (
            <div className="divide-y divide-[#E5E3DE] md:hidden">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block px-4 py-3.5 active:bg-[#F8F7F4]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-[#111827]">
                      {order.customers?.name || 'Customer'}
                    </span>
                    <span className="shrink-0 text-[11px] text-[#6B7280]">
                      #{order.bill_number || order.id.slice(0, 6).toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[#6B7280]">{getItemsLabel(order)}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Badge status={order.status} />
                    <span className="text-xs font-semibold text-[#111827]">
                      {formatCurrency(getOrderTotal(order))}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#6B7280]">{formatDate(order.created_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#E5E3DE] bg-white xl:col-span-2">
          <div className="flex items-center justify-between border-b border-[#E5E3DE] px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-[#6B7280]" />
              <h2 className="text-sm font-semibold text-[#111827]">Orders Due Today</h2>
            </div>
            <span className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-[#D97706]">
              {dueOrders.length}
            </span>
          </div>

          {dueOrders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Package size={20} className="mx-auto mb-2 text-[#9CA3AF]" />
              <p className="text-sm font-medium text-[#111827]">No orders due today</p>
              <p className="mt-1 text-xs text-[#6B7280]">All scheduled orders are completed or none are due.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E3DE]">
              {dueOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[#F8F7F4]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#111827]">
                      {order.customers?.name || 'Customer'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#6B7280]">{getItemsLabel(order)}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#FEF3C7] px-2 py-1 text-[11px] font-medium text-[#D97706]">
                    Due today
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
