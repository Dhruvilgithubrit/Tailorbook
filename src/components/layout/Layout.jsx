import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import MobileNav from './MobileNav'
import MobileHeader from './MobileHeader'
import { useAuth } from '../../hooks/useAuth'
import { prefetchShopData } from '../../lib/shopData'

export default function Layout() {
  const { session, profile } = useAuth()
  const tailorId = session?.user?.id || profile?.id

  useEffect(() => {
    prefetchShopData(tailorId)
  }, [tailorId])

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4] text-[#111827]">
      <div className="hidden md:block">
        <Navbar />
      </div>
      <MobileHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 pb-24 sm:px-6 md:py-6 md:pb-6 lg:px-8 lg:py-8 lg:pb-8">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}
