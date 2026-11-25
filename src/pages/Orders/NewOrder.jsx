import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCustomers } from '../../hooks/useCustomers'
import {
  fetchShopFabrics,
  fetchShopStitchingPrices,
  invalidateShopData,
} from '../../lib/shopData'
import { ITEM_TYPES } from '../../utils/measurementFields'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import {
  Plus,
  Trash2,
  ChevronLeft,
  User,
  ShoppingBag,
  Sparkles,
  Search,
  Check,
  AlertCircle,
  Clock,
  Ruler
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'

// Suggested fabric yardage in meters based on garment and body height/length
const DEFAULT_SUGGESTED_METERS = {
  Shirt: 2.25,
  Pant: 1.30,
  Suit: 3.50,
  Kurta: 2.50,
  Blouse: 1.00,
  Coat: 2.00,
}

function calculateSuggestedMeters(itemType, customerMeasurements) {
  const base = DEFAULT_SUGGESTED_METERS[itemType] || 2.0
  if (!customerMeasurements) return base

  const specific = customerMeasurements.find(
    (m) => m.item_type?.toLowerCase() === itemType.toLowerCase()
  )

  if (!specific) return base

  // If customer has recorded length, calibrate suggested fabric
  const garmentLength = parseFloat(specific.length) || 0
  if (itemType === 'Shirt' && garmentLength > 30) return 2.5
  if (itemType === 'Pant' && garmentLength > 42) return 1.4
  if (itemType === 'Kurta' && garmentLength > 44) return 3.0
  if (itemType === 'Suit' && garmentLength > 32) return 3.8

  return base
}

const emptyItem = (stitchingPrice = 0) => ({
  item_type: 'Shirt',
  fabric_source: 'inventory', // 'inventory' | 'customer'
  fabric_id: null,
  fabric_name: '',
  color_hex: '',
  color_name: '',
  fabric_price: 0,
  fabric_meters: 2.25,
  stitching_price: stitchingPrice,
})

export default function NewOrder() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { customers, refetch: refetchCustomers } = useCustomers()

  // Data dependencies
  const [fabrics, setFabrics] = useState([])
  const [stitchingPrices, setStitchingPrices] = useState({})
  const [customerMeasurements, setCustomerMeasurements] = useState([])

  // Step 1: Customer Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false)
  const [quickCustomerForm, setQuickCustomerForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
  })
  const [quickCustomerLoading, setQuickCustomerLoading] = useState(false)
  const [quickCustomerError, setQuickCustomerError] = useState('')

  // Step 2: Items State
  const [items, setItems] = useState([emptyItem(0)])

  // Step 3: Order Details State
  const [deliveryDate, setDeliveryDate] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [urgentCharge, setUrgentCharge] = useState(150)
  const [advancePaid, setAdvancePaid] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [notes, setNotes] = useState('')

  // Submission state
  const [submitLoading, setSubmitLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Load Fabrics, Stitching Prices master defaults
  useEffect(() => {
    if (!profile?.id) return

    Promise.all([
      fetchShopFabrics(profile.id),
      fetchShopStitchingPrices(profile.id),
    ]).then(([fabricRows, priceRows]) => {
      setFabrics(fabricRows)
      const priceMap = {}
      for (const row of priceRows) {
        priceMap[row.item_type] = parseFloat(row.price) || 0
      }
      setStitchingPrices(priceMap)

      // Initialize default stitching price for the first item
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          stitching_price: priceMap[it.item_type] ?? 0,
        }))
      )
    }).catch((error) => {
      console.error('Error loading order form data:', error)
      setFormError('Could not load fabrics or stitching prices. Please try again.')
    })
  }, [profile?.id])

  // When customer is selected, fetch their saved measurements for auto-suggestions
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerMeasurements([])
      return
    }

    supabase
      .from('measurements')
      .select('*')
      .eq('customer_id', selectedCustomerId)
      .then(({ data }) => {
        setCustomerMeasurements(data ?? [])
      })
  }, [selectedCustomerId])

  // Group fabrics by color hex
  const colorGroupsMap = fabrics.reduce((acc, f) => {
    const hex = (f.color_hex || '#3B82F6').toLowerCase()
    if (!acc[hex]) {
      acc[hex] = {
        color_hex: f.color_hex || '#3B82F6',
        color_name: f.color_name || 'Assorted',
        fabrics: [],
      }
    }
    acc[hex].fabrics.push(f)
    return acc
  }, {})
  const colorGroups = Object.values(colorGroupsMap)

  // Item row operations
  const updateItem = (index, patch) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it
        const updated = { ...it, ...patch }

        // If item_type changed, update stitching price & suggested meters
        if (patch.item_type && patch.item_type !== it.item_type) {
          updated.stitching_price = stitchingPrices[patch.item_type] ?? it.stitching_price
          const suggested = calculateSuggestedMeters(patch.item_type, customerMeasurements)
          updated.fabric_meters = suggested
        }

        return updated
      })
    )
  }

  const addItem = () => {
    const defaultType = 'Shirt'
    const suggested = calculateSuggestedMeters(defaultType, customerMeasurements)
    setItems((prev) => [
      ...prev,
      {
        ...emptyItem(stitchingPrices[defaultType] ?? 0),
        fabric_meters: suggested,
      },
    ])
  }

  const removeItem = (index) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Quick Customer Creation
  const handleQuickCustomerSubmit = async (e) => {
    e.preventDefault()
    if (!profile?.id) return
    setQuickCustomerLoading(true)
    setQuickCustomerError('')

    const { data: newCust, error: custErr } = await supabase
      .from('customers')
      .insert({
        tailor_id: profile.id,
        name: quickCustomerForm.name.trim(),
        phone: quickCustomerForm.phone.trim(),
        whatsapp: quickCustomerForm.whatsapp.trim() || quickCustomerForm.phone.trim(),
        address: quickCustomerForm.address.trim(),
      })
      .select()
      .single()

    setQuickCustomerLoading(false)

    if (custErr) {
      setQuickCustomerError(custErr.message)
      return
    }

    await refetchCustomers()
    setSelectedCustomerId(newCust.id)
    setQuickCustomerModalOpen(false)
    setQuickCustomerForm({ name: '', phone: '', whatsapp: '', address: '' })
  }

  // Financial Calculations
  const itemsSubtotal = items.reduce((sum, it) => {
    const fPrice = it.fabric_source === 'inventory' ? (parseFloat(it.fabric_price) || 0) : 0
    const fMeters = parseFloat(it.fabric_meters) || 0
    const sPrice = parseFloat(it.stitching_price) || 0
    return sum + (fPrice * fMeters) + sPrice
  }, 0)

  const activeUrgentCharge = isUrgent ? (parseFloat(urgentCharge) || 0) : 0
  const grandTotal = itemsSubtotal + activeUrgentCharge
  const parsedAdvance = parseFloat(advancePaid) || 0
  const remainingBalance = Math.max(0, grandTotal - parsedAdvance)

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  // Confirm and Save Order
  const handleConfirmOrder = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!selectedCustomerId) {
      setFormError('Please select or add a customer first.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (items.length === 0) {
      setFormError('Please add at least one garment item.')
      return
    }

    setSubmitLoading(true)

    // 1. Create Order row
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({
        tailor_id: profile.id,
        customer_id: selectedCustomerId,
        delivery_date: deliveryDate || null,
        advance_paid: parsedAdvance,
        payment_mode: paymentMode,
        is_urgent: isUrgent,
        urgent_charge: activeUrgentCharge,
        notes: notes.trim(),
        status: 'received',
      })
      .select()
      .single()

    if (orderErr) {
      setFormError(orderErr.message)
      setSubmitLoading(false)
      return
    }

    // 2. Insert Order Items
    const itemRows = items.map((it) => {
      const fPrice = it.fabric_source === 'inventory' ? (parseFloat(it.fabric_price) || 0) : 0
      const fMeters = parseFloat(it.fabric_meters) || 0
      const sPrice = parseFloat(it.stitching_price) || 0
      const totalItemPrice = (fPrice * fMeters) + sPrice

      return {
        order_id: orderData.id,
        item_type: it.item_type,
        fabric_source: it.fabric_source,
        fabric_id: it.fabric_source === 'inventory' ? (it.fabric_id || null) : null,
        customer_fabric_name: it.fabric_source === 'customer' ? (it.fabric_name || 'Customer Fabric') : null,
        fabric_meters: fMeters,
        fabric_price: fPrice,
        stitching_price: sPrice,
        total_price: totalItemPrice,
      }
    })

    const { error: itemsErr } = await supabase.from('order_items').insert(itemRows)

    if (itemsErr) {
      console.error('Error adding order items:', itemsErr)
    }

    // 3. Deduct stock from inventory fabrics
    for (const it of items) {
      if (it.fabric_source === 'inventory' && it.fabric_id) {
        const fab = fabrics.find((f) => f.id === it.fabric_id)
        if (fab) {
          const newStock = Math.max(0, (parseFloat(fab.stock_meters) || 0) - (parseFloat(it.fabric_meters) || 0))
          await supabase.from('fabrics').update({ stock_meters: newStock }).eq('id', fab.id)
        }
      }
    }

    invalidateShopData(profile.id, 'orders', 'fabrics')
    setSubmitLoading(false)
    navigate(`/orders/${orderData.id}`)
  }

  // Filtered customer list for search box
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true
    const q = customerSearch.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
  })

  return (
    <div className="max-w-4xl space-y-7 pb-40 md:pb-16">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#4F46E5] transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back to Orders</span>
        </Link>
      </div>

      <div>
        <h1 className="hidden text-2xl font-bold tracking-tight text-slate-900 sm:block">Create New Order</h1>
        <p className="mt-1 hidden text-sm text-slate-500 sm:block">
          Follow the 4 steps below to configure items, fabrics, tailoring costs, and bill preview.
        </p>
      </div>

      <nav aria-label="Order steps" className="flex justify-between sm:hidden">
        {['Customer', 'Items', 'Details', 'Preview'].map((step, index) => (
          <a
            key={step}
            href={`#order-step-${index + 1}`}
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium text-[#6B7280]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EDE9FE] font-bold text-[#4F46E5]">
              {index + 1}
            </span>
            {step}
          </a>
        ))}
      </nav>

      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-700 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* STEP 1: SELECT CUSTOMER */}
      <Card id="order-step-1" className="scroll-mt-16 space-y-4 border-l-4 border-l-indigo-600 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-base font-bold text-slate-900">Select Customer</h2>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setQuickCustomerModalOpen(true)}
          >
            <Plus size={14} />
            <span>Quick-Add Customer</span>
          </Button>
        </div>

        {/* Selected Customer Card or Search Box */}
        {selectedCustomer ? (
          <div className="flex items-center justify-between p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                {selectedCustomer.name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">{selectedCustomer.name}</p>
                <p className="text-xs text-slate-500">Phone: {selectedCustomer.phone}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCustomerId('')}
              className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] underline"
            >
              Change Customer
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search customer by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[48px] sm:text-sm sm:min-h-[44px]"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border border-[#E5E3DE] rounded-xl divide-y divide-slate-100 bg-white">
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">
                  No customers found. Click "Quick-Add Customer" above.
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(c.id)
                      setCustomerSearch('')
                    }}
                    className="flex min-h-11 w-full items-center justify-between p-3 text-left text-sm transition-colors active:bg-slate-50 sm:hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.phone}</p>
                    </div>
                    <span className="text-xs font-medium text-[#4F46E5]">Select &rarr;</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </Card>

      {/* STEP 2: ADD ITEMS (MULTIPLE ITEMS) */}
      <div id="order-step-2" className="scroll-mt-16 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Garment Items ({items.length})
            </h2>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>
            <Plus size={14} />
            <span>Add Another Item</span>
          </Button>
        </div>

        {items.map((item, index) => {
          const fPrice = item.fabric_source === 'inventory' ? (parseFloat(item.fabric_price) || 0) : 0
          const fMeters = parseFloat(item.fabric_meters) || 0
          const sPrice = parseFloat(item.stitching_price) || 0
          const itemSubtotal = (fPrice * fMeters) + sPrice

          // Filter fabrics for chosen color
          const selectedColorGroup = item.color_hex ? colorGroupsMap[item.color_hex.toLowerCase()] : null
          const availableFabricsInColor = selectedColorGroup?.fabrics ?? []

          return (
            <Card key={index} className="relative space-y-5 border border-[#E5E3DE] p-4 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <ShoppingBag size={16} className="text-indigo-600" />
                  Item #{index + 1}
                </span>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    <span>Remove Item</span>
                  </button>
                )}
              </div>

              {/* Garment Item Type Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Item Type
                </label>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {ITEM_TYPES.map((type) => {
                    const isSelected = item.item_type === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateItem(index, { item_type: type })}
                        className={`flex h-20 min-h-20 items-center justify-center rounded-xl text-sm font-bold transition-all sm:h-auto sm:min-h-0 sm:px-3.5 sm:py-2 sm:text-xs ${
                          isSelected
                            ? 'bg-[#4F46E5] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {type}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Fabric Source Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Fabric Source
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(index, {
                        fabric_source: 'inventory',
                        fabric_name: '',
                        fabric_price: 0,
                      })
                    }
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      item.fabric_source === 'inventory'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    My Inventory
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(index, {
                        fabric_source: 'customer',
                        fabric_id: null,
                        color_hex: '',
                        fabric_price: 0,
                      })
                    }
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      item.fabric_source === 'customer'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Customer's Fabric
                  </button>
                </div>
              </div>

              {/* If "My Inventory": Color swatches -> Fabric Select -> Price auto-fills */}
              {item.fabric_source === 'inventory' ? (
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">
                      1. Pick Fabric Color
                    </label>
                    <div className="flex gap-3 overflow-x-auto py-1 scrollbar-hide sm:flex-wrap sm:overflow-visible">
                      {colorGroups.map((cg) => {
                        const isColorSelected =
                          item.color_hex?.toLowerCase() === cg.color_hex.toLowerCase()
                        return (
                          <button
                            key={cg.color_hex}
                            type="button"
                            onClick={() =>
                              updateItem(index, {
                                color_hex: cg.color_hex,
                                color_name: cg.color_name,
                                fabric_id: null,
                                fabric_name: '',
                                fabric_price: 0,
                              })
                            }
                            className={`flex min-w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-[11px] font-medium transition-all sm:min-w-0 sm:flex-row sm:gap-1.5 sm:px-2.5 sm:text-xs ${
                              isColorSelected
                                ? 'border-indigo-600 bg-white text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className="h-12 w-12 rounded-full border border-black/15 sm:h-3.5 sm:w-3.5"
                              style={{ backgroundColor: cg.color_hex }}
                            />
                            <span>{cg.color_name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Available Fabrics in selected color */}
                  {item.color_hex && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">
                        2. Select Fabric Roll
                      </label>
                      <select
                        value={item.fabric_id || ''}
                        onChange={(e) => {
                          const chosen = availableFabricsInColor.find((f) => f.id === e.target.value)
                          if (chosen) {
                            updateItem(index, {
                              fabric_id: chosen.id,
                              fabric_name: chosen.fabric_name || chosen.name,
                              fabric_price: parseFloat(chosen.price_per_meter) || 0,
                            })
                          }
                        }}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                      >
                        <option value="">-- Choose fabric roll --</option>
                        {availableFabricsInColor.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.fabric_name || f.name} — {formatCurrency(f.price_per_meter)}/m (Stock: {f.stock_meters}m)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Meters with Auto-Suggest indication */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Input
                        label="Fabric Length (Meters)"
                        type="number"
                        step="0.05"
                        placeholder="2.25"
                        value={item.fabric_meters}
                        onChange={(e) => updateItem(index, { fabric_meters: e.target.value })}
                        hint={`Suggested ~${calculateSuggestedMeters(item.item_type, customerMeasurements)}m from customer measurements`}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="Fabric Price / Meter (Auto-Filled)"
                        type="number"
                        value={item.fabric_price}
                        disabled
                        hint="Auto-filled from inventory"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* If "Customer's Fabric": Record name & meters. Fabric price = 0 */
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Customer Fabric Name / Description"
                      placeholder="e.g. Cream Linen Fabric given by customer"
                      value={item.fabric_name}
                      onChange={(e) => updateItem(index, { fabric_name: e.target.value })}
                      required
                    />
                    <Input
                      label="Meters Provided"
                      type="number"
                      step="0.05"
                      placeholder="2.5"
                      value={item.fabric_meters}
                      onChange={(e) => updateItem(index, { fabric_meters: e.target.value })}
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    * Fabric price is set to ₹0. Bill will calculate stitching charges only.
                  </p>
                </div>
              )}

              {/* Stitching Price & Subtotal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-2">
                <Input
                  label="Stitching Price (₹)"
                  type="number"
                  placeholder="300"
                  value={item.stitching_price}
                  onChange={(e) => updateItem(index, { stitching_price: e.target.value })}
                  hint="Auto-filled from default stitching master, editable per item"
                  required
                />
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Item Subtotal:</span>
                  <span className="text-base font-extrabold text-slate-900">
                    {formatCurrency(itemSubtotal)}
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* STEP 3: ORDER DETAILS */}
      <Card id="order-step-3" className="scroll-mt-16 space-y-4 border-l-4 border-l-indigo-600 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
            3
          </span>
          <h2 className="text-base font-bold text-slate-900">Order Details & Scheduling</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Delivery Date"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Payment Mode</label>
            <div className="flex gap-2">
              {['Cash', 'UPI'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    paymentMode === mode
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Urgent Order Toggle */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="urgent-toggle"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
            />
            <label htmlFor="urgent-toggle" className="cursor-pointer">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={16} className="text-amber-500" />
                Urgent / Fast-Track Delivery
              </span>
              <span className="text-xs text-slate-500 block">
                Prioritizes cutting and fitting with extra fee
              </span>
            </label>
          </div>

          {isUrgent && (
            <div className="w-40">
              <Input
                label="Extra Fee (₹)"
                type="number"
                value={urgentCharge}
                onChange={(e) => setUrgentCharge(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Advance Payment Amount (₹)"
            type="number"
            placeholder="0"
            value={advancePaid}
            onChange={(e) => setAdvancePaid(e.target.value)}
            hint="Amount paid upfront by customer"
          />
          <Input
            label="Special Tailoring Instructions / Notes"
            placeholder="e.g. Double stitch on sleeves, button color..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Card>

      {/* STEP 4: LIVE BILL PREVIEW & CONFIRMATION */}
      <Card id="order-step-4" className="scroll-mt-16 space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between border-b border-[#E5E3DE] pb-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#4F46E5] text-white text-xs font-bold flex items-center justify-center">
              4
            </span>
            <h2 className="text-lg font-bold text-[#111827]">Live Bill Preview</h2>
          </div>
          <span className="text-xs text-[#6B7280] font-medium">Verify before confirming</span>
        </div>

        {/* Customer Summary */}
        <div className="grid grid-cols-2 gap-4 text-xs text-[#6B7280]">
          <div>
            <span className="text-[#6B7280] block font-semibold uppercase">Customer</span>
            <span className="text-[#111827] font-bold text-sm">
              {selectedCustomer?.name || 'No Customer Selected'}
            </span>
            <span className="block">{selectedCustomer?.phone || ''}</span>
          </div>
          <div className="text-right">
            <span className="text-[#6B7280] block font-semibold uppercase">Scheduled Delivery</span>
            <span className="text-[#111827] font-bold text-sm">
              {deliveryDate ? formatDate(deliveryDate) : 'Not Specified'}
            </span>
            <span className="block">Payment: {paymentMode}</span>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-[#E5E3DE] rounded-xl overflow-hidden bg-white divide-y divide-[#E5E3DE] text-xs">
          <div className="hidden grid-cols-12 bg-[#F8F7F4] p-3 font-bold uppercase tracking-wider text-[#6B7280] sm:grid">
            <span className="col-span-5">Garment & Fabric</span>
            <span className="col-span-3 text-right">Fabric Cost</span>
            <span className="col-span-2 text-right">Stitching</span>
            <span className="col-span-2 text-right">Total</span>
          </div>

          {items.map((it, idx) => {
            const fPrice = it.fabric_source === 'inventory' ? (parseFloat(it.fabric_price) || 0) : 0
            const fMeters = parseFloat(it.fabric_meters) || 0
            const sPrice = parseFloat(it.stitching_price) || 0
            const fCost = fPrice * fMeters
            const lineTotal = fCost + sPrice

            return (
              <div key={idx} className="grid grid-cols-2 items-center gap-y-2 p-3 sm:grid-cols-12 sm:gap-y-0">
                <div className="col-span-2 sm:col-span-5">
                  <span className="font-bold text-[#111827] text-sm block">{it.item_type}</span>
                  <span className="text-[11px] text-[#6B7280]">
                    {it.fabric_source === 'inventory'
                      ? `${it.fabric_name || 'Fabric'} (${fMeters}m @ ₹${fPrice})`
                      : `Customer Fabric: ${it.fabric_name || 'Own fabric'} (${fMeters}m)`}
                  </span>
                </div>
                <span className="col-span-1 text-right text-[#6B7280] sm:col-span-3">
                  <span className="mr-1 block text-[10px] text-[#9CA3AF] sm:hidden">Fabric</span>
                  {formatCurrency(fCost)}
                </span>
                <span className="col-span-1 text-right text-[#6B7280] sm:col-span-2">
                  <span className="mr-1 block text-[10px] text-[#9CA3AF] sm:hidden">Stitching</span>
                  {formatCurrency(sPrice)}
                </span>
                <span className="col-span-2 text-right font-bold text-[#111827] sm:col-span-2">
                  <span className="mr-1 text-[10px] font-normal text-[#9CA3AF] sm:hidden">Total</span>
                  {formatCurrency(lineTotal)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Financial Breakdown */}
        <div className="space-y-2 text-sm pt-2">
          <div className="flex justify-between text-[#6B7280]">
            <span>Items Subtotal</span>
            <span>{formatCurrency(itemsSubtotal)}</span>
          </div>

          {isUrgent && (
            <div className="flex justify-between text-[#D97706]">
              <span>Urgent Order Charge</span>
              <span>+{formatCurrency(activeUrgentCharge)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-lg text-[#111827] border-t border-[#E5E3DE] pt-2">
            <span>Grand Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>

          <div className="flex justify-between text-[#6B7280] text-sm">
            <span>Advance Paid</span>
            <span>- {formatCurrency(parsedAdvance)}</span>
          </div>

          <div className="flex justify-between font-bold text-base text-[#166534] bg-[#F0FDF4] p-3 rounded-lg border border-[#DCFCE7]">
            <span>Remaining Balance Due</span>
            <span>{formatCurrency(remainingBalance)}</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          type="button"
          onClick={handleConfirmOrder}
          loading={submitLoading}
          fullWidth
          size="lg"
          className="font-bold py-3.5 text-base"
        >
          <Check size={18} />
          <span>Confirm & Save Order</span>
        </Button>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom,12px))] z-40 flex items-center gap-3 border-t border-[#E5E3DE] bg-white px-4 py-3 md:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#6B7280]">Running total</p>
          <p className="truncate text-base font-bold text-[#111827]">{formatCurrency(grandTotal)}</p>
        </div>
        <Button
          type="button"
          className="min-h-12 flex-1"
          onClick={() =>
            document.getElementById('order-step-4')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          Review order
        </Button>
      </div>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={quickCustomerModalOpen}
        onClose={() => setQuickCustomerModalOpen(false)}
        title="Quick-Add Customer"
      >
        {quickCustomerError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {quickCustomerError}
          </div>
        )}
        <form onSubmit={handleQuickCustomerSubmit} className="space-y-4">
          <Input
            label="Customer Full Name"
            placeholder="e.g. Anand Patel"
            value={quickCustomerForm.name}
            onChange={(e) =>
              setQuickCustomerForm((f) => ({ ...f, name: e.target.value }))
            }
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="9876543210"
            value={quickCustomerForm.phone}
            onChange={(e) =>
              setQuickCustomerForm((f) => ({ ...f, phone: e.target.value }))
            }
            required
          />
          <Input
            label="WhatsApp Number (Optional)"
            type="tel"
            placeholder="Leave empty if same as phone"
            value={quickCustomerForm.whatsapp}
            onChange={(e) =>
              setQuickCustomerForm((f) => ({ ...f, whatsapp: e.target.value }))
            }
          />
          <Input
            label="Address (Optional)"
            placeholder="City / Area"
            value={quickCustomerForm.address}
            onChange={(e) =>
              setQuickCustomerForm((f) => ({ ...f, address: e.target.value }))
            }
          />
          <Button type="submit" fullWidth loading={quickCustomerLoading} size="lg">
            Save & Select Customer
          </Button>
        </form>
      </Modal>
    </div>
  )
}
