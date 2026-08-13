import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EditTeamDialog } from '@/components/edit-team-dialog';
import { TeamActivitiesSection } from '@/components/team-activities-section';
import { TeamDocumentsSection } from '@/components/team-documents-section';
import { TeamMembersSection } from '@/components/team-members-section';
import { TeamProjectsSection } from '@/components/team-projects-section';
import { TeamTimeEntriesSection } from '@/components/team-time-entries-section';
import { TeamTimelineSection } from '@/components/team-timeline-section';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api-handler';
import type { TeamResponse } from '@/types/team';

type TeamTab =
  | 'atividades'
  | 'projetos'
  | 'membros'
  | 'apontamentos'
  | 'timeline'
  | 'documentos';

const TEAM_TABS = new Set<TeamTab>([
  'atividades',
  'projetos',
  'membros',
  'apontamentos',
  'timeline',
  'documentos',
]);

function parseTeamTab(value: string | null): TeamTab | null {
  if (!value || !TEAM_TABS.has(value as TeamTab)) {
    return null;
  }

  return value as TeamTab;
}

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();
  const tabFromUrl = parseTeamTab(searchParams.get('tab'));
  const dateFromUrl = searchParams.get('date') ?? undefined;
  const userIdFromUrl = searchParams.get('userId') ?? undefined;
  const [team, setTeam] = useState<TeamResponse['team'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TeamTab>(
    tabFromUrl ?? 'atividades',
  );

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

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
        <Button variant='ghost' size='sm' render={<Link to='/equipes' />}>
          <ArrowLeft />
          Voltar para equipe
        </Button>
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
              {team.role === 'ADMIN' ? (
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

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TeamTab)}
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
              <TabsTrigger
                value='timeline'
                className='data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary'
              >
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value='documentos'
                className='data-[state=active]:border-sidebar-primary data-[state=active]:text-sidebar-primary'
              >
                Documentos
              </TabsTrigger>
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
              <TeamActivitiesSection teamId={team.id} />
            </TabsContent>

            <TabsContent value='projetos'>
              <TeamProjectsSection teamId={team.id} />
            </TabsContent>

            <TabsContent value='apontamentos'>
              <TeamTimeEntriesSection teamId={team.id} />
            </TabsContent>

            <TabsContent value='timeline'>
              <TeamTimelineSection
                teamId={team.id}
                initialDate={dateFromUrl}
                userId={userIdFromUrl}
              />
            </TabsContent>

            <TabsContent value='documentos'>
              <TeamDocumentsSection
                teamId={team.id}
                canDelete={team.role === 'ADMIN'}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <p className='text-sm text-muted-foreground'>Equipe não encontrada.</p>
      )}
    </div>
  );
}
