import type { Document } from 'mongoose';

export type ProjectVisibility = 'private' | 'team';
export type ProjectMemoryMode = 'project_only' | 'default';
export type ProjectConversationSource =
  | 'created_inside_project'
  | 'manual_add'
  | 'move'
  | 'create_project_from_conversation';
export type ProjectMemoryType = 'explicit' | 'inferred' | 'system';
export type ProjectMemorySourceType =
  | 'user_message'
  | 'file'
  | 'conversation'
  | 'artifact'
  | 'manual';

export interface IProject extends Document {
  projectId: string;
  name: string;
  description?: string;
  ownerId: string;
  workspaceId?: string;
  visibility: ProjectVisibility;
  instructions?: string;
  memoryMode: ProjectMemoryMode;
  defaultModel?: string;
  defaultAgentId?: string;
  metadata?: Record<string, unknown>;
  archivedAt?: Date | null;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProjectConversation extends Document {
  projectId: string;
  conversationId: string;
  pinned?: boolean;
  summary?: string;
  lastActivityAt?: Date;
  addedBy: string;
  addedFrom: ProjectConversationSource;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProjectFile extends Document {
  projectId: string;
  fileId: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  uploadedBy: string;
  extractedText?: string;
  summary?: string;
  embeddingStatus?: string;
  metadata?: Record<string, unknown>;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProjectMemory extends Document {
  memoryId: string;
  projectId: string;
  type: ProjectMemoryType;
  content: string;
  sourceType: ProjectMemorySourceType;
  sourceId?: string;
  importance?: number;
  tenantId?: string;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProjectArtifact extends Document {
  artifactId: string;
  projectId: string;
  type: string;
  title: string;
  contentJson?: Record<string, unknown>;
  contentText?: string;
  status: 'draft' | 'final' | 'archived';
  createdBy: string;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProjectAgent extends Document {
  projectId: string;
  agentId: string;
  role: 'default' | 'available' | 'specialist';
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
