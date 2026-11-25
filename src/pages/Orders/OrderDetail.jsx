import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { invalidateShopData } from '../../lib/shopData'
import { generateBillPDF } from '../../utils/billGenerator'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { formatCurrency, formatDate } from '../../utils/formatters'
import {
  ChevronLeft,
  Download,
  MessageCircle,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  Scissors,
  Sparkles,
  ArrowRight,
  Share2
} from 'lucide-react'

// Standard lifecycle flow of an order
const ORDER_STATUS_FLOW = [
  'Received',
  'Cutting',
  'First Fitting',
  'Alteration',
  'Ready',
  'Delivered'
]

export default function OrderDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [billLoading, setBillLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')

  async function loadOrderData() {
    if (!id || !profile?.id) return

    const { data: o, error: oErr } = await supabase
      .from('orders')
      .select('*, order_items(*, fabrics(fabric_name, color_hex, color_name))')
      .eq('id', id)
      .eq('tailor_id', profile.id)
      .single()

    if (oErr || !o) {
      setLoading(false)
      return
    }

    const { data: c } = await supabase
      .from('customers')
      .select('*')
      .eq('id', o.customer_id)
      .single()

    setOrder(o)
    setCustomer(c)
    setLoading(false)
  }

  useEffect(() => {
    loadOrderData()
  }, [id, profile?.id])

  // Normalization for matching status strings
  const currentStatus = order?.status
    ? order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')
    : 'Received'

  const currentIdx = ORDER_STATUS_FLOW.findIndex(
    (s) => s.toLowerCase() === currentStatus.toLowerCase()
  )

  const activeIdx = currentIdx >= 0 ? currentIdx : 0
  const nextStatus = ORDER_STATUS_FLOW[activeIdx + 1]

  // Move status to next stage
  const advanceStatus = async (targetStage) => {
    const stageToSet = targetStage || nextStatus
    if (!stageToSet) return

    setStatusLoading(true)
    const { error: updErr } = await supabase
      .from('orders')
      .update({ status: stageToSet.toLowerCase() })
      .eq('id', id)
      .eq('tailor_id', profile.id)

    setStatusLoading(false)
    if (!updErr) {
      invalidateShopData(profile.id, 'orders')
      setOrder((prev) => ({ ...prev, status: stageToSet.toLowerCase() }))
    }
  }

  // Generate & Download PDF bill directly
  const handleDownloadPDF = async () => {
    if (!order || !customer || !profile) return
    setBillLoading(true)

    try {
      const blob = await generateBillPDF(order, customer, profile, order.order_items)

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Bill-${order.bill_number || order.id.slice(0, 6).toUpperCase()}.pdf`
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (err) {
      console.error('Bill download failed:', err)
      setShareFeedback('Could not generate the PDF bill.')
    } finally {
      setBillLoading(false)
    }
  }

  const rawCustomerPhone = (customer?.whatsapp || customer?.phone || '').trim()
  const cleanPhone = rawCustomerPhone.replace(/\D/g, '')
  const finalPhone = cleanPhone
    ? (cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`)
    : ''
  const hasWhatsAppNumber = Boolean(finalPhone)
  const whatsappDisabledTitle = hasWhatsAppNumber
    ? undefined
    : 'No WhatsApp number saved for this customer'

  const handleMessageCustomer = () => {
    if (!order || !customer || !profile || !finalPhone) return

    const shopName = profile.shop_name || 'TailorBook'
    const message = `Hello ${customer.name || 'Customer'} 👋\n\nYour order #${order.bill_number || order.id.slice(0, 6).toUpperCase()} at ${shopName} is ready for pickup!\n\nPlease visit us at your earliest convenience.\n\nThank you! 🙏\n— ${shopName}`
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleShareBill = async () => {
    if (!order || !customer || !profile || !finalPhone) return
    setBillLoading(true)
    setShareFeedback('')

    let fileUrl
    try {
      const pdfBlob = await generateBillPDF(order, customer, profile, order.order_items)
      const fileName = `TailorBook-Bill-${order.bill_number || order.id.slice(0, 6).toUpperCase()}.pdf`
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' })
      const shopName = profile.shop_name || 'TailorBook'
      const message = `Hello ${customer.name || 'Customer'} 👋\n\nYour order is ready for pickup!\nPlease find your bill attached.\n\n— ${shopName}`

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: message })
        setShareFeedback('Bill shared successfully.')
      } else {
        fileUrl = URL.createObjectURL(file)
        const anchor = document.createElement('a')
        anchor.href = fileUrl
        anchor.download = `Bill-${order.bill_number || order.id.slice(0, 6).toUpperCase()}.pdf`
        anchor.click()

        const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`
        window.setTimeout(() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer'), 1000)
        setShareFeedback('PDF downloaded. Opening WhatsApp...')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Bill sharing failed:', err)
        setShareFeedback('Could not share the bill. Please try again.')
      }
    } finally {
      if (fileUrl) window.setTimeout(() => URL.revokeObjectURL(fileUrl), 5000)
      setBillLoading(false)
      window.setTimeout(() => setShareFeedback(''), 4000)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!order) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-600 font-semibold">Order not found or unauthorized.</p>
        <Link to="/orders" className="text-[#4F46E5] text-sm font-medium mt-2 inline-block">
          &larr; Back to Orders
        </Link>
      </div>
    )
  }

  const items = order.order_items ?? []
  const itemsSubtotal = items.reduce((sum, it) => {
    return sum + (parseFloat(it.total_price) || (parseFloat(it.stitching_price) || 0))
  }, 0)

  const urgentAmt = order.is_urgent ? (parseFloat(order.urgent_charge) || 0) : 0
  const grandTotal = itemsSubtotal + urgentAmt
  const advance = parseFloat(order.advance_paid) || 0
  const remaining = Math.max(0, grandTotal - advance)

  const canShareBill = ['ready', 'delivered'].includes(currentStatus.toLowerCase())

  return (
    <div className="max-w-3xl space-y-6 pb-16">
      {/* Back button */}
      <div>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#4F46E5] transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back to Orders</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Order #{order.bill_number || order.id.slice(0, 6).toUpperCase()}
              </h1>
              {order.is_urgent && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={11} />
                  URGENT
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" />
                Booked: {formatDate(order.created_at)}
              </span>
              {order.delivery_date && (
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Clock size={13} className="text-[#4F46E5]" />
                  Due: {formatDate(order.delivery_date)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <Badge status={currentStatus} className="text-sm px-3 py-1 font-bold" />
            <span className="text-xs text-slate-400 font-mono">ID: {order.id.slice(0, 8)}</span>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</p>
            <p className="font-bold text-base text-slate-900">{customer?.name || 'Customer'}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Phone size={12} className="text-slate-400" />
              <span>{customer?.phone || 'No phone recorded'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {customer?.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Phone size={14} />
                <span>Call</span>
              </a>
            )}
            {customer && (
              <Link
                to={`/customers/${customer.id}`}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-[#4F46E5] bg-[#F5F3FF] hover:bg-[#EDE9FE] transition-colors flex items-center gap-1"
              >
                <span>View Profile</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* ORDER STATUS TIMELINE (Received → Cutting → First Fitting → Alteration → Ready → Delivered) */}
      <Card className="space-y-5 p-4 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Scissors size={18} className="text-[#4F46E5]" />
            <h2 className="text-base font-bold text-slate-900">Production Stage Timeline</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Step {activeIdx + 1} of {ORDER_STATUS_FLOW.length}
          </span>
        </div>

        {/* Stepper Steps */}
        <div className="mobile-status-timeline grid grid-cols-6 gap-1 pt-1">
          {ORDER_STATUS_FLOW.map((step, idx) => {
            const isCompleted = idx < activeIdx
            const isCurrent = idx === activeIdx

            return (
              <div key={step} className="flex flex-col items-center text-center group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-[#4F46E5] text-white'
                      : isCurrent
                      ? 'bg-[#4F46E5] text-white scale-105'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-semibold mt-2 leading-tight ${
                    isCurrent
                      ? 'text-[#4F46E5]'
                      : isCompleted
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {step}
                </span>
              </div>
            )
          })}
        </div>

        {/* Next Stage Button */}
        {nextStatus && (
          <div className="pt-2">
            <Button
              type="button"
              fullWidth
              size="lg"
              loading={statusLoading}
              onClick={() => advanceStatus(nextStatus)}
              className="font-bold"
            >
              <span>Move to Next Stage:</span>
              <span className="underline ml-1">{nextStatus}</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </Card>

      {/* ITEM-WISE BREAKDOWN (Fabric + Stitching Breakdown) */}
      <Card className="space-y-4 p-4 sm:p-6">
        <h2 className="text-base font-bold text-slate-900">Garment Items Breakdown</h2>

        <div className="divide-y divide-slate-100">
          {items.map((it, idx) => {
            const fabricPrice = it.fabric_price ?? it.fabric_price_per_meter ?? 0
            const fabricCost = (parseFloat(it.fabric_meters) || 0) * fabricPrice
            const stitchingCost = parseFloat(it.stitching_price) || 0
            const totalLineCost = it.total_price ?? (fabricCost + stitchingCost)
            const fabricLabel = it.fabrics?.fabric_name || it.customer_fabric_name || it.fabric_name || 'Fabric'

            return (
              <div key={it.id || idx} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <p className="font-bold text-sm text-slate-900">{it.item_type}</p>
                  </div>
                  <span className="font-extrabold text-sm text-slate-900">
                    {formatCurrency(totalLineCost)}
                  </span>
                </div>

                <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700 block">Fabric Details</span>
                    {it.fabric_source === 'inventory' ? (
                      <p className="mt-0.5">
                        {fabricLabel} ({it.fabric_meters}m × {formatCurrency(fabricPrice)} = {formatCurrency(fabricCost)})
                      </p>
                    ) : (
                      <p className="mt-0.5">Customer Fabric: {fabricLabel} ({it.fabric_meters}m @ ₹0)</p>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-700 block">Stitching Charge</span>
                    <p className="mt-0.5">{formatCurrency(stitchingCost)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* BILL SUMMARY */}
      <Card className="p-6 space-y-3 bg-slate-50 border-slate-200">
        <h2 className="text-base font-bold text-slate-900 mb-2">Bill Summary</h2>

        <div className="flex justify-between text-sm text-slate-600">
          <span>Items Subtotal</span>
          <span>{formatCurrency(itemsSubtotal)}</span>
        </div>

        {order.is_urgent && (
          <div className="flex justify-between text-sm text-amber-700 font-medium">
            <span>Urgent Delivery Surcharge</span>
            <span>+{formatCurrency(urgentAmt)}</span>
          </div>
        )}

        <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-2">
          <span>Total Order Amount</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>

        <div className="flex justify-between text-sm text-slate-600">
          <span>Advance Paid</span>
          <span className="font-semibold text-slate-800">- {formatCurrency(advance)}</span>
        </div>

        <div className="flex justify-between text-base font-extrabold text-indigo-700 bg-indigo-50 p-3.5 rounded-xl border border-indigo-100">
          <span>Remaining Balance Due</span>
          <span>{formatCurrency(remaining)}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>Payment Mode: <strong className="text-slate-700">{order.payment_mode || 'Cash'}</strong></span>
          {profile?.upi_id && order.payment_mode === 'UPI' && (
            <span>UPI ID: <strong className="text-[#4F46E5]">{profile.upi_id}</strong></span>
          )}
        </div>

        {order.notes && (
          <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 italic">
            <strong>Notes:</strong> {order.notes}
          </div>
        )}
      </Card>

      {/* ORDER ACTIONS */}
      <div className="order-actions space-y-2 pt-2">
        <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleDownloadPDF}
          loading={billLoading}
          className="flex-1 border-[#9CA3AF] text-[#4B5563] hover:bg-[#F3F4F6]"
        >
          <Download size={16} />
          <span>Download PDF</span>
        </Button>

        <div className="flex-1" title={whatsappDisabledTitle}>
          <Button
            type="button"
            variant="whatsappOutline"
            size="md"
            onClick={handleMessageCustomer}
            disabled={!hasWhatsAppNumber}
            className="w-full"
          >
            <MessageCircle size={16} />
            <span>Message Customer</span>
          </Button>
        </div>

        {canShareBill && (
          <div className="flex-1" title={whatsappDisabledTitle}>
            <Button
              type="button"
              variant="whatsapp"
              size="md"
              onClick={handleShareBill}
              loading={billLoading}
              disabled={!hasWhatsAppNumber}
              className="w-full"
            >
              <Share2 size={16} />
              <span>Share Bill on WhatsApp</span>
            </Button>
          </div>
        )}
        </div>
        {shareFeedback && (
          <p role="status" className="text-xs text-[#6B7280]">
            {shareFeedback}
          </p>
        )}
      </div>
    </div>
  )
}
