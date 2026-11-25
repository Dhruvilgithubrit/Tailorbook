import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  fetchShopStitchingPrices,
  getCachedShopData,
  setCachedShopData,
} from '../../lib/shopData'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import {
  Save,
  Store,
  Scissors,
  Upload,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Image as ImageIcon
} from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'

// Master garment list as specified: Shirt, Pant, Suit, Kurta, Blouse, Coat
const STITCHING_ITEM_TYPES = [
  'Shirt',
  'Pant',
  'Suit',
  'Kurta',
  'Blouse',
  'Coat'
]

export default function Settings() {
  const { profile, refreshProfile } = useAuth()

  // 1. Shop Profile State
  const [shopForm, setShopForm] = useState({
    shop_name: '',
    owner_name: '',
    phone: '',
    address: '',
    upi_id: '',
    logo_url: '',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // 2. Stitching Prices State (inline editable per item)
  const [stitchPrices, setStitchPrices] = useState({
    Shirt: 300,
    Pant: 250,
    Suit: 1500,
    Kurta: 350,
    Blouse: 400,
    Coat: 1000,
  })
  const [pricesSaving, setPricesSaving] = useState(false)
  const [pricesSuccess, setPricesSuccess] = useState('')
  const [pricesError, setPricesError] = useState('')

  const [loading, setLoading] = useState(() => !getCachedShopData('stitchingPrices', profile?.id))

  // Fetch saved profile & stitching prices
  useEffect(() => {
    if (!profile) return

    setShopForm({
      shop_name: profile.shop_name || '',
      owner_name: profile.owner_name || '',
      phone: profile.phone || '',
      address: profile.address || '',
      upi_id: profile.upi_id || '',
      logo_url: profile.logo_url || '',
    })

    if (profile.logo_url) {
      setLogoPreview(profile.logo_url)
    }

    let active = true
    const cachedPrices = getCachedShopData('stitchingPrices', profile.id)
    if (cachedPrices?.length) {
      const loadedPrices = Object.fromEntries(cachedPrices.map((row) => [row.item_type, row.price]))
      setStitchPrices((prev) => ({ ...prev, ...loadedPrices }))
    }
    setLoading(!cachedPrices)

    fetchShopStitchingPrices(profile.id)
      .then((data) => {
        if (!active || !data.length) return
        const loadedPrices = Object.fromEntries(data.map((row) => [row.item_type, row.price]))
        setStitchPrices((prev) => ({ ...prev, ...loadedPrices }))
      })
      .catch((error) => {
        if (active) {
          setPricesError(error.message)
          console.error('Error loading stitching prices:', error)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [profile])

  const setS = (k) => (e) => setShopForm((f) => ({ ...f, [k]: e.target.value }))

  // Handle Logo file selection & preview
  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  // Save Shop Profile (uploads logo to Supabase Storage if chosen)
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profile?.id) return

    setProfileSaving(true)
    setProfileSuccess('')
    setProfileError('')

    let finalLogoUrl = shopForm.logo_url

    // Upload logo to Supabase storage bucket 'logos' if user selected a file
    if (logoFile) {
      try {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${profile.id}/shop-logo-${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile, { upsert: true })

        if (!uploadErr && uploadData) {
          const { data: pubData } = supabase.storage.from('logos').getPublicUrl(fileName)
          finalLogoUrl = pubData?.publicUrl || ''
        } else if (uploadErr) {
          console.warn('Logo upload note:', uploadErr.message)
        }
      } catch (uploadException) {
        console.warn('Storage bucket exception:', uploadException)
      }
    }

    const { error: updErr } = await supabase
      .from('tailor_profiles')
      .update({
        shop_name: shopForm.shop_name.trim(),
        owner_name: shopForm.owner_name.trim(),
        phone: shopForm.phone.trim(),
        address: shopForm.address.trim(),
        upi_id: shopForm.upi_id.trim(),
        logo_url: finalLogoUrl,
      })
      .eq('id', profile.id)

    setProfileSaving(false)

    if (updErr) {
      setProfileError(updErr.message)
      return
    }

    await refreshProfile()
    setProfileSuccess('Shop profile updated successfully!')
    setTimeout(() => setProfileSuccess(''), 3500)
  }

  // Update inline stitching price in local state
  const handlePriceChange = (itemType, val) => {
    setStitchPrices((prev) => ({
      ...prev,
      [itemType]: val,
    }))
    setPricesSuccess('')
  }

  // Save Stitching Prices Master List to database
  const handleSavePrices = async () => {
    if (!profile?.id) return
    setPricesSaving(true)
    setPricesSuccess('')
    setPricesError('')

    // Upsert each item type row for this tailor
    const rows = STITCHING_ITEM_TYPES.map((type) => ({
      tailor_id: profile.id,
      item_type: type,
      price: parseFloat(stitchPrices[type]) || 0,
    }))

    // Delete previous prices and insert latest (or upsert)
    const { error: delErr } = await supabase
      .from('stitching_prices')
      .delete()
      .eq('tailor_id', profile.id)

    const { error: insErr } = await supabase
      .from('stitching_prices')
      .insert(rows)

    setPricesSaving(false)

    if (insErr || delErr) {
      setPricesError((insErr || delErr)?.message || 'Failed to update prices.')
      return
    }

    setCachedShopData('stitchingPrices', profile.id, rows)
    setPricesSuccess('Stitching price master updated successfully!')
    setTimeout(() => setPricesSuccess(''), 3500)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl space-y-8 pb-16">
      <div className="hidden sm:block">
        <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">Shop Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your tailor shop details, logo branding, and default stitching rates.
        </p>
      </div>

      {/* SECTION 1: SHOP PROFILE */}
      <Card className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <Store size={22} className="text-[#4F46E5]" />
          <div>
            <h2 className="text-lg font-bold text-[#111827]">Shop Profile & Branding</h2>
            <p className="text-xs text-slate-500">
              This info is printed at the top of every generated PDF bill.
            </p>
          </div>
        </div>

        {profileSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Logo Upload Box */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E3DE]">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Shop Logo"
                className="w-20 h-20 rounded-lg object-cover border border-[#E5E3DE] shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-white border border-dashed border-[#E5E3DE] flex items-center justify-center shrink-0 text-slate-400">
                <ImageIcon size={26} />
              </div>
            )}

            <div className="space-y-1.5 flex-1">
              <label className="text-sm font-bold text-slate-800 block">
                Shop Logo
              </label>
              <p className="text-xs text-slate-500">
                Square PNG, JPG, or SVG recommended. Shows on customer PDF bills.
              </p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F8F7F4] text-[#374151] text-xs font-semibold transition-colors mt-1">
                <Upload size={14} className="text-slate-500" />
                <span>{logoFile ? logoFile.name : 'Choose Logo File...'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop Name"
              placeholder="e.g. Royal Tailors & Drapers"
              value={shopForm.shop_name}
              onChange={setS('shop_name')}
              required
            />
            <Input
              label="Owner / Master Tailor Name"
              placeholder="e.g. Master Ahmed"
              value={shopForm.owner_name}
              onChange={setS('owner_name')}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="e.g. 9876543210"
              value={shopForm.phone}
              onChange={setS('phone')}
            />
            <Input
              label="UPI ID (for payments)"
              placeholder="e.g. royaltailors@upi"
              value={shopForm.upi_id}
              onChange={setS('upi_id')}
              hint="Printed on PDF bills when payment mode is UPI"
            />
          </div>

          <Input
            label="Shop Address"
            placeholder="e.g. Shop #12, First Floor, Central Market, MG Road, Mumbai"
            value={shopForm.address}
            onChange={setS('address')}
          />

          <div className="pt-2">
            <Button
              type="submit"
              size="md"
              loading={profileSaving}
              className="w-full sm:w-auto"
            >
              <Save size={16} />
              <span>Save Shop Profile</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* SECTION 2: STITCHING PRICES MASTER TABLE */}
      <Card className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Scissors size={22} className="text-[#4F46E5]" />
            <div>
              <h2 className="text-lg font-bold text-[#111827]">Default Stitching Rates</h2>
              <p className="text-xs text-slate-500">
                These prices automatically populate in every new order and can be edited per order.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSavePrices}
            loading={pricesSaving}
            className=""
          >
            <Save size={14} />
            <span>Save Prices</span>
          </Button>
        </div>

        {pricesSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{pricesSuccess}</span>
          </div>
        )}

        {pricesError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            <span>{pricesError}</span>
          </div>
        )}

        {/* Stitching Rates Table */}
        <div className="border border-[#E5E3DE] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-2 py-3 sm:px-5">Garment Item Type</th>
                <th className="px-2 py-3 text-right sm:px-5">Default Stitching Price (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {STITCHING_ITEM_TYPES.map((type) => {
                const currentVal = stitchPrices[type] ?? ''

                return (
                  <tr key={type} className="hover:bg-slate-50/60 transition-colors">
                    <td className="flex items-center gap-2.5 px-2 py-3.5 font-semibold text-slate-900 sm:px-5">
                      <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                      <span>{type}</span>
                    </td>
                    <td className="px-2 py-3.5 text-right sm:px-5">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <span className="text-slate-400 font-semibold text-sm">₹</span>
                        <input
                          type="number"
                          step="10"
                          min="0"
                          value={currentVal}
                          onChange={(e) => handlePriceChange(type, e.target.value)}
                          placeholder="0"
                          className="w-full max-w-28 min-h-11 text-right font-bold text-[#111827] border border-[#E5E3DE] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent bg-white"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            size="md"
            onClick={handleSavePrices}
            loading={pricesSaving}
            className=""
          >
            <Save size={16} />
            <span>Save All Stitching Prices</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
