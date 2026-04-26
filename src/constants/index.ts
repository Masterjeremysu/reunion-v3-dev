export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  MEETINGS: '/meetings',
  MEETING: (id: string) => `/meetings/${id}`,
  ACTIONS: '/actions',
  COLLEAGUES: '/colleagues',
  NOTES: '/notes',
  CONSUMABLES: '/consumables',
  VEHICLES: '/vehicles',
  MOOD: '/mood',
  SCHEDULE: '/schedule',
  LEAVES: '/leaves',
  ADMIN: '/admin',
} as const

export const QK = {
  MEETINGS: ['meetings'] as const,
  MEETING: (id: string) => ['meetings', id] as const,
  ACTIONS: ['actions'] as const,
  MEETING_ACTIONS: (id: string) => ['actions', 'meeting', id] as const,
  AGENDA: (id: string) => ['agenda', id] as const,
  COLLEAGUES: ['colleagues'] as const,
  NOTES: ['notes'] as const,
  CONSUMABLES: ['consumables'] as const,
  MOOD: ['mood'] as const,
  VEHICLES: ['vehicles'] as const,
  INSPECTIONS: ['inspections'] as const,
  VEHICLE_INSPECTIONS: (id: string) => ['inspections', id] as const,
  SCHEDULE: ['schedule'] as const,
  DASHBOARD: ['dashboard'] as const,
} as const

export const ACTION_STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'En attente', color: 'amber' },
  in_progress: { label: 'En cours',   color: 'blue'  },
  completed:   { label: 'Terminée',   color: 'teal'  },
  cancelled:   { label: 'Annulée',    color: 'gray'  },
}

export const INSPECTION_STATUS: Record<string, { label: string; color: string }> = {
  pending:            { label: 'À planifier',   color: 'blue'   },
  completed:          { label: 'Réalisée',      color: 'teal'   },
  overdue:            { label: 'En retard',     color: 'red'    },
  failed_reinspection:{ label: 'Contre-visite', color: 'amber'  },
}

export const CONSUMABLE_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En attente', color: 'amber' },
  approved:  { label: 'Approuvé',  color: 'teal'  },
  ordered:   { label: 'Commandé',  color: 'blue'  },
  delivered: { label: 'Livré',     color: 'green' },
  rejected:  { label: 'Rejeté',    color: 'red'   },
}

export const VEHICLE_TYPES = ['Voiture', 'Utilitaire', 'Engin de levage', 'Moto', 'Camion']
export const INSPECTION_TYPES = ['Contrôle technique', 'Contrôle pollution', 'VGP', 'Révision']
export const MOOD_LABELS = ['', 'Très difficile', 'Difficile', 'Neutre', 'Bien', 'Excellent']
