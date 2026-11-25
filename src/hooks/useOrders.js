import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { fetchShopOrders, getCachedShopData } from '../lib/shopData'

export function useOrders() {
  const { session, profile } = useAuth()
  const tailorId = session?.user?.id || profile?.id

  const [orders, setOrders] = useState(() => {
    return getCachedShopData('orders', tailorId) ?? []
  })
  const [loading, setLoading] = useState(() => !getCachedShopData('orders', tailorId))
  const [error, setError] = useState(null)

  const fetchOrders = useCallback(async (force = false) => {
    if (!tailorId) return
    if (!getCachedShopData('orders', tailorId)) {
      setLoading(true)
    }
    setError(null)

    try {
      const list = await fetchShopOrders(tailorId, force)
      setOrders(list)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tailorId])

  useEffect(() => {
    let active = true
    if (!tailorId) return undefined

    const cached = getCachedShopData('orders', tailorId)
    setOrders(cached ?? [])
    setLoading(!cached)

    fetchShopOrders(tailorId)
      .then((list) => {
        if (active) setOrders(list)
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
  }, [tailorId])

  return {
    orders,
    loading,
    error,
    refetch: () => fetchOrders(true)
  }
}
