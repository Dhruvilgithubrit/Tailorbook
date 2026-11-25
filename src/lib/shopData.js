import { supabase } from './supabase'

const cache = new Map()
const requests = new Map()
const generations = new Map()
const CACHE_MAX_AGE = 30_000

function cacheKey(type, tailorId) {
  return `${type}:${tailorId}`
}

export function getCachedShopData(type, tailorId) {
  return cache.get(cacheKey(type, tailorId))?.data
}

function storeShopData(type, tailorId, data) {
  cache.set(cacheKey(type, tailorId), { data, updatedAt: Date.now() })
}

export function setCachedShopData(type, tailorId, data) {
  const key = cacheKey(type, tailorId)
  generations.set(key, (generations.get(key) ?? 0) + 1)
  requests.delete(key)
  storeShopData(type, tailorId, data)
}

export function invalidateShopData(tailorId, ...types) {
  for (const type of types) {
    const key = cacheKey(type, tailorId)
    cache.delete(key)
    requests.delete(key)
    generations.set(key, (generations.get(key) ?? 0) + 1)
  }
}

async function loadCached(type, tailorId, loader, force = false) {
  if (!tailorId) return []

  const key = cacheKey(type, tailorId)
  const cached = cache.get(key)
  if (!force && cached && Date.now() - cached.updatedAt < CACHE_MAX_AGE) {
    return cached.data
  }

  const pendingRequest = requests.get(key)
  if (pendingRequest) return pendingRequest

  const generation = generations.get(key) ?? 0
  let request
  request = loader()
    .then((data) => {
      if ((generations.get(key) ?? 0) === generation) {
        storeShopData(type, tailorId, data)
      }
      return data
    })
    .finally(() => {
      if (requests.get(key) === request) requests.delete(key)
    })

  requests.set(key, request)
  return request
}

export function fetchShopCustomers(tailorId, force = false) {
  return loadCached('customers', tailorId, async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, whatsapp, address, created_at')
      .eq('tailor_id', tailorId)
      .order('name', { ascending: true })

    if (error) throw error
    return data ?? []
  }, force)
}

export function fetchShopOrders(tailorId, force = false) {
  return loadCached('orders', tailorId, async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        bill_number,
        status,
        delivery_date,
        advance_paid,
        payment_mode,
        is_urgent,
        urgent_charge,
        created_at,
        customers(name, phone, whatsapp),
        order_items(id, item_type, total_price, stitching_price, fabric_meters, fabric_price)
      `)
      .eq('tailor_id', tailorId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data ?? []
  }, force)
}

export function fetchShopFabrics(tailorId, force = false) {
  return loadCached('fabrics', tailorId, async () => {
    const { data, error } = await supabase
      .from('fabrics')
      .select('*')
      .eq('tailor_id', tailorId)
      .order('color_name', { ascending: true })

    if (error) throw error
    return data ?? []
  }, force)
}

export function fetchShopStitchingPrices(tailorId, force = false) {
  return loadCached('stitchingPrices', tailorId, async () => {
    const { data, error } = await supabase
      .from('stitching_prices')
      .select('*')
      .eq('tailor_id', tailorId)

    if (error) throw error
    return data ?? []
  }, force)
}

export function prefetchShopData(tailorId) {
  if (!tailorId) return

  const preloads = [
    fetchShopCustomers(tailorId),
    fetchShopOrders(tailorId),
    fetchShopFabrics(tailorId),
    fetchShopStitchingPrices(tailorId),
  ]

  for (const preload of preloads) {
    preload.catch((error) => console.error('Error preloading shop data:', error))
  }
}
