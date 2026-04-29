export type LphProject = {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  createdAt: string;
};

export const PROJECTS_STORAGE_KEY = 'lph.sidebar.projects';
export const PENDING_PROJECT_CHAT_KEY = 'lph.pending.project.chat';
export const PROJECT_TAG_PREFIX = 'project:';

export const DEFAULT_PROJECTS: LphProject[] = [
  'Projeto 01',
  'Projeto 02',
  'Projeto 03',
  'Projeto 04',
  'Projeto 05',
  'Projeto 06',
].map((name, index) => ({
  id: `default-${index + 1}`,
  name,
  createdAt: new Date(0).toISOString(),
}));

const isBrowser = () => typeof window !== 'undefined';

export const getProjectTag = (projectId: string) => `${PROJECT_TAG_PREFIX}${projectId}`;

export const isProjectTag = (tag?: string | null) => Boolean(tag?.startsWith(PROJECT_TAG_PREFIX));

export const createProjectId = (name: string) => {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now()}`;

  return `${slug || 'project'}-${suffix}`;
};

export const getStoredProjects = (): LphProject[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const storedProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!storedProjects) {
      return [];
    }

    const parsed = JSON.parse(storedProjects);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((project) => project && typeof project.id === 'string' && typeof project.name === 'string')
      .map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        instructions: project.instructions,
        createdAt: project.createdAt || new Date().toISOString(),
      }));
  } catch {
    return [];
  }
};

export const saveStoredProjects = (projects: LphProject[]) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
};

export const getAllProjects = (): LphProject[] => {
  const storedProjects = getStoredProjects();
  const storedIds = new Set(storedProjects.map((project) => project.id));
  const storedNames = new Set(storedProjects.map((project) => project.name.toLowerCase()));
  const defaults = DEFAULT_PROJECTS.filter(
    (project) => !storedIds.has(project.id) && !storedNames.has(project.name.toLowerCase()),
  );

  return [...storedProjects, ...defaults];
};

export const findProjectById = (projectId: string) =>
  getAllProjects().find((project) => project.id === projectId);

export const setPendingProjectChat = (project: LphProject) => {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(
    PENDING_PROJECT_CHAT_KEY,
    JSON.stringify({
      projectId: project.id,
      projectName: project.name,
      projectTag: getProjectTag(project.id),
      createdAt: Date.now(),
    }),
  );
};

export const getPendingProjectChatTag = () => {
  if (!isBrowser()) {
    return null;
  }

  try {
    const rawPendingProject = window.sessionStorage.getItem(PENDING_PROJECT_CHAT_KEY);
    if (!rawPendingProject) {
      return null;
    }

    const pendingProject = JSON.parse(rawPendingProject);
    const isFresh = Date.now() - Number(pendingProject.createdAt ?? 0) < 5 * 60 * 1000;
    if (!isFresh || !isProjectTag(pendingProject.projectTag)) {
      window.sessionStorage.removeItem(PENDING_PROJECT_CHAT_KEY);
      return null;
    }

    return pendingProject.projectTag as string;
  } catch {
    window.sessionStorage.removeItem(PENDING_PROJECT_CHAT_KEY);
    return null;
  }
};

export const clearPendingProjectChat = () => {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(PENDING_PROJECT_CHAT_KEY);
};

export const upsertStoredProject = (project: LphProject) => {
  const currentProjects = getStoredProjects();
  const nextProjects = [
    project,
    ...currentProjects.filter(
      (item) =>
        item.id !== project.id && item.name.toLowerCase() !== project.name.toLowerCase(),
    ),
  ];
  saveStoredProjects(nextProjects);
  return nextProjects;
};
