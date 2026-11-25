import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { fetchShopFabrics, getCachedShopData, invalidateShopData } from '../../lib/shopData'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import EmptyState from '../../components/shared/EmptyState'
import { Layers, Plus, Edit2, Trash2, Upload, Check } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'

/**
 * Clean Stock Indicator:
 * Green: >5m | Yellow: 2-5m | Red: <2m
 */
function StockIndicator({ stock }) {
  const s = parseFloat(stock) || 0

  if (s > 5) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
        {s}m In Stock
      </span>
    )
  }

  if (s >= 2) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
        {s}m Low Stock
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
      {s}m Critical
    </span>
  )
}

function FabricModal({ isOpen, onClose, onSaved, tailorId, initialData }) {
  const isEditing = Boolean(initialData?.id)

  const [form, setForm] = useState({
    color_name: '',
    color_hex: '#4F46E5',
    fabric_name: '',
    price_per_meter: '',
    stock_meters: '',
    image_url: '',
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        color_name: initialData.color_name || '',
        color_hex: initialData.color_hex || '#4F46E5',
        fabric_name: initialData.fabric_name || initialData.name || '',
        price_per_meter: initialData.price_per_meter ?? '',
        stock_meters: initialData.stock_meters ?? '',
        image_url: initialData.image_url || '',
      })
    } else {
      setForm({
        color_name: '',
        color_hex: '#4F46E5',
        fabric_name: '',
        price_per_meter: '',
        stock_meters: '',
        image_url: '',
      })
    }
    setPhotoFile(null)
    setError('')
  }, [initialData, isOpen])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) setPhotoFile(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    let finalImageUrl = form.image_url

    if (photoFile) {
      try {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${tailorId}/${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('fabrics')
          .upload(fileName, photoFile, { upsert: true })

        if (!uploadErr && uploadData) {
          const { data: pubData } = supabase.storage.from('fabrics').getPublicUrl(fileName)
          finalImageUrl = pubData?.publicUrl || ''
        }
      } catch (ex) {
        console.warn('Storage note:', ex)
      }
    }

    const payload = {
      tailor_id: tailorId,
      fabric_name: form.fabric_name.trim(),
      color_name: form.color_name.trim(),
      color_hex: form.color_hex,
      price_per_meter: parseFloat(form.price_per_meter) || 0,
      stock_meters: parseFloat(form.stock_meters) || 0,
      image_url: finalImageUrl || null,
    }

    if (isEditing) {
      const { error: updErr } = await supabase
        .from('fabrics')
        .update(payload)
        .eq('id', initialData.id)
        .eq('tailor_id', tailorId)

      setLoading(false)
      if (updErr) {
        setError(updErr.message)
        return
      }
    } else {
      const { error: insErr } = await supabase.from('fabrics').insert(payload)
      setLoading(false)
      if (insErr) {
        setError(insErr.message)
        return
      }
    }

    onSaved()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Fabric' : 'Add New Fabric'}
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-[#DC2626]/30 rounded-lg text-xs text-[#DC2626]">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="flex gap-3 items-end">
          <Input
            label="Color Name"
            placeholder="e.g. Navy Blue, Beige..."
            value={form.color_name}
            onChange={set('color_name')}
            required
            className="flex-1"
          />
          <div className="flex flex-col gap-1 shrink-0">
            <label className="text-xs font-medium text-[#374151]">Color Hex</label>
            <div className="flex items-center gap-1.5 border border-[#E5E3DE] rounded-lg px-2 py-1.5 bg-white">
              <input
                type="color"
                value={form.color_hex}
                onChange={set('color_hex')}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
              <span className="text-xs font-mono text-[#374151] uppercase">
                {form.color_hex}
              </span>
            </div>
          </div>
        </div>

        <Input
          label="Fabric Name"
          placeholder="e.g. Italian Wool, Pure Cotton..."
          value={form.fabric_name}
          onChange={set('fabric_name')}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Price per Meter (₹)"
            type="number"
            step="1"
            placeholder="350"
            value={form.price_per_meter}
            onChange={set('price_per_meter')}
            required
          />
          <Input
            label="Stock (Meters)"
            type="number"
            step="0.1"
            placeholder="15.5"
            value={form.stock_meters}
            onChange={set('stock_meters')}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#374151]">Photo (Optional)</label>
          <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-dashed border-[#E5E3DE] hover:bg-[#F8F7F4] text-[#6B7280] text-xs font-medium transition-colors">
            <Upload size={14} className="text-[#9CA3AF]" />
            <span>{photoFile ? photoFile.name : 'Select image...'}</span>
            <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
          </label>
        </div>

        <div className="pt-2">
          <Button type="submit" fullWidth loading={loading} size="md">
            {isEditing ? 'Update Fabric' : 'Add Fabric'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function FabricsList() {
  const { session, profile } = useAuth()
  const tailorId = session?.user?.id || profile?.id

  const [fabrics, setFabrics] = useState(() => getCachedShopData('fabrics', tailorId) ?? [])
  const [selectedColorKey, setSelectedColorKey] = useState(null)
  const [loading, setLoading] = useState(() => !getCachedShopData('fabrics', tailorId))

  const [modalOpen, setModalOpen] = useState(false)
  const [editingFabric, setEditingFabric] = useState(null)

  async function loadFabrics(force = false) {
    if (!tailorId) return
    if (!getCachedShopData('fabrics', tailorId)) setLoading(true)
    try {
      const data = await fetchShopFabrics(tailorId, force)
      setFabrics(data)
    } catch (error) {
      console.error('Error loading fabrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFabrics()
  }, [tailorId])

  const colorGroupsMap = fabrics.reduce((acc, f) => {
    const hex = (f.color_hex || '#4F46E5').toLowerCase()
    if (!acc[hex]) {
      acc[hex] = {
        color_hex: f.color_hex || '#4F46E5',
        color_name: f.color_name || 'Assorted',
        fabrics: [],
        totalMeters: 0,
      }
    }
    acc[hex].fabrics.push(f)
    acc[hex].totalMeters += parseFloat(f.stock_meters) || 0
    return acc
  }, {})

  const colorGroups = Object.entries(colorGroupsMap)

  useEffect(() => {
    if (!selectedColorKey && colorGroups.length > 0) {
      setSelectedColorKey(colorGroups[0][0])
    }
  }, [colorGroups.length])

  const handleDelete = async (fabricId) => {
    if (!window.confirm('Delete this fabric from inventory?')) return

    const { error } = await supabase
      .from('fabrics')
      .delete()
      .eq('id', fabricId)
      .eq('tailor_id', tailorId)

    if (!error) {
      invalidateShopData(tailorId, 'fabrics')
      loadFabrics(true)
    }
  }

  if (loading) return <LoadingSpinner />

  const activeColorGroup = selectedColorKey ? colorGroupsMap[selectedColorKey] : null
  const activeFabrics = activeColorGroup?.fabrics ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="hidden flex-col sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">
            Fabric Inventory
          </h1>
          <p className="text-[12px] text-[#6B7280] mt-0.5">
            Organize fabrics by color and track meter stock
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingFabric(null)
            setModalOpen(true)
          }}
          size="md"
        >
          <Plus size={16} />
          <span>Add Fabric</span>
        </Button>
      </div>

      {fabrics.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No fabrics in inventory"
          description="Add your fabric rolls to track stock and assign to customer orders."
          action={
            <Button
              onClick={() => {
                setEditingFabric(null)
                setModalOpen(true)
              }}
            >
              <Plus size={16} />
              <span>Add First Fabric</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {/* Color Swatches Palette */}
          <div className="bg-white rounded-lg border border-[#E5E3DE] p-4">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6B7280] block mb-3">
              Colors ({colorGroups.length})
            </span>
            <div className="grid grid-cols-4 gap-y-4 md:flex md:flex-wrap md:items-center md:gap-2">
              {colorGroups.map(([hexKey, group]) => {
                const isSelected = selectedColorKey === hexKey
                return (
                  <button
                    key={hexKey}
                    type="button"
                    onClick={() => setSelectedColorKey(isSelected ? null : hexKey)}
                    className={`flex min-h-[80px] flex-col items-center justify-center gap-1 border-0 px-1 py-1.5 text-center text-[9px] font-medium transition-colors cursor-pointer md:min-h-0 md:flex-row md:gap-2 md:rounded-lg md:border md:px-3 md:text-xs ${
                      isSelected
                        ? 'border-[#4F46E5] bg-[#F5F3FF] text-[#111827]'
                        : 'border-[#E5E3DE] bg-white text-[#6B7280] hover:text-[#111827]'
                    }`}
                  >
                    <span
                      className="h-14 w-14 shrink-0 rounded-full border border-black/15 md:h-3.5 md:w-3.5"
                      style={{ backgroundColor: group.color_hex }}
                    />
                    <span>{group.color_name}</span>
                    <span className="text-[10px] text-[#6B7280] font-mono">
                      ({group.fabrics.length})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Color Fabric Table */}
          {activeColorGroup && (
            <div className="bg-white rounded-lg border border-[#E5E3DE] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E5E3DE] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full border border-black/15"
                    style={{ backgroundColor: activeColorGroup.color_hex }}
                  />
                  <h2 className="text-sm font-semibold text-[#111827]">
                    {activeColorGroup.color_name} Fabrics
                  </h2>
                  <span className="text-xs text-[#6B7280]">
                    · {activeFabrics.length} roll{activeFabrics.length === 1 ? '' : 's'} ({activeColorGroup.totalMeters.toFixed(1)}m)
                  </span>
                </div>
              </div>

              <div className="divide-y divide-[#E5E3DE]">
                {activeFabrics.map((fabric) => {
                  const displayName = fabric.fabric_name || fabric.name || 'Unnamed Fabric'
                  const stockNum = parseFloat(fabric.stock_meters) || 0

                  return (
                    <div
                      key={fabric.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-[#F8F7F4] transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {fabric.image_url ? (
                          <img
                            src={fabric.image_url}
                            alt=""
                            className="w-10 h-10 rounded border border-[#E5E3DE] object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded border border-black/10 shrink-0"
                            style={{ backgroundColor: fabric.color_hex }}
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-[#111827]">
                            {displayName}
                          </p>
                          <p className="text-xs font-semibold text-[#4F46E5] mt-0.5">
                            {formatCurrency(fabric.price_per_meter)} / meter
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <StockIndicator stock={stockNum} />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingFabric(fabric)
                              setModalOpen(true)
                            }}
                            className="flex h-11 w-11 items-center justify-center rounded text-[#6B7280] transition-colors active:bg-[#E5E3DE]/40 sm:h-auto sm:w-auto sm:p-1.5 sm:hover:bg-[#E5E3DE]/40 sm:hover:text-[#111827]"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(fabric.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-[#6B7280] hover:text-[#DC2626] transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <FabricModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingFabric(null)
        }}
        onSaved={() => loadFabrics(true)}
        tailorId={tailorId}
        initialData={editingFabric}
      />
      <button
        type="button"
        className="mobile-fab md:hidden"
        aria-label="Add fabric"
        onClick={() => {
          setEditingFabric(null)
          setModalOpen(true)
        }}
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
