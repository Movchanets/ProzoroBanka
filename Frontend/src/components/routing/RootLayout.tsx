import { Outlet } from '@tanstack/react-router'
import { RouteSeoSync } from '@/hooks/useRouteSeo'

export default function RootLayout() {
  return (
    <>
      <RouteSeoSync />
      <Outlet />
    </>
  )
}