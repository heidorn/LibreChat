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
      <div className="flex h-full items-center justify-center bg-[var(--lph-bg-app)] text-[var(--lph-text-muted)]">
        Carregando projeto...
      </div>
    );
  }

  const startProjectChat = () => {
    navigate(`/c/new?projectId=${encodeURIComponent(project.projectId)}&projectChat=${Date.now()}`);
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
    <div className="h-full overflow-y-auto bg-[var(--lph-bg-app)] px-6 py-8 text-[var(--lph-text)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Folder className="h-8 w-8 text-[var(--lph-text-muted)]" aria-hidden="true" />
            <h1 className="lph-brand-font text-4xl font-semibold">{project.name}</h1>
          </div>
          {project.description && (
            <p className="max-w-2xl text-sm leading-6 text-[var(--lph-text-muted)]">
              {project.description}
            </p>
          )}
          <button
            type="button"
            className="lph-primary-button flex h-11 w-fit items-center gap-2 px-5 text-sm"
            onClick={startProjectChat}
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            Novo chat no projeto
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="lph-panel p-4">
            <div className="mb-3 text-sm font-semibold text-[var(--lph-text)]">
              Instruções do projeto
            </div>
            <textarea
              className="lph-input min-h-40 w-full resize-none p-3 text-sm leading-6"
              value={instructions}
              placeholder="Ex: responder em tom executivo, direto e comercial..."
              onChange={(event) => setInstructions(event.target.value)}
            />
            <button
              type="button"
              className="lph-primary-button mt-3 flex h-9 items-center gap-2 px-4 text-sm"
              disabled={updateProject.isLoading}
              onClick={saveInstructions}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Salvar instruções
            </button>
          </div>

          <div className="lph-panel p-4">
            <div className="mb-3 text-sm font-semibold text-[var(--lph-text)]">
              Memórias do projeto
            </div>
            <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
              {(memories?.memories ?? []).length === 0 ? (
                <p className="text-sm text-[var(--lph-text-muted)]">Nenhuma memória salva ainda.</p>
              ) : (
                memories?.memories.map((item) => (
                  <div
                    key={item.memoryId}
                    className="rounded-md border border-[var(--lph-border-soft)] bg-[#151514] px-3 py-2 text-sm text-[var(--lph-text)]"
                  >
                    {item.content}
                  </div>
                ))
              )}
            </div>
            <textarea
              className="lph-input min-h-24 w-full resize-none p-3 text-sm leading-6"
              value={memory}
              placeholder="Salvar uma memória manual deste projeto..."
              onChange={(event) => setMemory(event.target.value)}
            />
            <button
              type="button"
              className="lph-primary-button mt-3 h-9 px-4 text-sm"
              disabled={createMemory.isLoading || !memory.trim()}
              onClick={saveMemory}
            >
              Salvar memória
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3 text-sm font-semibold text-[var(--lph-text)]">
            Conversas do projeto
          </div>
          <div className="space-y-2">
            {(conversations?.conversations ?? []).length === 0 ? (
              <p className="text-sm text-[var(--lph-text-muted)]">
                As conversas criadas neste projeto vão aparecer aqui.
              </p>
            ) : (
              conversations?.conversations.map((conversation) => (
                <button
                  key={conversation.conversationId}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--lph-border)] bg-[var(--lph-bg-panel)] px-4 py-3 text-left text-[var(--lph-text)] hover:bg-[var(--lph-bg-panel-hover)]"
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
                  <span className="text-xs text-[var(--lph-text-muted)]">
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
