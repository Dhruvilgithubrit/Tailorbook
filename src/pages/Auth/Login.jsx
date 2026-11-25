import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    })

    setLoading(false)

    if (authError) {
      if (authError.message?.toLowerCase().includes('email not confirmed')) {
        setError(
          'Email not confirmed. Please check your inbox for the confirmation link, or disable "Confirm email" in your Supabase Dashboard.'
        )
      } else {
        setError(authError.message)
      }
      return
    }

    // Redirect to dashboard
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-11 h-11 bg-[#4F46E5] text-white rounded-lg mb-3 text-lg font-bold">
          T
        </div>
        <h1 className="text-2xl font-bold text-[#111827] tracking-tight">TailorBook</h1>
        <p className="text-[#6B7280] text-sm mt-1">Smart Shop Management for Tailors</p>
      </div>

      {/* Centered White Card */}
      <div className="w-full max-w-md rounded-xl border border-[#E5E3DE] bg-white p-5 sm:p-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#111827]">Welcome Back</h2>
          <p className="text-[#6B7280] text-sm mt-1">Sign in to manage your shop</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-700 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
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
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
            autoComplete="current-password"
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
              <span>Login</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-[#E5E3DE] text-center">
          <p className="text-sm text-[#6B7280]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-[#4F46E5] font-semibold hover:underline transition-colors"
            >
              Register your shop
            </Link>
          </p>
        </div>
      </div>

      {/* Footer subtle text */}
      <p className="text-xs text-[#6B7280] mt-8">
        &copy; {new Date().getFullYear()} TailorBook. All rights reserved.
      </p>
    </div>
  )
}
