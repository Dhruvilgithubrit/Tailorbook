import { Link } from 'react-router-dom'
import { Plus, ShoppingBag } from 'lucide-react'
import { useOrders } from '../../hooks/useOrders'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import EmptyState from '../../components/shared/EmptyState'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { ORDER_STATUSES } from '../../utils/measurementFields'
import { useState } from 'react'

export default function OrdersList() {
  const { orders, loading } = useOrders()
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = statusFilter === 'All' ? orders : orders.filter((o) => o.status === statusFilter)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div className="hidden items-center justify-between gap-3 sm:flex">
        <h1 className="text-2xl font-semibold text-[#111827]">Orders</h1>
        <Link to="/orders/new" className="ml-auto">
          <Button><Plus size={16} /> New Order</Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:px-0">
        {['All', ...ORDER_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-xs ${
              statusFilter === s ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-white border-[#E5E3DE] text-[#6B7280] hover:border-[#4F46E5]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0
        ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders"
            description="Create your first order."
            action={<Link to="/orders/new"><Button><Plus size={16} /> New Order</Button></Link>}
          />
        )
        : (
          <div className="space-y-2">
            {filtered.map((order) => {
              const items = order.order_items ?? []
              return (
                <Link key={order.id} to={`/orders/${order.id}`}>
                  <Card className="transition-colors active:border-[#4F46E5] sm:hover:border-[#D1CECA]">
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-[#111827]">{order.customers?.name}</p>
                        <span className="shrink-0 text-[11px] text-[#6B7280]">
                          #{order.bill_number || order.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-[#6B7280]">
                        {items.map((i) => i.item_type).join(', ') || '—'}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge status={order.status} />
                          {order.is_urgent && (
                            <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#D97706]">URGENT</span>
                          )}
                        </div>
                        <p className="shrink-0 text-sm font-bold text-[#111827]">
                          {formatCurrency(
                            order.total_amount ??
                            items.reduce((s, it) => s + (it.total_price || it.stitching_price || 0), 0)
                          )}
                        </p>
                      </div>
                      {order.delivery_date && (
                        <p className="mt-2 text-xs text-[#6B7280]">Due {formatDate(order.delivery_date)}</p>
                      )}
                    </div>
                    <div className="hidden items-start justify-between gap-3 sm:flex">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{order.customers?.name}</p>
                        <p className="mt-0.5 text-xs text-[#6B7280]">
                          {items.map((i) => i.item_type).join(', ') || '—'}
                        </p>
                        {order.delivery_date && (
                          <p className="mt-1 text-xs text-[#6B7280]">{formatDate(order.delivery_date)}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-[#111827]">
                          {formatCurrency(
                            order.total_amount ??
                            items.reduce((s, it) => s + (it.total_price || it.stitching_price || 0), 0)
                          )}
                        </p>
                        <div className="mt-1"><Badge status={order.status} /></div>
                        {order.is_urgent && (
                          <span className="mt-1 inline-block rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#D97706]">URGENT</span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )
      }
      <Link to="/orders/new" className="mobile-fab md:hidden" aria-label="Create new order">
        <Plus size={24} />
      </Link>
    </div>
  )
}
