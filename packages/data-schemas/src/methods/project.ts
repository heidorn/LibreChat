import { randomUUID } from 'crypto';
import type { Model } from 'mongoose';
import type {
  IConversation,
  IProject,
  IProjectArtifact,
  IProjectConversation,
  IProjectFile,
  IProjectMemory,
  ProjectConversationSource,
} from '~/types';

type ProjectInput = {
  name: string;
  description?: string;
  instructions?: string;
  visibility?: 'private' | 'team';
  metadata?: Record<string, unknown>;
};

type ProjectUpdate = Partial<
  Pick<
    IProject,
    'name' | 'description' | 'instructions' | 'visibility' | 'defaultModel' | 'defaultAgentId'
  >
>;

type ProjectLinkInput = {
  projectId: string;
  conversationId: string;
  addedFrom?: ProjectConversationSource;
  summary?: string;
};

type ProjectFileInput = {
  projectId: string;
  fileId: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  extractedText?: string;
  summary?: string;
};

type ProjectMemoryInput = {
  projectId: string;
  content: string;
  sourceType?: 'user_message' | 'file' | 'conversation' | 'artifact' | 'manual';
  sourceId?: string;
  importance?: number;
};

type ProjectArtifactInput = {
  projectId: string;
  artifactId?: string;
  type: string;
  title: string;
  contentJson?: Record<string, unknown>;
  contentText?: string;
  status?: 'draft' | 'final' | 'archived';
};

const normalizeProjectName = (name: string) => name.trim().slice(0, 120);

