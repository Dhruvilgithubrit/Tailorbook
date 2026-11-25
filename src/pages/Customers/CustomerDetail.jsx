import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { formatCurrency, formatDate } from '../../utils/formatters'
import {
  Phone,
  MessageCircle,
  MapPin,
  ChevronLeft,
  Edit2,
  Save,
  ShoppingBag,
  Ruler,
  CheckCircle2,
  Plus
} from 'lucide-react'

const CUSTOMER_TABS = ['Shirt', 'Pant', 'Kurta', 'Suit']

const ITEM_MEASUREMENT_FIELDS = {
  Shirt: [
    { key: 'chest', label: 'Chest' },
    { key: 'shoulder', label: 'Shoulder' },
    { key: 'sleeve', label: 'Sleeve Length' },
    { key: 'length', label: 'Shirt Length' },
    { key: 'collar', label: 'Collar' },
  ],
  Pant: [
    { key: 'waist', label: 'Waist' },
    { key: 'hip', label: 'Hip' },
    { key: 'thigh', label: 'Thigh' },
    { key: 'length', label: 'Pant Length' },
    { key: 'bottom', label: 'Bottom / Mohri' },
  ],
  Kurta: [
    { key: 'chest', label: 'Chest' },
    { key: 'shoulder', label: 'Shoulder' },
    { key: 'sleeve', label: 'Sleeve Length' },
    { key: 'length', label: 'Kurta Length' },
    { key: 'collar', label: 'Collar' },
    { key: 'waist', label: 'Waist' },
  ],
  Suit: [
    { key: 'chest', label: 'Chest' },
    { key: 'shoulder', label: 'Shoulder' },
    { key: 'sleeve', label: 'Sleeve' },
    { key: 'length', label: 'Coat Length' },
    { key: 'waist', label: 'Pant Waist' },
    { key: 'hip', label: 'Pant Hip' },
    { key: 'thigh', label: 'Pant Thigh' },
    { key: 'bottom', label: 'Pant Bottom' },
  ],
}

