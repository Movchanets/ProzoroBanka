import { useState } from 'react';
import { Link, Outlet, useNavigate, Navigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { AppRoles, hasAppRole } from '@/constants/appRoles';
import { useMyOrganizations } from '@/hooks/queries/useOrganizations';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  Building2,
  Tags,
  Users,
  KeyRound,
  Settings,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft
} from 'lucide-react';

const navItems = [
  { labelKey: 'admin.layout.nav.organizations', icon: Building2, path: 'organizations' },
  { labelKey: 'admin.layout.nav.campaignCategories', icon: Tags, path: 'campaign-categories' },
  { labelKey: 'admin.layout.nav.users', icon: Users, path: 'users' },
  { labelKey: 'admin.layout.nav.roles', icon: KeyRound, path: 'roles' },
  { labelKey: 'admin.layout.nav.settings', icon: Settings, path: 'settings' },
];

function SidebarContent({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: organizations } = useMyOrganizations();
  const primaryOrganizationId = organizations?.[0]?.id;

  const handleBackToDashboard = () => {
    if (primaryOrganizationId) {
      navigate({ to: '/dashboard/$orgId', params: { orgId: primaryOrganizationId } });
      return;
    }

    navigate({ to: '/onboarding' });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <ShieldAlert className="h-6 w-6 text-primary" />
        {!collapsed && <span className="text-lg font-bold">{t('admin.layout.title')}</span>}
      </div>

      <Separator className="mx-3 w-auto" />

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            data-testid={`admin-nav-${item.path || 'organizations'}`}
            to={item.path === 'organizations' ? '/admin/organizations' : `/admin/${item.path}`}
            activeOptions={{ exact: item.path === 'organizations' }}
            activeProps={{
              className: cn(
                'flex items-center gap-3 rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-muted',
                collapsed && 'justify-center px-2',
              ),
            }}
            inactiveProps={{
              className: cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted',
                collapsed && 'justify-center px-2',
              ),
            }}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border px-2 py-3">
        <button
          onClick={handleBackToDashboard}
          className="mb-2 flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? (
            <ArrowLeft className="h-4.5 w-4.5" />
          ) : (
            <>
              <ArrowLeft className="h-4.5 w-4.5" />
              <span className="flex-1 text-left">{t('admin.layout.back')}</span>
            </>
          )}
        </button>
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeft className="h-4.5 w-4.5" />
          ) : (
            <>
              <PanelLeftClose className="h-4.5 w-4.5" />
              <span className="flex-1 text-left">{t('admin.layout.collapse')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function AdminHeader() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.trim().toUpperCase() || 'AM';

  return (
    <header className="flex items-center justify-end border-b border-border bg-card/60 py-3 pr-4 backdrop-blur-lg md:px-6">
      <div className="flex items-center gap-2 sm:gap-4 max-sm:shrink-0">
        <div className="flex items-center gap-1 border-r border-border/50 pr-2 sm:gap-2 sm:pr-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors sm:px-3">
            <span className="relative">
              {user?.profilePhotoUrl ? (
                <img className="h-8 w-8 rounded-lg object-cover" src={user.profilePhotoUrl} alt="Avatar" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-secondary to-accent text-xs font-extrabold text-secondary-foreground">
                  {initials}
                </span>
              )}
            </span>
            <span className="hidden text-sm font-medium md:inline">
              {user?.firstName} {user?.lastName} ({t('admin.layout.roleAdmin')})
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Fallback check:
  if (!user || !hasAppRole(user.roles, AppRoles.Admin)) {
     return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={cn('hidden flex-col border-r border-border bg-card/40 backdrop-blur-lg transition-[width] duration-200 md:flex', collapsed ? 'w-17' : 'w-64')}>
        <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6 bg-muted/20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
