import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Folder, MessageSquarePlus, Save } from 'lucide-react';
import {
  useCreateProjectMemoryMutation,
  useProjectConversationsQuery,
  useProjectMemoriesQuery,
  useProjectQuery,
  useUpdateProjectMutation,
} from '~/data-provider';

export default function ProjectRoute() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const { data: project } = useProjectQuery(projectId);
  const { data: conversations } = useProjectConversationsQuery(projectId);
  const { data: memories } = useProjectMemoriesQuery(projectId);
  const updateProject = useUpdateProjectMutation(projectId);
  const createMemory = useCreateProjectMemoryMutation(projectId);
  const [instructions, setInstructions] = useState('');
  const [memory, setMemory] = useState('');

  useEffect(() => {
    setInstructions(project?.instructions ?? '');
  }, [project?.projectId, project?.instructions]);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-text-secondary">
        Carregando projeto...
      </div>
    );
  }

  const startProjectChat = () => {
    navigate(`/c/new?projectId=${encodeURIComponent(project.projectId)}`);
  };

  const saveInstructions = () => {
    updateProject.mutate({ instructions });
  };

  const saveMemory = () => {
    const content = memory.trim();
    if (!content) {
      return;
    }
    createMemory.mutate(
      { content },
      {
        onSuccess: () => setMemory(''),
      },
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-primary px-6 py-8 text-text-primary">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Folder className="h-7 w-7 text-text-secondary" aria-hidden="true" />
            <h1 className="text-3xl font-semibold">{project.name}</h1>
          </div>
          {project.description && (
            <p className="max-w-2xl text-sm text-text-secondary">{project.description}</p>
          )}
          <button
            type="button"
            className="flex h-11 w-fit items-center gap-2 rounded-full bg-text-primary px-5 text-sm font-medium text-surface-primary"
            onClick={startProjectChat}
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            Novo chat no projeto
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
            <div className="mb-3 text-sm font-semibold">Instruções do projeto</div>
            <textarea
              className="min-h-40 w-full resize-none rounded-lg border border-border-light bg-surface-primary p-3 text-sm outline-none focus:border-text-primary"
              value={instructions}
              placeholder="Ex: responder em tom executivo, direto e comercial..."
              onChange={(event) => setInstructions(event.target.value)}
            />
            <button
              type="button"
              className="mt-3 flex h-9 items-center gap-2 rounded-full bg-text-primary px-4 text-sm font-medium text-surface-primary disabled:opacity-50"
              disabled={updateProject.isLoading}
              onClick={saveInstructions}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Salvar instruções
            </button>
          </div>

          <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
            <div className="mb-3 text-sm font-semibold">Memórias do projeto</div>
            <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
              {(memories?.memories ?? []).length === 0 ? (
                <p className="text-sm text-text-secondary">Nenhuma memória salva ainda.</p>
              ) : (
                memories?.memories.map((item) => (
                  <div
                    key={item.memoryId}
                    className="rounded-md bg-surface-primary px-3 py-2 text-sm text-text-primary"
                  >
                    {item.content}
                  </div>
                ))
              )}
            </div>
            <textarea
              className="min-h-24 w-full resize-none rounded-lg border border-border-light bg-surface-primary p-3 text-sm outline-none focus:border-text-primary"
              value={memory}
              placeholder="Salvar uma memória manual deste projeto..."
              onChange={(event) => setMemory(event.target.value)}
            />
            <button
              type="button"
              className="mt-3 h-9 rounded-full bg-text-primary px-4 text-sm font-medium text-surface-primary disabled:opacity-50"
              disabled={createMemory.isLoading || !memory.trim()}
              onClick={saveMemory}
            >
              Salvar memória
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3 text-sm font-semibold">Conversas do projeto</div>
          <div className="space-y-2">
            {(conversations?.conversations ?? []).length === 0 ? (
              <p className="text-sm text-text-secondary">
                As conversas criadas neste projeto vão aparecer aqui.
              </p>
            ) : (
              conversations?.conversations.map((conversation) => (
                <button
                  key={conversation.conversationId}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-border-light bg-surface-secondary px-4 py-3 text-left hover:bg-surface-active-alt"
                  onClick={() =>
                    navigate(
                      `/c/${conversation.conversationId}?projectId=${encodeURIComponent(
                        project.projectId,
                      )}`,
                    )
                  }
                >
                  <span className="truncate text-sm font-medium">
                    {conversation.title || 'Nova conversa'}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {conversation.updatedAt
                      ? new Date(conversation.updatedAt).toLocaleDateString()
                      : ''}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
