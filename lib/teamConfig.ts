// ============================================================
// CONFIGURACIÓN DEL EQUIPO — Edita esto para agregar miembros
// ============================================================
// Cuando alguien entra con la contraseña del equipo,
// escoge su nombre de esta lista.
// ============================================================

export type TeamMember = {
    id: string         // UUID fijo (no cambia nunca)
    username: string   // nombre corto para tareas
    display_name: string
    avatar_initials: string
    avatar_color: string
}

export const TEAM_MEMBERS: TeamMember[] = [
    {
        id: 'aaaaaaaa-0000-0000-0000-000000000001',
        username: 'rodrigo',
        display_name: 'Rodrigo',
        avatar_initials: 'RO',
        avatar_color: '#3390ec',
    },
    {
        id: 'aaaaaaaa-0000-0000-0000-000000000002',
        username: 'alejandro',
        display_name: 'Alejandro',
        avatar_initials: 'AL',
        avatar_color: '#26c6da',
    },
    {
        id: 'aaaaaaaa-0000-0000-0000-000000000003',
        username: 'oscar',
        display_name: 'Oscar',
        avatar_initials: 'OS',
        avatar_color: '#ab47bc',
    },
]
// ↑↑↑ Agrega o modifica miembros aquí.
// Los IDs son fijos — no los cambies una vez que tengas tareas creadas.
// Los colores son hex, pon el color favorito de cada quien.
