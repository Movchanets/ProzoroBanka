import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { PublicTeamMember } from '@/types';

interface TeamAvatarRowProps {
  members: PublicTeamMember[];
}

export function TeamAvatarRow({ members }: TeamAvatarRowProps) {
  return (
    <div data-testid="public-org-team-row" className="flex flex-wrap gap-3">
      {members.map((member) => {
        const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase();
        return (
          <div key={member.userId} className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
            <Avatar className="size-8">
              <AvatarImage src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-foreground">{member.firstName} {member.lastName}</span>
          </div>
        );
      })}
      {members.length === 0 ? <p className="text-sm text-muted-foreground">Команда ще не відображається</p> : null}
    </div>
  );
}
