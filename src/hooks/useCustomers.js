import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { fetchShopCustomers, getCachedShopData } from '../lib/shopData'

export function useCustomers() {
  const { session, profile } = useAuth()
  const tailorId = session?.user?.id || profile?.id

  const [customers, setCustomers] = useState(() => {
    return getCachedShopData('customers', tailorId) ?? []
  })
  const [loading, setLoading] = useState(() => !getCachedShopData('customers', tailorId))
  const [error, setError] = useState(null)

  const fetchCustomers = useCallback(async (force = false) => {
    if (!tailorId) return
    if (!getCachedShopData('customers', tailorId)) {
      setLoading(true)
    }
    setError(null)

    try {
      const list = await fetchShopCustomers(tailorId, force)
      setCustomers(list)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tailorId])

  useEffect(() => {
    let active = true
    if (!tailorId) return undefined

    const cached = getCachedShopData('customers', tailorId)
    setCustomers(cached ?? [])
    setLoading(!cached)

    fetchShopCustomers(tailorId)
      .then((list) => {
        if (active) setCustomers(list)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tailorId, fetchCustomers])

  return {
    customers,
    loading,
    error,
    refetch: () => fetchCustomers(true)
  }
}
