import { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { AppLoadingFallback } from "@/components/AppLoadingFallback";
import { useAuthStore } from "@/stores/authStore";

function getGuestRedirectTarget(search: string) {
  const next = new URLSearchParams(search).get("next");

  // Reject if next is missing, doesn't start with /, or starts with // (protocol-relative)
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
}

export default function GuestGuard() {
  const isServer = typeof window === "undefined";
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const location = useLocation();
  const hasHydrated =  useAuthStore((state) => state._hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (isServer || !isMounted) {
    return <Outlet />;
  }

  if (!hasHydrated) {
    return <AppLoadingFallback />;
  }

  if (isAuthenticated) {
    return <Navigate to={getGuestRedirectTarget(location.search)} replace />;
  }

  return <Outlet />;
}
