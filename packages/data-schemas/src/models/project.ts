import type * as t from '~/types';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import {
  projectAgentSchema,
  projectArtifactSchema,
  projectConversationSchema,
  projectFileSchema,
  projectMemorySchema,
  projectSchema,
} from '~/schema/project';

export function createProjectModels(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(projectSchema);
  applyTenantIsolation(projectConversationSchema);
  applyTenantIsolation(projectFileSchema);
  applyTenantIsolation(projectMemorySchema);
  applyTenantIsolation(projectArtifactSchema);
  applyTenantIsolation(projectAgentSchema);

  return {
    Project: mongoose.models.Project || mongoose.model<t.IProject>('Project', projectSchema),
    ProjectConversation:
      mongoose.models.ProjectConversation ||
      mongoose.model<t.IProjectConversation>('ProjectConversation', projectConversationSchema),
    ProjectFile:
      mongoose.models.ProjectFile || mongoose.model<t.IProjectFile>('ProjectFile', projectFileSchema),
    ProjectMemory:
      mongoose.models.ProjectMemory ||
      mongoose.model<t.IProjectMemory>('ProjectMemory', projectMemorySchema),
    ProjectArtifact:
      mongoose.models.ProjectArtifact ||
      mongoose.model<t.IProjectArtifact>('ProjectArtifact', projectArtifactSchema),
    ProjectAgent:
      mongoose.models.ProjectAgent ||
      mongoose.model<t.IProjectAgent>('ProjectAgent', projectAgentSchema),
  };
}
