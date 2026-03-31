export type Profile = {
    id: string
    username: string
    display_name: string
    avatar_color: string
    avatar_initials: string
    role: 'admin' | 'member'
    created_at: string
}

export type Project = {
    id: string
    name: string
    description: string | null
    color: string
    owner_id: string | null
    created_at: string
}

export type Tag = {
    id: string
    project_id: string
    name: string
    color: string
}

export type Task = {
    id: string
    project_id: string | null
    title: string
    pre_description: string | null
    description: string | null
    estado: 'Pendiente' | 'En Progreso' | 'Revisión' | 'Terminado'
    prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica'
    assignee_id: string | null
    created_by: string | null
    due_date: string | null
    posicion: number
    comment_count: number
    created_at: string
    updated_at: string
    // Joined
    assignee?: Profile | null
    tags?: Tag[]
}

export type Comment = {
    id: string
    task_id: string
    author_id: string | null
    content: string
    created_at: string
    author?: Profile | null
}

export type Attachment = {
    id: string
    task_id: string
    uploaded_by: string | null
    file_name: string
    file_url: string
    file_size: number | null
    mime_type: string | null
    created_at: string
}

export type ActivityLog = {
    id: string
    task_id: string
    actor_id: string | null
    action: 'created' | 'moved' | 'updated' | 'commented' | 'assigned' | 'deleted' | 'attachment_added'
    payload: Record<string, unknown> | null
    created_at: string
    actor?: Profile | null
}

export const COLUMNAS: Task['estado'][] = ['Pendiente', 'En Progreso', 'Revisión', 'Terminado']

export const PRIORITY_CONFIG: Record<Task['prioridad'], { label: string; color: string; bg: string }> = {
    'Baja': { label: 'Baja', color: '#26c6da', bg: 'rgba(38,198,218,0.12)' },
    'Media': { label: 'Media', color: '#f5c518', bg: 'rgba(245,197,24,0.12)' },
    'Alta': { label: 'Alta', color: '#f57c00', bg: 'rgba(245,124,0,0.12)' },
    'Crítica': { label: 'Crítica', color: '#ff4b4b', bg: 'rgba(255,75,75,0.12)' },
}

export const COLUMN_CONFIG: Record<Task['estado'], { label: string; color: string; emoji: string }> = {
    'Pendiente': { label: 'Pendiente', color: '#708499', emoji: '📋' },
    'En Progreso': { label: 'En Progreso', color: '#3390ec', emoji: '⚡' },
    'Revisión': { label: 'Revisión', color: '#f5c518', emoji: '👁️' },
    'Terminado': { label: 'Terminado', color: '#26c6da', emoji: '✅' },
}
