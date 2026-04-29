import { Schema } from 'mongoose';
import type {
  IProject,
  IProjectAgent,
  IProjectArtifact,
  IProjectConversation,
  IProjectFile,
  IProjectMemory,
} from '~/types';

export const projectSchema: Schema<IProject> = new Schema(
  {
    projectId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    ownerId: { type: String, required: true, index: true },
    workspaceId: { type: String },
    visibility: { type: String, enum: ['private', 'team'], default: 'private' },
    instructions: { type: String, default: '' },
    memoryMode: { type: String, enum: ['project_only', 'default'], default: 'project_only' },
    defaultModel: { type: String },
    defaultAgentId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    archivedAt: { type: Date, default: null },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
);

export const projectConversationSchema: Schema<IProjectConversation> = new Schema(
  {
    projectId: { type: String, required: true, index: true },
    conversationId: { type: String, required: true, index: true },
    pinned: { type: Boolean, default: false },
    summary: { type: String, default: '' },
    lastActivityAt: { type: Date, default: Date.now },
    addedBy: { type: String, required: true },
    addedFrom: {
      type: String,
      enum: ['created_inside_project', 'manual_add', 'move', 'create_project_from_conversation'],
      default: 'manual_add',
    },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
);

export const projectFileSchema: Schema<IProjectFile> = new Schema(
  {
    projectId: { type: String, required: true, index: true },
    fileId: { type: String, required: true, index: true },
    filename: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    uploadedBy: { type: String, required: true },
    extractedText: { type: String },
    summary: { type: String },
    embeddingStatus: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
);

export const projectMemorySchema: Schema<IProjectMemory> = new Schema(
  {
    memoryId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    type: { type: String, enum: ['explicit', 'inferred', 'system'], default: 'explicit' },
    content: { type: String, required: true },
    sourceType: {
      type: String,
      enum: ['user_message', 'file', 'conversation', 'artifact', 'manual'],
      default: 'manual',
    },
    sourceId: { type: String },
    importance: { type: Number, default: 1 },
    deletedAt: { type: Date, default: null },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
);

export const projectArtifactSchema: Schema<IProjectArtifact> = new Schema(
  {
    artifactId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    contentJson: { type: Schema.Types.Mixed },
    contentText: { type: String },
    status: { type: String, enum: ['draft', 'final', 'archived'], default: 'draft' },
    createdBy: { type: String, required: true },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
);

export const projectAgentSchema: Schema<IProjectAgent> = new Schema(
  {
    projectId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },
    role: { type: String, enum: ['default', 'available', 'specialist'], default: 'available' },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
);

projectSchema.index({ projectId: 1, ownerId: 1, tenantId: 1 }, { unique: true });
projectSchema.index({ ownerId: 1, updatedAt: -1 });
projectConversationSchema.index(
  { projectId: 1, conversationId: 1, tenantId: 1 },
  { unique: true },
);
projectConversationSchema.index({ conversationId: 1, tenantId: 1 });
projectFileSchema.index({ projectId: 1, fileId: 1, tenantId: 1 }, { unique: true });
projectMemorySchema.index({ projectId: 1, deletedAt: 1, updatedAt: -1 });
projectArtifactSchema.index({ projectId: 1, updatedAt: -1 });
projectAgentSchema.index({ projectId: 1, agentId: 1, tenantId: 1 }, { unique: true });
