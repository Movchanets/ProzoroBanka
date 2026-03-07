import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLogoutMutation } from '../hooks/queries/useAuth';
import { Button } from '@/components/ui/button';

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase() || 'PB';
}

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate('/login', { replace: true });
  };

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <div>
          <span className="workspace-header__eyebrow">ProzoroBanka</span>
          <h1>Кабінет волонтера</h1>
          <p>Оновлюйте профіль, фото і підтримуйте готовність до завантаження чеків без окремого адмін-кроку.</p>
        </div>

        <div className="workspace-user">
          {user?.profilePhotoUrl ? (
            <img className="workspace-user__avatar" src={user.profilePhotoUrl} alt="Фото профілю" />
          ) : (
            <div className="workspace-user__avatar workspace-user__avatar--fallback">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
          )}

          <div className="workspace-user__meta">
            <strong>{user?.firstName} {user?.lastName}</strong>
            <span>{user?.email}</span>
          </div>

          <Button
            type="button"
            className="ghost-button"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            variant="ghost"
          >
            {logoutMutation.isPending ? 'Вихід…' : 'Вийти'}
          </Button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}