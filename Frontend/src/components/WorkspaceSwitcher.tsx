import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useMyOrganizations } from '@/hooks/queries/useOrganizations';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getImageUrl } from '@/lib/utils';

interface WorkspaceSwitcherProps {
  onCreateClick?: () => void;
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ onCreateClick, collapsed }: WorkspaceSwitcherProps) {
  const { data: orgs, isLoading } = useMyOrganizations();
  const activeOrgId = useWorkspaceStore((s) => s.activeOrgId);
  const setActiveOrg = useWorkspaceStore((s) => s.setActiveOrg);

  const activeOrg = orgs?.find((o) => o.id === activeOrgId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        {!collapsed && <Skeleton className="h-4 w-28" />}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id="workspace-switcher"
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            collapsed && 'justify-center px-2',
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-primary/80 to-primary text-xs font-extrabold text-primary-foreground">
            {activeOrg?.logoStorageKey ? (
              <img
                src={getImageUrl(activeOrg.logoStorageKey)}
                alt={activeOrg.name}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              activeOrg?.name.charAt(0).toUpperCase() ?? (
                <Building2 className="h-4 w-4" />
              )
            )}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate">
                {activeOrg?.name ?? 'Оберіть організацію'}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Організації</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {orgs?.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => setActiveOrg(org.id)}
            className="gap-3"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-linear-to-br from-primary/80 to-primary text-[0.65rem] font-extrabold text-primary-foreground">
              {org.logoStorageKey ? (
                <img
                  src={getImageUrl(org.logoStorageKey)}
                  alt={org.name}
                  className="h-full w-full rounded-md object-cover"
                />
              ) : (
                org.name.charAt(0).toUpperCase()
              )}
            </span>
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === activeOrgId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}

        {orgs?.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Немає організацій
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateClick} className="gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-dashed border-border">
            <Plus className="h-4 w-4 text-muted-foreground" />
          </span>
          <span>Створити організацію</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
