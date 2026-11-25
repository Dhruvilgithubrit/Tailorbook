import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    shop_name: '',
    owner_name: '',
    phone: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 1. Supabase auth sign-up
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          shop_name: form.shop_name.trim(),
          owner_name: form.owner_name.trim(),
          phone: form.phone.trim(),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 2. Check if email confirmation is required
    const session = data?.session
    const user = data?.user

    // If a session exists right away (email confirmation disabled in Supabase)
    if (session) {
      if (user) {
        await supabase.from('tailor_profiles').upsert({
          id: user.id,
          shop_name: form.shop_name.trim(),
          owner_name: form.owner_name.trim(),
          phone: form.phone.trim(),
        })
      }
      setLoading(false)
      navigate('/dashboard')
    } else {
      // Email confirmation is required by Supabase project settings
      setLoading(false)
      setError(
        'Account created! Please check your email inbox to confirm your email, or disable "Confirm email" in your Supabase Dashboard (Auth -> Providers -> Email).'
      )
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-11 h-11 bg-[#4F46E5] text-white rounded-lg mb-3 text-lg font-bold">
          T
        </div>
        <h1 className="text-2xl font-bold text-[#111827] tracking-tight">TailorBook</h1>
        <p className="text-[#6B7280] text-sm mt-1">Setup Your Shop Online in Seconds</p>
      </div>

      {/* Centered White Card */}
      <div className="w-full max-w-md rounded-xl border border-[#E5E3DE] bg-white p-5 sm:p-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#111827]">Register Shop</h2>
          <p className="text-[#6B7280] text-sm mt-1">Create your tailor account</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-700 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <Input
            label="Shop Name"
            type="text"
            placeholder="e.g. Royal Tailors & Drapers"
            value={form.shop_name}
            onChange={set('shop_name')}
            autoComplete="off"
            required
          />

          <Input
            label="Owner / Tailor Name"
            type="text"
            placeholder="e.g. Master Ahmed"
            value={form.owner_name}
            onChange={set('owner_name')}
            autoComplete="off"
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="e.g. 9876543210"
            value={form.phone}
            onChange={set('phone')}
            autoComplete="off"
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="tailor@example.com"
            value={form.email}
            onChange={set('email')}
            autoComplete="off"
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              className="font-semibold"
            >
              <span>Create Shop Account</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-[#E5E3DE] text-center">
          <p className="text-sm text-[#6B7280]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#4F46E5] font-semibold hover:underline transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      <p className="text-xs text-[#6B7280] mt-8">
        &copy; {new Date().getFullYear()} TailorBook. All rights reserved.
      </p>
    </div>
  )
}
