/** Central registry of TanStack Query keys so invalidation stays consistent. */
export const qk = {
  profile: ['profile'] as const,

  clients: ['clients'] as const,
  client: (id: string) => ['clients', id] as const,

  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  projectsByClient: (clientId: string) => ['projects', 'byClient', clientId] as const,

  tasks: ['tasks'] as const,
  tasksByProject: (projectId: string) => ['tasks', 'byProject', projectId] as const,

  activity: ['activity'] as const,
  activityByProject: (projectId: string) => ['activity', 'byProject', projectId] as const,

  dashboard: ['dashboard'] as const,
}