export function createProjectMethods(mongoose: typeof import('mongoose')) {
  const getProjectModel = () => mongoose.models.Project as Model<IProject>;
  const getProjectConversationModel = () =>
    mongoose.models.ProjectConversation as Model<IProjectConversation>;
  const getProjectFileModel = () => mongoose.models.ProjectFile as Model<IProjectFile>;
  const getProjectMemoryModel = () => mongoose.models.ProjectMemory as Model<IProjectMemory>;
  const getProjectArtifactModel = () =>
    mongoose.models.ProjectArtifact as Model<IProjectArtifact>;

  async function createProject(userId: string, input: ProjectInput) {
    const Project = getProjectModel();
    const name = normalizeProjectName(input.name);
    if (!name) {
      throw new Error('Project name is required');
    }

    return await Project.create({
      projectId: `project_${randomUUID()}`,
      name,
      description: input.description?.trim() ?? '',
      instructions: input.instructions?.trim() ?? '',
      visibility: input.visibility ?? 'private',
      memoryMode: 'project_only',
      ownerId: userId,
      metadata: input.metadata ?? {},
    });
  }

  async function getProjects(userId: string) {
    const Project = getProjectModel();
    return await Project.find({ ownerId: userId, archivedAt: null }).sort({ updatedAt: -1 }).lean();
  }

  async function getProject(userId: string, projectId: string) {
    const Project = getProjectModel();
    return await Project.findOne({ ownerId: userId, projectId, archivedAt: null }).lean();
  }

  async function updateProject(userId: string, projectId: string, input: ProjectUpdate) {
    const Project = getProjectModel();
    const update: ProjectUpdate = {};
    if (input.name !== undefined) {
      update.name = normalizeProjectName(input.name);
    }
    if (input.description !== undefined) {
      update.description = input.description.trim();
    }
    if (input.instructions !== undefined) {
      update.instructions = input.instructions.trim();
    }
    if (input.visibility !== undefined) {
      update.visibility = input.visibility;
    }
    if (input.defaultModel !== undefined) {
      update.defaultModel = input.defaultModel;
    }
    if (input.defaultAgentId !== undefined) {
      update.defaultAgentId = input.defaultAgentId;
    }

    return await Project.findOneAndUpdate({ ownerId: userId, projectId }, update, {
      new: true,
    }).lean();
  }

  async function archiveProject(userId: string, projectId: string) {
    const Project = getProjectModel();
    return await Project.findOneAndUpdate(
      { ownerId: userId, projectId },
      { archivedAt: new Date() },
      { new: true },
    ).lean();
  }

  async function linkProjectConversation(userId: string, input: ProjectLinkInput) {
    const project = await getProject(userId, input.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const ProjectConversation = getProjectConversationModel();
    const Conversation = mongoose.models.Conversation as Model<IConversation>;
    const link = await ProjectConversation.findOneAndUpdate(
      { projectId: input.projectId, conversationId: input.conversationId },
      {
        projectId: input.projectId,
        conversationId: input.conversationId,
        addedBy: userId,
        addedFrom: input.addedFrom ?? 'manual_add',
        summary: input.summary ?? '',
        lastActivityAt: new Date(),
      },
      { new: true, upsert: true },
    ).lean();
    await Conversation.findOneAndUpdate(
      { user: userId, conversationId: input.conversationId },
      { projectId: input.projectId },
    );
    return link;
  }

  async function unlinkProjectConversation(
    userId: string,
    projectId: string,
    conversationId: string,
  ) {
    const project = await getProject(userId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const ProjectConversation = getProjectConversationModel();
    const Conversation = mongoose.models.Conversation as Model<IConversation>;
    const link = await ProjectConversation.findOneAndDelete({ projectId, conversationId }).lean();
    await Conversation.findOneAndUpdate(
      { user: userId, conversationId },
      { $unset: { projectId: 1 } },
    );
    return link;
  }

  async function getProjectConversations(userId: string, projectId: string) {
    const project = await getProject(userId, projectId);
    if (!project) {
      return [];
    }

    const ProjectConversation = getProjectConversationModel();
    const Conversation = mongoose.models.Conversation as Model<IConversation>;
    const links = await ProjectConversation.find({ projectId }).sort({ lastActivityAt: -1 }).lean();
    const conversationIds = links.map((link) => link.conversationId);
    const linkedOrTaggedQuery =
      conversationIds.length > 0
        ? { $or: [{ conversationId: { $in: conversationIds } }, { projectId }] }
        : { projectId };

    return await Conversation.find({ user: userId, ...linkedOrTaggedQuery })
      .sort({ updatedAt: -1 })
      .lean();
  }

  async function createProjectFromConversation(
    userId: string,
    input: ProjectInput & { conversationId: string },
  ) {
    const project = await createProject(userId, input);
    await linkProjectConversation(userId, {
      projectId: project.projectId,
      conversationId: input.conversationId,
      addedFrom: 'create_project_from_conversation',
    });
    return project;
  }

  async function addProjectFile(userId: string, input: ProjectFileInput) {
    const project = await getProject(userId, input.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const ProjectFile = getProjectFileModel();
    return await ProjectFile.findOneAndUpdate(
      { projectId: input.projectId, fileId: input.fileId },
      { ...input, uploadedBy: userId },
      { new: true, upsert: true },
    ).lean();
  }

  async function getProjectFiles(userId: string, projectId: string) {
    const project = await getProject(userId, projectId);
    if (!project) {
      return [];
    }

    const ProjectFile = getProjectFileModel();
    return await ProjectFile.find({ projectId }).sort({ createdAt: -1 }).lean();
  }

  async function saveProjectArtifact(userId: string, input: ProjectArtifactInput) {
    const project = await getProject(userId, input.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const ProjectArtifact = getProjectArtifactModel();
    const artifactId = input.artifactId || `artifact_${randomUUID()}`;
    return await ProjectArtifact.findOneAndUpdate(
      { projectId: input.projectId, artifactId },
      {
        artifactId,
        projectId: input.projectId,
        type: input.type,
        title: input.title.trim().slice(0, 160) || 'Untitled artifact',
        contentJson: input.contentJson,
        contentText: input.contentText,
        status: input.status ?? 'draft',
        createdBy: userId,
      },
      { new: true, upsert: true },
    ).lean();
  }

  async function getProjectArtifacts(userId: string, projectId: string) {
    const project = await getProject(userId, projectId);
    if (!project) {
      return [];
    }

    const ProjectArtifact = getProjectArtifactModel();
    return await ProjectArtifact.find({ projectId }).sort({ updatedAt: -1 }).lean();
  }

  async function getProjectArtifact(userId: string, projectId: string, artifactId: string) {
    const project = await getProject(userId, projectId);
    if (!project) {
      return null;
    }

    const ProjectArtifact = getProjectArtifactModel();
    return await ProjectArtifact.findOne({ projectId, artifactId }).lean();
  }

  async function addProjectMemory(userId: string, input: ProjectMemoryInput) {
    const project = await getProject(userId, input.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const ProjectMemory = getProjectMemoryModel();
    return await ProjectMemory.create({
      memoryId: `pmem_${randomUUID()}`,
      projectId: input.projectId,
      type: 'explicit',
      content: input.content.trim(),
      sourceType: input.sourceType ?? 'manual',
      sourceId: input.sourceId,
      importance: input.importance ?? 1,
    });
  }

  async function getProjectMemories(userId: string, projectId: string) {
    const project = await getProject(userId, projectId);
    if (!project) {
      return [];
    }

    const ProjectMemory = getProjectMemoryModel();
    return await ProjectMemory.find({ projectId, deletedAt: null }).sort({ updatedAt: -1 }).lean();
  }

  async function deleteProjectMemory(userId: string, projectId: string, memoryId: string) {
    const project = await getProject(userId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const ProjectMemory = getProjectMemoryModel();
    return await ProjectMemory.findOneAndUpdate(
      { projectId, memoryId },
      { deletedAt: new Date() },
      { new: true },
    ).lean();
  }

  return {
    createProject,
    getProjects,
    getProject,
    updateProject,
    archiveProject,
    linkProjectConversation,
    unlinkProjectConversation,
    getProjectConversations,
    createProjectFromConversation,
    addProjectFile,
    getProjectFiles,
    saveProjectArtifact,
    getProjectArtifacts,
    getProjectArtifact,
    addProjectMemory,
    getProjectMemories,
    deleteProjectMemory,
  };
}

export type ProjectMethods = ReturnType<typeof createProjectMethods>;
