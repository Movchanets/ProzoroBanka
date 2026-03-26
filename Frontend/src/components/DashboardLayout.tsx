import { useState, useEffect, useCallback } from 'react';
import { Outlet, useParams, useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '@/hooks/queries/useOrganizations';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import { useLogoutMutation } from '@/hooks/queries/useAuth';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useMyInvitations } from '@/hooks/queries/useInvitations';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Receipt,
  Megaphone,
  Settings,
  Users,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

const navItems = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '' },
  { labelKey: 'nav.campaigns', icon: Megaphone, path: 'campaigns' },
  { labelKey: 'nav.receipts', icon: Receipt, path: 'receipts' },
  { labelKey: 'nav.team', icon: Users, path: 'team' },
  { labelKey: 'nav.settings', icon: Settings, path: 'settings' },
];

function SidebarContent({
  orgId,
  collapsed,
  onCreateOrg,
  onToggleCollapse,
  closeMobile,
}: {
  orgId: string;
  collapsed: boolean;
  onCreateOrg: () => void;
  onToggleCollapse?: () => void;
  closeMobile?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <div className="px-2 pt-4 pb-2">
        <WorkspaceSwitcher onCreateClick={onCreateOrg} collapsed={collapsed} />
      </div>

      <Separator className="mx-3 w-auto" />

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            data-testid={`dashboard-nav-${item.path || 'home'}`}
            to={`/dashboard/${orgId}/${item.path}`}
            end={item.path === ''}
            onClick={closeMobile}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted',
                isActive && 'bg-primary/10 text-primary font-semibold',
                collapsed && 'justify-center px-2',
              )
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      {onToggleCollapse && (
        <div className="border-t border-border px-2 py-3">
          <button
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeft className="h-[18px] w-[18px]" />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px]" />
                <span className="flex-1 text-left">{t('nav.collapse')}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function DashboardHeader({ orgName, isLoading }: { orgName?: string; isLoading: boolean }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();
  const { data: incomingInvitations } = useMyInvitations();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate('/login', { replace: true });
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.trim().toUpperCase() || 'PB';
  const pendingIncomingCount = incomingInvitations?.filter((invitation) => invitation.status === 0).length ?? 0;

  return (
    <header className="flex items-center justify-between border-b border-border bg-card/60 py-3 pl-16 pr-4 backdrop-blur-lg md:px-6">
      <div className="min-w-0 flex items-center gap-3">
        {isLoading ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <h1 className="truncate text-lg font-semibold tracking-tight">{orgName}</h1>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 max-sm:shrink-0">
        <div className="flex items-center gap-1 border-r border-border/50 pr-2 sm:gap-2 sm:pr-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NavLink to="/profile" data-testid="dashboard-profile-link" className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted sm:px-3">
            <span className="relative">
              {user?.profilePhotoUrl ? (
                <img className="h-8 w-8 rounded-lg object-cover" src={user.profilePhotoUrl} alt={t('appShell.avatarAlt')} />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-secondary to-accent text-xs font-extrabold text-secondary-foreground">
                  {initials}
                </span>
              )}
              {pendingIncomingCount > 0 && (
                <span
                  data-testid="dashboard-profile-invitations-badge"
                  className="absolute -top-1.5 -right-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold leading-none text-primary-foreground"
                >
                  {pendingIncomingCount}
                </span>
              )}
            </span>
            <span className="hidden text-sm font-medium md:inline">
              {user?.firstName} {user?.lastName}
            </span>
          </NavLink>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={logoutMutation.isPending} className="h-9 gap-2 rounded-xl border-border/50 text-muted-foreground shadow-none hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 max-sm:w-9 max-sm:px-0">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{logoutMutation.isPending ? t('nav.logoutPending') : t('nav.logout')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const setActiveOrg = useWorkspaceStore((s) => s.setActiveOrg);
  const { data: org, isLoading } = useOrganization(orgId);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (orgId) setActiveOrg(orgId);
  }, [orgId, setActiveOrg]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (!orgId) {
    navigate('/onboarding', { replace: true });
    return null;
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <aside className={cn('hidden flex-col border-r border-border bg-card/40 backdrop-blur-lg transition-[width] duration-200 md:flex', collapsed ? 'w-[68px]' : 'w-64')}>
          <SidebarContent orgId={orgId} collapsed={collapsed} onCreateOrg={() => setCreateDialogOpen(true)} onToggleCollapse={() => setCollapsed((c) => !c)} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button data-testid="dashboard-mobile-menu-button" variant="ghost" size="icon" className="fixed left-3 top-3 z-40 md:hidden" aria-label={t('nav.openMenu')}>
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">{t('nav.navigation')}</SheetTitle>
            <SidebarContent orgId={orgId} collapsed={false} onCreateOrg={() => { setMobileOpen(false); setCreateDialogOpen(true); }} closeMobile={closeMobile} />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader orgName={org?.name} isLoading={isLoading} />
          <main className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>

      <CreateOrganizationDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}
