import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dataService, QueryKeys, request } from 'librechat-data-provider';
import type {
  CreateProjectFromConversationRequest,
  CreateProjectMemoryRequest,
  CreateProjectRequest,
  LinkProjectConversationRequest,
  SaveProjectArtifactRequest,
  UpdateProjectRequest,
} from 'librechat-data-provider';

export const useProjectsQuery = () =>
  useQuery([QueryKeys.projects], () => dataService.listProjects(), {
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

export const useProjectQuery = (projectId?: string) =>
  useQuery([QueryKeys.project, projectId], () => dataService.getProject(projectId ?? ''), {
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

export const useProjectConversationsQuery = (projectId?: string) =>
  useQuery(
    [QueryKeys.projectConversations, projectId],
    () => dataService.listProjectConversations(projectId ?? ''),
    {
      enabled: !!projectId,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
    },
  );

export const useProjectMemoriesQuery = (projectId?: string) =>
  useQuery(
    [QueryKeys.projectMemories, projectId],
    () => dataService.listProjectMemories(projectId ?? ''),
    {
      enabled: !!projectId,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
    },
  );

export const useProjectArtifactsQuery = (projectId?: string) =>
  useQuery(
    [QueryKeys.projectArtifacts, projectId],
    () => dataService.listProjectArtifacts(projectId ?? ''),
    {
      enabled: !!projectId,
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
    },
  );

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation((payload: CreateProjectRequest) => dataService.createProject(payload), {
    onSuccess: () => queryClient.invalidateQueries([QueryKeys.projects]),
  });
};

export const useUpdateProjectMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: UpdateProjectRequest) => dataService.updateProject(projectId, payload),
    {
      onSuccess: (project) => {
        queryClient.invalidateQueries([QueryKeys.projects]);
        queryClient.setQueryData([QueryKeys.project, projectId], project);
      },
    },
  );
};

export const useLinkProjectConversationMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: LinkProjectConversationRequest) =>
      dataService.linkProjectConversation(projectId, payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QueryKeys.projectConversations, projectId]);
        queryClient.invalidateQueries([QueryKeys.projects]);
      },
    },
  );
};

export const useCreateProjectFromConversationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: CreateProjectFromConversationRequest) =>
      dataService.createProjectFromConversation(payload),
    {
      onSuccess: (project) => {
        queryClient.invalidateQueries([QueryKeys.projects]);
        queryClient.invalidateQueries([QueryKeys.projectConversations, project.projectId]);
      },
    },
  );
};

export const useCreateProjectMemoryMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: CreateProjectMemoryRequest) => dataService.createProjectMemory(projectId, payload),
    {
      onSuccess: () => queryClient.invalidateQueries([QueryKeys.projectMemories, projectId]),
    },
  );
};

export const useSaveProjectArtifactMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    (payload: SaveProjectArtifactRequest) => dataService.saveProjectArtifact(projectId, payload),
    {
      onSuccess: () => queryClient.invalidateQueries([QueryKeys.projectArtifacts, projectId]),
    },
  );
};

export const useProjectArtifactMutation = (projectId: string) =>
  useMutation((artifactId: string) => dataService.getProjectArtifact(projectId, artifactId));

export const useExportProjectArtifactPdfMutation = (projectId: string) =>
  useMutation((artifactId: string) =>
    request.getResponse(
      `/api/projects/${projectId}/artifacts/${encodeURIComponent(artifactId)}/export/pdf`,
      {
        responseType: 'blob',
      },
    ),
  );
