import { useState } from 'react';
import {
  CalendarCheck,
  CalendarOff,
  Crown,
  EllipsisIcon,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';

import { AddTeamMemberDialog } from '@/components/add-team-member-dialog';
import { DemoteTeamAdminDialog } from '@/components/demote-team-admin-dialog';
import { PromoteTeamAdminDialog } from '@/components/promote-team-admin-dialog';
import { RemoveTeamMemberDialog } from '@/components/remove-team-member-dialog';
import { SetMemberAbsentDialog } from '@/components/set-member-absent-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { getInitials } from '@/lib/initials';
import { cn } from '@/lib/utils';
import type { TeamMemberSummary, TeamRole, TeamSummary } from '@/types/team';

const ROLE_LABELS: Record<TeamMemberSummary['role'], string> = {
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

interface TeamMembersSectionProps {
  teamId: string;
  members: TeamMemberSummary[];
  currentUserRole: TeamRole;
  onTeamUpdated: (team: TeamSummary) => void;
}

export function TeamMembersSection({
  teamId,
  members,
  currentUserRole,
  onTeamUpdated,
}: TeamMembersSectionProps) {
  const { user } = useAuth();
  const [memberToRemove, setMemberToRemove] =
    useState<TeamMemberSummary | null>(null);
  const [memberToPromoteAdmin, setMemberToPromoteAdmin] =
    useState<TeamMemberSummary | null>(null);
  const [memberToDemoteAdmin, setMemberToDemoteAdmin] =
    useState<TeamMemberSummary | null>(null);
  const [memberToToggleAbsent, setMemberToToggleAbsent] =
    useState<TeamMemberSummary | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const canManageMembers = currentUserRole === 'ADMIN';
  const adminCount = members.filter((member) => member.role === 'ADMIN').length;

  const addMemberButton = canManageMembers ? (
    <Button size='sm' onClick={() => setIsAddDialogOpen(true)}>
      <UserPlus />
      adicionar novo membro
    </Button>
  ) : null;

  return (
    <div className='flex flex-col gap-3'>
      {canManageMembers ? (
        <AddTeamMemberDialog
          teamId={teamId}
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onAdded={onTeamUpdated}
        />
      ) : null}

      <RemoveTeamMemberDialog
        teamId={teamId}
        member={memberToRemove}
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToRemove(null);
          }
        }}
        onRemoved={onTeamUpdated}
      />

      <PromoteTeamAdminDialog
        teamId={teamId}
        member={memberToPromoteAdmin}
        open={memberToPromoteAdmin !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToPromoteAdmin(null);
          }
        }}
        onPromoted={onTeamUpdated}
      />

      <DemoteTeamAdminDialog
        teamId={teamId}
        member={memberToDemoteAdmin}
        open={memberToDemoteAdmin !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToDemoteAdmin(null);
          }
        }}
        onDemoted={onTeamUpdated}
      />

      <SetMemberAbsentDialog
        teamId={teamId}
        member={memberToToggleAbsent}
        open={memberToToggleAbsent !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToToggleAbsent(null);
          }
        }}
        onUpdated={onTeamUpdated}
      />

      {members.length === 0 && !canManageMembers ? (
        <p className='text-sm text-muted-foreground'>
          Nenhum membro nesta equipe.
        </p>
      ) : (
        <ul className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {members.map((member) => {
            const canRemove = canManageMembers && user?.id !== member.id;
            const canPromoteAdmin =
              canManageMembers &&
              user?.id !== member.id &&
              member.role === 'MEMBER';
            const canDemoteAdmin =
              canManageMembers &&
              user?.id !== member.id &&
              member.role === 'ADMIN' &&
              adminCount > 1;
            return (
              <li
                key={member.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5 transition-opacity',
                  member.absent && 'opacity-45',
                )}
              >
                <Avatar size='sm'>
                  <AvatarFallback className='text-xs'>
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>

                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-1'>
                    <p className='truncate text-sm font-medium'>
                      {member.name}
                    </p>
                    {member.role === 'ADMIN' ? (
                      <Crown
                        className='size-3 shrink-0 text-sidebar-primary'
                        aria-label='Administrador'
                      />
                    ) : null}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {ROLE_LABELS[member.role]}
                    {member.absent ? ' · Ausente' : ''}
                  </p>
                </div>

                {canManageMembers ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon-xs'
                          className='shrink-0 text-muted-foreground hover:text-foreground'
                          aria-label={`Ações para ${member.name}`}
                        />
                      }
                    >
                      <EllipsisIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        onClick={() => setMemberToToggleAbsent(member)}
                      >
                        {member.absent ? <CalendarCheck /> : <CalendarOff />}
                        {member.absent
                          ? 'Marcar como disponível'
                          : 'Marcar como ausente'}
                      </DropdownMenuItem>

                      {canPromoteAdmin ? (
                        <DropdownMenuItem
                          onClick={() => setMemberToPromoteAdmin(member)}
                        >
                          <Crown />
                          Tornar administrador
                        </DropdownMenuItem>
                      ) : null}

                      {canDemoteAdmin ? (
                        <DropdownMenuItem
                          onClick={() => setMemberToDemoteAdmin(member)}
                        >
                          <UserMinus />
                          Remover administrador
                        </DropdownMenuItem>
                      ) : null}

                      {canRemove ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant='destructive'
                            onClick={() => setMemberToRemove(member)}
                          >
                            <X />
                            Remover membro
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            );
          })}
          {addMemberButton ? (
            <li className='flex items-center justify-center rounded-lg border border-dashed px-2 py-1.5'>
              {addMemberButton}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
