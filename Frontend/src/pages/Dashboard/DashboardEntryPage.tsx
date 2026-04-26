import { Navigate } from 'react-router';
import { useAuthNavigation } from '@/hooks/useAuthNavigation';

export default function DashboardEntryPage() {
  const { defaultAuthenticatedPath } = useAuthNavigation();
  return <Navigate to={defaultAuthenticatedPath} replace />;
}
