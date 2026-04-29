import { useCallback, useMemo, useState } from 'react';
import { Folder, MessageSquarePlus, Sparkles } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { findProjectById, getProjectTag, setPendingProjectChat } from '~/utils/projects';

const suggestions = [
  'Criar proposta',
  'Resumir arquivos',
  'Preparar reunião',
  'Criar follow-up',
  'Listar próximos passos',
  'Analisar riscos',
];

export default function ProjectRoute() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const project = useMemo(() => findProjectById(projectId), [projectId]);
  const [message, setMessage] = useState('');

  const startProjectChat = useCallback(
    (initialMessage?: string) => {
      if (!project) {
        return;
      }

      setPendingProjectChat(project);
      const prompt = initialMessage?.trim() || message.trim();
      const params = new URLSearchParams({
        projectTag: getProjectTag(project.id),
        projectName: project.name,
      });

      if (prompt) {
        params.set('prompt', prompt);
        params.set('submit', 'true');
      }

      navigate(`/c/new?${params.toString()}`);
    },
    [message, navigate, project],
  );

  if (!project) {
    return <Navigate to="/c/new" replace={true} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-primary text-text-primary">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-10">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-secondary">
            <Folder className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-normal">{project.name}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Chats, arquivos e instruções deste projeto ficam juntos aqui.
            </p>
          </div>
        </div>

        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Novo chat usando o contexto do projeto
          </div>

          <div className="rounded-2xl bg-surface-secondary p-4 shadow-sm ring-1 ring-border-light">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  startProjectChat();
                }
              }}
              rows={3}
              className="w-full resize-none bg-transparent text-base text-text-primary outline-none placeholder:text-text-secondary"
              placeholder="Pergunte algo usando o contexto deste projeto..."
              autoFocus
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-text-primary px-4 text-sm font-medium text-surface-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!message.trim()}
                onClick={() => startProjectChat()}
              >
                <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                Iniciar chat
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded-full border border-border-light px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                onClick={() => startProjectChat(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