function EditCustomerModal({ isOpen, onClose, customer, onSaved }) {
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    whatsapp: customer?.whatsapp || '',
    address: customer?.address || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '',
        phone: customer.phone || '',
        whatsapp: customer.whatsapp || '',
        address: customer.address || '',
      })
    }
  }, [customer, isOpen])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: updErr } = await supabase
      .from('customers')
      .update({
        name: form.name.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        address: form.address.trim(),
      })
      .eq('id', customer.id)

    setLoading(false)
    if (updErr) {
      setError(updErr.message)
      return
    }

    onSaved()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Customer Details">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-[#DC2626]/30 rounded-lg text-xs text-[#DC2626]">
          {error}
        </div>
      )}
      <form onSubmit={handleUpdate} className="space-y-3.5">
        <Input label="Name" value={form.name} onChange={set('name')} required />
        <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} required />
        <Input label="WhatsApp" type="tel" value={form.whatsapp} onChange={set('whatsapp')} />
        <Input label="Address" value={form.address} onChange={set('address')} />
        <div className="pt-2">
          <Button type="submit" fullWidth loading={loading} size="md">
            Update Details
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function CustomerProfile() {
  const { id } = useParams()
  const { session, profile } = useAuth()
  const tailorId = session?.user?.id || profile?.id

  const [customer, setCustomer] = useState(null)
  const [measurementsList, setMeasurementsList] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('Shirt')
  const [currentMeasurements, setCurrentMeasurements] = useState({})
  const [notes, setNotes] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  async function loadCustomerData() {
    if (!id || !tailorId) return

    const [cRes, mRes, oRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).eq('tailor_id', tailorId).single(),
      supabase.from('measurements').select('*').eq('customer_id', id),
      supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', id)
        .eq('tailor_id', tailorId)
        .order('created_at', { ascending: false }),
    ])

    setCustomer(cRes.data ?? null)
    setMeasurementsList(mRes.data ?? [])
    setOrders(oRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadCustomerData()
  }, [id, tailorId])

  useEffect(() => {
    const record = measurementsList.find(
      (m) => m.item_type?.toLowerCase() === activeTab.toLowerCase()
    )

    if (record) {
      setCurrentMeasurements({
        chest: record.chest ?? '',
        shoulder: record.shoulder ?? '',
        sleeve: record.sleeve ?? '',
        length: record.length ?? '',
        collar: record.collar ?? '',
        waist: record.waist ?? '',
        hip: record.hip ?? '',
        thigh: record.thigh ?? '',
        bottom: record.bottom ?? '',
      })
      setNotes(record.notes ?? '')
    } else {
      setCurrentMeasurements({
        chest: '',
        shoulder: '',
        sleeve: '',
        length: '',
        collar: '',
        waist: '',
        hip: '',
        thigh: '',
        bottom: '',
      })
      setNotes('')
    }
    setSaveSuccess(false)
  }, [activeTab, measurementsList])

  const handleFieldChange = (key, val) => {
    setCurrentMeasurements((prev) => ({ ...prev, [key]: val }))
    setSaveSuccess(false)
  }

  const handleSaveMeasurements = async (e) => {
    e.preventDefault()
    setSaveLoading(true)
    setSaveSuccess(false)

    const existingRecord = measurementsList.find(
      (m) => m.item_type?.toLowerCase() === activeTab.toLowerCase()
    )

    const payload = {
      customer_id: id,
      item_type: activeTab,
      chest: parseFloat(currentMeasurements.chest) || null,
      shoulder: parseFloat(currentMeasurements.shoulder) || null,
      sleeve: parseFloat(currentMeasurements.sleeve) || null,
      length: parseFloat(currentMeasurements.length) || null,
      collar: parseFloat(currentMeasurements.collar) || null,
      waist: parseFloat(currentMeasurements.waist) || null,
      hip: parseFloat(currentMeasurements.hip) || null,
      thigh: parseFloat(currentMeasurements.thigh) || null,
      bottom: parseFloat(currentMeasurements.bottom) || null,
      notes: notes.trim() || null,
    }

    if (existingRecord?.id) {
      await supabase.from('measurements').update(payload).eq('id', existingRecord.id)
    } else {
      await supabase.from('measurements').insert(payload)
    }

    await loadCustomerData()
    setSaveLoading(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  if (loading) return <LoadingSpinner />
  if (!customer) {
    return (
      <div className="py-12 text-center">
        <p className="text-[#111827] font-semibold text-sm">Customer profile not found.</p>
        <Link to="/customers" className="text-[#4F46E5] text-xs font-medium mt-2 inline-block">
          &larr; Return to Customers
        </Link>
      </div>
    )
  }

  const fieldsConfig = ITEM_MEASUREMENT_FIELDS[activeTab] ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button */}
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Back to Customers</span>
        </Link>
      </div>

      {/* Customer Overview Header */}
      <div className="bg-white rounded-lg border border-[#E5E3DE] p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-[#111827]">
            {customer.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[#6B7280]">
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone size={12} className="text-[#9CA3AF]" />
                {customer.phone}
              </span>
            )}
            {customer.whatsapp && (
              <a
                href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#16A34A] hover:underline"
              >
                <MessageCircle size={12} />
                WhatsApp
              </a>
            )}
            {customer.address && (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-[#9CA3AF]" />
                {customer.address}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Edit2 size={13} />
            <span>Edit</span>
          </Button>
          <Link to="/orders/new">
            <Button size="sm">
              <Plus size={13} />
              <span>New Order</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Measurements Section */}
      <div className="bg-white rounded-lg border border-[#E5E3DE] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E3DE] pb-3">
          <div className="flex items-center gap-2">
            <Ruler size={16} className="text-[#6B7280]" />
            <h2 className="text-[14px] font-semibold text-[#111827]">
              Body Measurements
            </h2>
          </div>
          <span className="text-xs text-[#6B7280]">Values in inches</span>
        </div>

        {/* Garment Tabs */}
        <div className="-mx-5 flex gap-1.5 overflow-x-auto border-b border-[#E5E3DE] px-5 pb-2 scrollbar-hide sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {CUSTOMER_TABS.map((tab) => {
            const hasData = measurementsList.some(
              (m) => m.item_type?.toLowerCase() === tab.toLowerCase()
            )
            const isActive = activeTab === tab

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`min-h-11 shrink-0 rounded px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
                  isActive
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F8F7F4]'
                }`}
              >
                <span>{tab}</span>
                {hasData && (
                  <span
                    className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-[#4F46E5]' : 'bg-[#9CA3AF]'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Inputs Grid */}
        <form onSubmit={handleSaveMeasurements} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {fieldsConfig.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                type="number"
                step="0.1"
                placeholder="0.0"
                value={currentMeasurements[field.key] ?? ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
              />
            ))}
          </div>

          <Input
            label="Tailoring & Fit Notes"
            placeholder="Fitting remarks..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saveLoading} size="sm">
              <Save size={14} />
              <span>Save {activeTab}</span>
            </Button>
            {saveSuccess && (
              <span className="text-xs text-[#16A34A] flex items-center gap-1 font-medium">
                <CheckCircle2 size={14} />
                <span>Saved</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Customer Order History */}
      <div className="bg-white rounded-lg border border-[#E5E3DE] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E3DE] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-[#6B7280]" />
            <h2 className="text-[14px] font-semibold text-[#111827]">Order History</h2>
          </div>
          <span className="text-xs text-[#6B7280]">
            {orders.length} order{orders.length === 1 ? '' : 's'}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="py-10 text-center px-4">
            <p className="text-sm font-medium text-[#111827]">No orders placed yet</p>
            <p className="text-xs text-[#6B7280] mt-1">Orders for this customer will be listed here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E3DE]">
            {orders.map((order) => {
              const itemTypes = (order.order_items ?? []).map((i) => i.item_type).filter(Boolean)
              const itemsText = itemTypes.length > 0 ? itemTypes.join(', ') : 'Order'
              const orderTotal = (order.order_items ?? []).reduce(
                (sum, it) => sum + (it.total_price || it.stitching_price || 0),
                0
              )

              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex min-h-[76px] items-center justify-between px-4 py-3.5 transition-colors active:bg-[#F8F7F4] sm:px-5 sm:hover:bg-[#F8F7F4]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#111827]">
                        {itemsText}
                      </span>
                      {order.bill_number && (
                        <span className="text-[11px] font-mono text-[#6B7280]">
                          #{order.bill_number}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Booked {formatDate(order.created_at)}
                      {order.delivery_date && ` · Due ${formatDate(order.delivery_date)}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-[#111827] block">
                      {formatCurrency(orderTotal)}
                    </span>
                    <div className="mt-1">
                      <Badge status={order.status} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <EditCustomerModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        customer={customer}
        onSaved={loadCustomerData}
      />
    </div>
  )
}
