import { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(user) {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('tailor_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!error && data) {
        setProfile(data)
      } else {
        // Fallback default from user metadata if table row is still creating
        setProfile({
          id: user.id,
          shop_name: user.user_metadata?.shop_name || 'My Tailor Shop',
          owner_name: user.user_metadata?.owner_name || user.email?.split('@')[0] || 'Tailor',
          phone: user.user_metadata?.phone || '',
          email: user.email,
        })
      }
    } catch (e) {
      console.warn('Error fetching tailor profile:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 1. Check active session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        // Set basic profile instantly from session so UI does not wait
        setProfile({
          id: session.user.id,
          shop_name: session.user.user_metadata?.shop_name || 'My Tailor Shop',
          owner_name: session.user.user_metadata?.owner_name || session.user.email?.split('@')[0] || 'Tailor',
          phone: session.user.user_metadata?.phone || '',
          email: session.user.email,
        })
        setLoading(false)
        fetchProfile(session.user)
      } else {
        setLoading(false)
      }
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          setLoading(false)
          fetchProfile(session.user)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()

  const refreshProfile = () => {
    if (session?.user) fetchProfile(session.user)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

