import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BackButton } from '@/components/back-button';
import { EditTeamDialog } from '@/components/edit-team-dialog';
import { ReactivateTeamDialog } from '@/components/reactivate-team-dialog';
import { TeamActivitiesSection } from '@/components/team-activities-section';
import { TeamDocumentsSection } from '@/components/team-documents-section';
import { TeamMembersSection } from '@/components/team-members-section';
import { TeamProjectsSection } from '@/components/team-projects-section';
import { TeamSettingsSection } from '@/components/team-settings-section';
import { TeamTimeEntriesSection } from '@/components/team-time-entries-section';
import { TeamTimelineSection } from '@/components/team-timeline-section';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api-handler';
import { canCreateTeamActivities, canCreateTeamProjects, canViewTeamTimeline } from '@/lib/team-permissions';
import type { TeamResponse, TeamSummary } from '@/types/team';

type TeamTab =
  | 'atividades'
  | 'projetos'
  | 'membros'
  | 'apontamentos'
  | 'timeline'
  | 'documentos'
  | 'configuracoes';

const TEAM_TABS = new Set<TeamTab>([
  'atividades',
  'projetos',
  'membros',
  'apontamentos',
  'timeline',
  'documentos',
  'configuracoes',
]);

function parseTeamTab(value: string | null): TeamTab | null {
  if (!value || !TEAM_TABS.has(value as TeamTab)) {
    return null;
  }

  return value as TeamTab;
}

function resolveTeamTab(tab: TeamTab | null, team: TeamSummary): TeamTab {
  const requested = tab ?? 'atividades';

  if (requested === 'configuracoes' && team.role !== 'ADMIN') {
    return 'atividades';
  }

  if (requested === 'timeline' && !canViewTeamTimeline(team)) {
    return 'atividades';
  }

  return requested;
}

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = parseTeamTab(searchParams.get('tab'));
  const dateFromUrl = searchParams.get('date') ?? undefined;
  const userIdFromUrl = searchParams.get('userId') ?? undefined;
  const [team, setTeam] = useState<TeamResponse['team'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TeamTab>(
    tabFromUrl ?? 'atividades',
  );

  useEffect(() => {
    if (!team) {
      if (tabFromUrl) {
        setActiveTab(tabFromUrl);
      }
      return;
    }

    setActiveTab((current) => resolveTeamTab(tabFromUrl ?? current, team));
  }, [tabFromUrl, team]);

  useEffect(() => {
    if (!teamId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadTeam() {
      setIsLoading(true);

      try {
        const data = await api<TeamResponse>(`/teams/${teamId}`);
        if (!cancelled) {
          setTeam(data.team);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTeam();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return (
    <div className='flex min-w-0 flex-1 flex-col gap-6'>
      <div>
        <BackButton fallbackTo='/equipes' fallbackLabel='Voltar para equipes' />
      </div>

      {isLoading ? (
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-4 w-72' />
          <Skeleton className='h-8 w-32' />
          <Skeleton className='h-10 w-full max-w-md' />
          <Skeleton className='min-h-48 flex-1 rounded-xl' />
        </div>
      ) : team ? (
        <>
          <div className='flex flex-col gap-2'>
            <div className='flex min-w-0 items-center gap-2'>
              <h1 className='text-2xl font-bold'>{team.name}</h1>
              {team.role === 'ADMIN' && team.active ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  aria-label='Editar nome e descrição'
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Pencil />
                </Button>
              ) : null}
            </div>
            {team.description ? (
              <p className='text-muted-foreground'>{team.description}</p>
            ) : null}
            {!team.active ? (
              <div className='flex flex-col gap-3 rounded-lg border bg-muted/40 p-4'>
                <p className='text-sm text-muted-foreground'>
                  Esta equipe está inativa. Ela não aparece nas listagens nem no
                  analytics. Reative-a para voltar a usá-la.
                </p>
                {team.role === 'ADMIN' ? (
                  <Button
                    type='button'
                    className='w-fit'
                    onClick={() => setIsReactivateDialogOpen(true)}
                  >
                    Reativar equipe
                  </Button>
                ) : null}
              </div>
            ) : null}
            {(team.costCenters ?? []).length > 0 ? (
              <ul className='flex flex-wrap gap-1.5'>
                {team.costCenters.map((item) => (
                  <li
                    key={item.id}
                    className='rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground'
                  >
                    {item.description.trim()
                      ? `${item.costCenter} · ${item.description}`
                      : item.costCenter}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <EditTeamDialog
            team={team}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onUpdated={setTeam}
          />
          <ReactivateTeamDialog
            team={team}
            open={isReactivateDialogOpen}
            onOpenChange={setIsReactivateDialogOpen}
            onUpdated={(updated) => {
              setTeam(updated);
              void refreshUser();
            }}
          />

          {team.active ? (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              const tab = value as TeamTab;
              setActiveTab(tab);
              // Mantem a aba na URL para que o botao voltar de paginas
              // internas (projeto, atividade) retorne para a aba correta.
              setSearchParams(
                (current) => {
                  const next = new URLSearchParams(current);
                  next.set('tab', tab);
                  return next;
                },
                { replace: true },
              );
            }}
            className='min-w-0 flex-1'
          >
            <TabsList className='border-sidebar-border'>
              <TabsTrigger
                value='atividades'
                className='data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary'
              >
                Atividades
              </TabsTrigger>
              <TabsTrigger
                value='projetos'
                className='data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary'
              >
                Projetos
              </TabsTrigger>
              <TabsTrigger
                value='membros'
                className='data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary'
              >
                Membros
              </TabsTrigger>
              <TabsTrigger
                value='apontamentos'
                className='data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary'
              >
                Apontamentos
              </TabsTrigger>
              {canViewTeamTimeline(team) ? (
                <TabsTrigger
                  value='timeline'
                  className='data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary'
                >
                  Timeline
                </TabsTrigger>
              ) : null}
              <TabsTrigger
                value='documentos'
                className='data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary'
              >
                Documentos
              </TabsTrigger>
              {team.role === 'ADMIN' ? (
                <TabsTrigger
                  value='configuracoes'
                  className='data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary'
                >
                  Configurações
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value='membros'>
              <TeamMembersSection
                teamId={team.id}
                members={team.members}
                currentUserRole={team.role}
                onTeamUpdated={setTeam}
              />
            </TabsContent>

            <TabsContent value='atividades'>
              <TeamActivitiesSection
                teamId={team.id}
                canCreate={canCreateTeamActivities(team)}
              />
            </TabsContent>

            <TabsContent value='projetos'>
              <TeamProjectsSection
                teamId={team.id}
                canCreate={canCreateTeamProjects(team)}
              />
            </TabsContent>

            <TabsContent value='apontamentos'>
              <TeamTimeEntriesSection teamId={team.id} />
            </TabsContent>

            {canViewTeamTimeline(team) ? (
              <TabsContent value='timeline'>
                <TeamTimelineSection
                  teamId={team.id}
                  initialDate={dateFromUrl}
                  userId={userIdFromUrl}
                />
              </TabsContent>
            ) : null}

            <TabsContent value='documentos'>
              <TeamDocumentsSection
                teamId={team.id}
                canDelete={team.role === 'ADMIN'}
              />
            </TabsContent>

            {team.role === 'ADMIN' ? (
              <TabsContent value='configuracoes'>
                <TeamSettingsSection team={team} onTeamUpdated={setTeam} />
              </TabsContent>
            ) : null}
          </Tabs>
          ) : null}
        </>
      ) : (
        <p className='text-sm text-muted-foreground'>Equipe não encontrada.</p>
      )}
    </div>
  );
}
