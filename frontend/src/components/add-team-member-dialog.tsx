import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { api } from '@/lib/api-handler';
import type {
  AddTeamMemberInput,
  AvailableTeamMembersResponse,
  TeamResponse,
  TeamUserOption,
} from '@/types/team';

type UserComboboxOption = {
  value: string;
  label: string;
};

interface AddTeamMemberDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (team: TeamResponse['team']) => void;
}

function toComboboxOption(user: TeamUserOption): UserComboboxOption {
  return {
    value: user.id,
    label: `${user.name} (${user.employeeId})`,
  };
}

export function AddTeamMemberDialog({
  teamId,
  open,
  onOpenChange,
  onAdded,
}: AddTeamMemberDialogProps) {
  const [users, setUsers] = useState<TeamUserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserComboboxOption | null>(
    null,
  );
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userOptions = useMemo(() => users.map(toComboboxOption), [users]);

  function resetForm() {
    setSelectedUser(null);
    setUsers([]);
  }

  useLayoutEffect(() => {
    if (open) {
      setIsLoadingUsers(true);
    }
  }, [open, teamId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadUsers() {
      try {
        const data = await api<AvailableTeamMembersResponse>(
          `/teams/${teamId}/available-members`,
          { toastOnError: false },
        );

        if (!cancelled) {
          setUsers(data.users);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUsers(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [open, teamId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: AddTeamMemberInput = { userId: selectedUser.value };
      const data = await api<TeamResponse>(`/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      resetForm();
      onOpenChange(false);
      onAdded(data.team);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar membro </DialogTitle>
            <DialogDescription>
              Busque e selecione um usuário da sua unidade para adicionar à
              equipe.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className='py-4'>
            <Field>
              <FieldLabel htmlFor='member-user'>Usuário</FieldLabel>
              {isLoadingUsers ? (
                <div className='flex h-8 items-center gap-2 text-sm text-muted-foreground'>
                  <Loader2 className='size-4 animate-spin' />
                  Carregando usuários...
                </div>
              ) : users.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  Nenhum usuário disponível para adicionar.
                </p>
              ) : (
                <Combobox
                  items={userOptions}
                  value={selectedUser}
                  onValueChange={setSelectedUser}
                  itemToStringLabel={(item) => item.label}
                  isItemEqualToValue={(a, b) => a.value === b.value}
                  disabled={isSubmitting}
                >
                  <ComboboxInput
                    id='member-user'
                    className='w-full'
                    placeholder='Buscar por nome...'
                    showClear
                    disabled={isSubmitting}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>Nenhum usuário encontrado.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type='button'
              variant='cancel'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              disabled={
                isSubmitting ||
                isLoadingUsers ||
                !selectedUser ||
                users.length === 0
              }
            >
              {isSubmitting ? 'Adicionando...' : 'Adicionar membro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
