import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, User, Phone, MapPin, ChevronRight, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCustomers } from '../../hooks/useCustomers'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import EmptyState from '../../components/shared/EmptyState'

function AddCustomerModal({ isOpen, onClose, onSaved }) {
  const { session, profile } = useAuth()
  const tailorId = session?.user?.id || profile?.id

  const [form, setForm] = useState({ name: '', phone: '', whatsapp: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => {
    setForm((f) => {
      const next = { ...f, [k]: e.target.value }
      if (k === 'phone' && (f.whatsapp === f.phone || !f.whatsapp)) {
        next.whatsapp = e.target.value
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tailorId) return
    setError('')
    setLoading(true)

    const { error: insertErr } = await supabase.from('customers').insert({
      tailor_id: tailorId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim() || form.phone.trim(),
      address: form.address.trim(),
    })

    setLoading(false)
    if (insertErr) {
      setError(insertErr.message)
      return
    }

    setForm({ name: '', phone: '', whatsapp: '', address: '' })
    onSaved()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-[#DC2626]/30 rounded-lg text-xs text-[#DC2626]">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Full Name"
          placeholder="Rahul Sharma"
          value={form.name}
          onChange={set('name')}
          required
        />
        <Input
          label="Phone Number"
          type="tel"
          placeholder="9876543210"
          value={form.phone}
          onChange={set('phone')}
          required
        />
        <Input
          label="WhatsApp Number"
          type="tel"
          placeholder="Leave blank if same as phone"
          value={form.whatsapp}
          onChange={set('whatsapp')}
          hint="Defaults to phone number if left empty"
        />
        <Input
          label="Address"
          placeholder="Shop locality or area"
          value={form.address}
          onChange={set('address')}
        />
        <div className="pt-2">
          <Button type="submit" fullWidth loading={loading} size="md">
            Save Customer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function CustomersList() {
  const { customers, loading, refetch } = useCustomers()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.whatsapp?.includes(q)
    )
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="hidden flex-col sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#111827] tracking-tight">
            Customers
          </h1>
          <p className="text-[12px] text-[#6B7280] mt-0.5">
            Manage your client profiles, measurements, and order history
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="md">
          <Plus size={16} />
          <span>Add Customer</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="sticky top-14 z-20 -mx-4 bg-[#F8F7F4] px-4 py-2 sm:static sm:mx-0 sm:max-w-md sm:bg-transparent sm:p-0">
        <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          type="text"
          className="h-11 w-full rounded-lg border border-[#E5E3DE] bg-white py-2 pl-9 pr-4 text-base text-[#111827] placeholder-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none sm:h-auto sm:text-sm"
          placeholder="Search by customer name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] hover:text-[#111827]"
          >
            Clear
          </button>
        )}
        </div>
      </div>

      {/* Customer Table/List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title={search ? 'No matching customers' : 'No customers found'}
          description={
            search
              ? `No customer matches "${search}".`
              : 'Add your first customer to record body measurements and orders.'
          }
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              <span>Add Customer</span>
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E5E3DE] bg-white">
          <div className="divide-y divide-[#E5E3DE]">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to={`/customers/${c.id}`}
                className="flex min-h-[72px] items-center justify-between px-4 py-4 transition-colors group active:bg-[#F8F7F4] sm:px-5 sm:hover:bg-[#F8F7F4]"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#111827] group-hover:text-[#4F46E5] transition-colors truncate">
                      {c.name}
                    </p>
                    {c.whatsapp && c.whatsapp !== c.phone && (
                      <span className="text-[10px] text-[#16A34A] bg-[#F0FDF4] border border-[#DCFCE7] px-1.5 py-0.2 rounded font-medium">
                        WA
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[13px] text-[#6B7280] sm:text-xs">
                    <span className="flex items-center gap-1">
                      <Phone size={12} className="text-[#9CA3AF]" />
                      {c.phone || '—'}
                    </span>
                    {c.address && (
                      <span className="hidden sm:flex items-center gap-1 truncate max-w-xs">
                        <MapPin size={12} className="text-[#9CA3AF] shrink-0" />
                        {c.address}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] group-hover:text-[#4F46E5] transition-colors shrink-0">
                  <span className="hidden sm:inline">Profile</span>
                  <ChevronRight size={14} className="h-[18px] w-[18px] sm:h-[14px] sm:w-[14px]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
      <button
        type="button"
        className="mobile-fab md:hidden"
        aria-label="Add customer"
        onClick={() => setModalOpen(true)}
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
