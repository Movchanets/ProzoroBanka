import { Outlet } from 'react-router';
import { PublicHeader } from '@/components/public/PublicHeader';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
