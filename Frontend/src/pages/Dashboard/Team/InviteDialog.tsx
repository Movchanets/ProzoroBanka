import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCreateInviteLink, useInviteByEmail } from '@/hooks/queries/useInvitations';
import { OrganizationRole, OrganizationRoleLabel } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

export function InviteDialog({ open, onOpenChange, orgId }: InviteDialogProps) {
  const { t } = useTranslation();
  const createInviteLink = useCreateInviteLink(orgId);
  const inviteByEmail = useInviteByEmail(orgId);

  const [activeTab, setActiveTab] = useState<'link' | 'email'>('link');
  const [role, setRole] = useState<typeof OrganizationRole.Admin | typeof OrganizationRole.Reporter>(OrganizationRole.Reporter);
  const [email, setEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedExpiry, setGeneratedExpiry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBusy = createInviteLink.isPending || inviteByEmail.isPending;

  const formattedExpiry = useMemo(() => {
    if (!generatedExpiry) {
      return null;
    }

    return new Date(generatedExpiry).toLocaleString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [generatedExpiry]);

  const resetState = () => {
    setActiveTab('link');
    setRole(OrganizationRole.Reporter);
    setEmail('');
    setGeneratedLink(null);
    setGeneratedExpiry(null);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }

    onOpenChange(nextOpen);
  };

  const handleGenerateLink = async () => {
    setError(null);

    try {
      const invitation = await createInviteLink.mutateAsync({ role, expiresInHours: 24 });
      if (!invitation.token) {
        throw new Error(t('team.invite.linkMissingToken'));
      }

      const link = `${window.location.origin}/invite/${invitation.token}`;
      setGeneratedLink(link);
      setGeneratedExpiry(invitation.expiresAt);
      toast.success(t('team.invite.linkGenerated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedLink);
      toast.success(t('team.invite.linkCopied'));
    } catch {
      toast.error(t('team.invite.linkCopyError'));
    }
  };

  const handleInviteByEmail = async () => {
    setError(null);

    try {
      await inviteByEmail.mutateAsync({ email: email.trim(), role });
      toast.success(t('team.invite.emailSent'));
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]" data-testid="team-invite-dialog">
        <DialogHeader>
          <DialogTitle>{t('team.invite.title')}</DialogTitle>
          <DialogDescription>{t('team.invite.description')}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" data-testid="team-invite-error-alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'link' | 'email')} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" data-testid="team-invite-link-tab">{t('team.invite.tabs.link')}</TabsTrigger>
            <TabsTrigger value="email" data-testid="team-invite-email-tab">{t('team.invite.tabs.email')}</TabsTrigger>
          </TabsList>

          <div className="space-y-2">
            <Label htmlFor="team-invite-role-select">{t('common.roles')}</Label>
            <Select value={String(role)} onValueChange={(value) => setRole(Number(value) as typeof OrganizationRole.Admin | typeof OrganizationRole.Reporter)}>
              <SelectTrigger id="team-invite-role-select" data-testid="team-invite-role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(OrganizationRole.Admin)}>{t(OrganizationRoleLabel[OrganizationRole.Admin])}</SelectItem>
                <SelectItem value={String(OrganizationRole.Reporter)}>{t(OrganizationRoleLabel[OrganizationRole.Reporter])}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="link" className="space-y-3">
            <Button type="button" onClick={handleGenerateLink} disabled={isBusy} data-testid="team-invite-generate-link-button">
              {createInviteLink.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('team.invite.generateLink')}
            </Button>

            {generatedLink && (
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <Label htmlFor="team-invite-link-input">{t('team.invite.generatedLinkLabel')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="team-invite-link-input"
                    value={generatedLink}
                    readOnly
                    data-testid="team-invite-link-input"
                  />
                  <Button type="button" variant="outline" onClick={handleCopyLink} data-testid="team-invite-copy-link-button">
                    {t('team.invite.copyLink')}
                  </Button>
                </div>
                {formattedExpiry && (
                  <p className="text-xs text-muted-foreground" data-testid="team-invite-link-expiry">
                    {t('invitations.tab.expiresPrefix')} {formattedExpiry}
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="team-invite-email-input">{t('common.email')}</Label>
              <Input
                id="team-invite-email-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                data-testid="team-invite-email-input"
              />
            </div>

            <Button
              type="button"
              onClick={handleInviteByEmail}
              disabled={!email.trim() || isBusy}
              data-testid="team-invite-send-email-button"
            >
              {inviteByEmail.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('team.invite.sendEmail')}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} data-testid="team-invite-close-button">
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
