import type { MinimalConversation } from './queries';

export type ProjectVisibility = 'private' | 'team';
export type ProjectMemoryMode = 'project_only' | 'default';

export type TProject = {
  projectId: string;
  name: string;
  description?: string;
  ownerId: string;
  visibility: ProjectVisibility;
  instructions?: string;
  memoryMode: ProjectMemoryMode;
  defaultModel?: string;
  defaultAgentId?: string;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TProjectConversation = {
  projectId: string;
  conversationId: string;
  pinned?: boolean;
  summary?: string;
  lastActivityAt?: string;
  addedBy: string;
  addedFrom:
    | 'created_inside_project'
    | 'manual_add'
    | 'move'
    | 'create_project_from_conversation';
  createdAt?: string;
  updatedAt?: string;
};

export type TProjectFile = {
  projectId: string;
  fileId: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  extractedText?: string;
  summary?: string;
  embeddingStatus?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TProjectMemory = {
  memoryId: string;
  projectId: string;
  type: 'explicit' | 'inferred' | 'system';
  content: string;
  sourceType: 'user_message' | 'file' | 'conversation' | 'artifact' | 'manual';
  sourceId?: string;
  importance?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectListResponse = {
  projects: TProject[];
};

export type ProjectConversationsResponse = {
  conversations: MinimalConversation[];
};

export type ProjectFilesResponse = {
  files: TProjectFile[];
};

export type ProjectMemoriesResponse = {
  memories: TProjectMemory[];
};

export type CreateProjectRequest = {
  name: string;
  description?: string;
  instructions?: string;
  visibility?: ProjectVisibility;
};

export type UpdateProjectRequest = Partial<CreateProjectRequest> & {
  defaultModel?: string;
  defaultAgentId?: string;
};

export type LinkProjectConversationRequest = {
  conversationId: string;
  addedFrom?: TProjectConversation['addedFrom'];
  summary?: string;
};

export type CreateProjectFromConversationRequest = CreateProjectRequest & {
  conversationId: string;
};

export type CreateProjectMemoryRequest = {
  content: string;
  sourceType?: TProjectMemory['sourceType'];
  sourceId?: string;
  importance?: number;
};
