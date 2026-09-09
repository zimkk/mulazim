import type { Priority } from '@/types/database'
import { DEFAULT_STALE_THRESHOLDS, type StaleThresholds } from '@/lib/utils/staleness'

export type Theme = 'light' | 'dark' | 'system'
export type Accent = 'blue' | 'violet' | 'green' | 'amber' | 'rose' | 'slate'
export type Density = 'comfortable' | 'compact'
export type FontSize = 'sm' | 'md' | 'lg'
export type LandingView = 'dashboard' | 'today' | 'upcoming' | 'projects'
export type DateStyle = 'relative' | 'absolute'

export interface RecWeights {
  priority: number
  dueDate: number
  overdue: number
  staleness: number
  inProgress: number
}

export interface UserSettings {
  appearance: {
    theme: Theme
    accent: Accent
    density: Density
    fontSize: FontSize
    reduceMotion: boolean
    firstDayOfWeek: 0 | 1
  }
  general: {
    landingView: LandingView
    defaultTaskPriority: Priority
    defaultProjectId: string | null
    dateStyle: DateStyle
    confirmBeforeDelete: boolean
    upcomingDays: number
  }
  notifications: {
    enabled: boolean
    overdue: boolean
    dueSoonLeadDays: number
    staleProjects: boolean
    needsReview: boolean
    dailyDigest: boolean
    dailyDigestTime: string
    quietHoursStart: string
    quietHoursEnd: string
  }
  workflow: {
    staleThresholds: StaleThresholds
    recWeights: RecWeights
    dashboardCards: string[]
  }
  desktop: {
    autostart: boolean
    startMinimized: boolean
  }
  keybindings: Record<KeybindingAction, string>
  perspectives: TaskPerspective[]
}

export type KeybindingAction = 'palette' | 'newTask' | 'newProject' | 'shortcuts'

export const KEYBINDING_LABEL: Record<KeybindingAction, string> = {
  palette: 'Command palette / search',
  newTask: 'New task',
  newProject: 'New project',
  shortcuts: 'Keyboard shortcuts',
}

export const DEFAULT_KEYBINDINGS: Record<KeybindingAction, string> = {
  palette: 'mod+k',
  newTask: 'mod+n',
  newProject: 'mod+shift+p',
  shortcuts: 'mod+/',
}

export interface TaskPerspective {
  id: string
  name: string
  filters: {
    q?: string
    status?: string
    priority?: string
    projectId?: string
    tagId?: string
    dateFilter?: string
    groupBy?: string
    sortBy?: string
  }
}

export const DASHBOARD_CARD_IDS = [
  'recommended',
  'overdue',
  'dueSoon',
  'highPriority',
  'inProgress',
  'stale',
  'attention',
  'needsReview',
  'activity',
] as const
export type DashboardCardId = (typeof DASHBOARD_CARD_IDS)[number]

export const DASHBOARD_CARD_LABEL: Record<DashboardCardId, string> = {
  recommended: 'Recommended focus',
  overdue: 'Overdue',
  dueSoon: 'Due today & soon',
  highPriority: 'High & urgent',
  inProgress: 'In progress',
  stale: 'Stale projects',
  attention: 'Needs attention',
  needsReview: 'Needs review',
  activity: 'Recent activity',
}

export const DEFAULT_SETTINGS: UserSettings = {
  appearance: {
    theme: 'system',
    accent: 'blue',
    density: 'comfortable',
    fontSize: 'md',
    reduceMotion: false,
    firstDayOfWeek: 1,
  },
  general: {
    landingView: 'dashboard',
    defaultTaskPriority: 'medium',
    defaultProjectId: null,
    dateStyle: 'relative',
    confirmBeforeDelete: true,
    upcomingDays: 7,
  },
  notifications: {
    enabled: true,
    overdue: true,
    dueSoonLeadDays: 1,
    staleProjects: true,
    needsReview: true,
    dailyDigest: false,
    dailyDigestTime: '08:00',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  },
  workflow: {
    staleThresholds: DEFAULT_STALE_THRESHOLDS,
    recWeights: { priority: 1, dueDate: 1, overdue: 1, staleness: 1, inProgress: 1 },
    dashboardCards: [...DASHBOARD_CARD_IDS],
  },
  desktop: {
    autostart: false,
    startMinimized: false,
  },
  keybindings: { ...DEFAULT_KEYBINDINGS },
  perspectives: [],
}

type Json = Record<string, unknown>

/** Deep-merge a stored (possibly partial / older) settings object over the defaults. */
export function mergeSettings(stored: unknown): UserSettings {
  return deepMerge(DEFAULT_SETTINGS as unknown as Json, (stored ?? {}) as Json) as unknown as UserSettings
}

function deepMerge(base: Json, over: Json): Json {
  const out: Json = Array.isArray(base) ? [...(base as unknown[])] as unknown as Json : { ...base }
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue
    const b = out[k]
    if (isPlainObject(b) && isPlainObject(v)) out[k] = deepMerge(b as Json, v as Json)
    else out[k] = v
  }
  return out
}

function isPlainObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
