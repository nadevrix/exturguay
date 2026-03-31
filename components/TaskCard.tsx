'use client'

import { useState, useRef, useEffect } from 'react'
import type { Task, Profile, Tag } from '../lib/types'
import { PRIORITY_CONFIG, COLUMN_CONFIG, COLUMNAS } from '../lib/types'
import { supabase } from '../lib/supabase'
import MemberAvatar from './MemberAvatar'
import toast from 'react-hot-toast'
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

type Props = {
    task: Task
    members: Profile[]
    onDeleted: () => void
    onClick: () => void
}

export default function TaskCard({ task, members, onDeleted, onClick }: Props) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [moveMenuOpen, setMoveMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const priority = PRIORITY_CONFIG[task.prioridad]
    const assignee = members.find(m => m.id === task.assignee_id) ?? null

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
                setMoveMenuOpen(false)
            }
        }
        if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [menuOpen])

    const deleteTask = async () => {
        await supabase.from('tasks').delete().eq('id', task.id)
        toast.success('Tarea eliminada')
        onDeleted()
        setMenuOpen(false)
    }

    const moveTask = async (col: Task['estado']) => {
        await supabase.from('tasks').update({ estado: col, posicion: Date.now() }).eq('id', task.id)
        toast.success(`Movido a ${col}`)
        setMenuOpen(false)
        setMoveMenuOpen(false)
    }

    const copyId = () => {
        navigator.clipboard.writeText(task.id)
        toast('ID copiado al portapapeles', { icon: '📋' })
        setMenuOpen(false)
    }

    const dueDate = task.due_date ? new Date(task.due_date) : null
    const dueSoon = dueDate && differenceInDays(dueDate, new Date()) <= 2
    const overdue = dueDate && isPast(dueDate) && task.estado !== 'Terminado'

    return (
        <div
            className="task-card"
            style={{
                background: '#242f3d',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                position: 'relative',
            }}
        >
            {/* Priority bar */}
            <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                background: priority.color, borderRadius: '14px 0 0 14px',
            }} />

            <div style={{ padding: '12px 12px 12px 16px' }} onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-menu]')) return
                onClick()
            }}>
                {/* Top row: tags + three-dots */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1, marginRight: '8px' }}>
                        {/* Priority pill */}
                        <span style={{
                            background: priority.bg, color: priority.color,
                            fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '999px',
                            letterSpacing: '0.03em',
                        }}>
                            {priority.label}
                        </span>
                        {/* Tags */}
                        {task.tags?.slice(0, 2).map(tag => (
                            <span key={tag.id} style={{
                                background: `${tag.color}20`, color: tag.color,
                                fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '999px',
                            }}>
                                {tag.name}
                            </span>
                        ))}
                    </div>

                    {/* Three-dot menu */}
                    <div data-menu ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#708499', padding: '2px 4px', borderRadius: '6px',
                                fontSize: '16px', lineHeight: 1,
                                transition: 'color 0.15s, background 0.15s',
                            }}
                            title="Más opciones"
                        >
                            ⋯
                        </button>
                        {menuOpen && (
                            <div className="animate-scaleIn" style={{
                                position: 'absolute', right: 0, top: '24px', zIndex: 100,
                                background: '#17212b', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px', padding: '6px', minWidth: '180px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            }}>
                                <MenuItem icon="✏️" label="Editar" onClick={() => { setMenuOpen(false); onClick() }} />
                                <div style={{ position: 'relative' }}>
                                    <MenuItem icon="↗️" label="Mover a..." onClick={() => setMoveMenuOpen(v => !v)} />
                                    {moveMenuOpen && (
                                        <div className="animate-scaleIn" style={{
                                            position: 'absolute', left: '100%', top: 0, zIndex: 101,
                                            background: '#17212b', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '10px', padding: '6px', minWidth: '160px',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                        }}>
                                            {COLUMNAS.filter(c => c !== task.estado).map(col => (
                                                <MenuItem key={col} icon={COLUMN_CONFIG[col].emoji} label={col} onClick={() => moveTask(col)} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <MenuItem icon="📋" label="Copiar ID" onClick={copyId} />
                                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }} />
                                <MenuItem icon="🗑️" label="Eliminar" onClick={deleteTask} danger />
                            </div>
                        )}
                    </div>
                </div>

                {/* Title */}
                <p style={{
                    margin: '0 0 4px', fontWeight: 600, fontSize: '13px',
                    lineHeight: 1.4, color: '#f5f5f5',
                }}>
                    {task.title}
                </p>

                {/* Pre-description */}
                {task.pre_description && (
                    <p style={{
                        margin: '0 0 10px', fontSize: '12px', color: '#708499',
                        lineHeight: 1.5, overflow: 'hidden',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                        {task.pre_description}
                    </p>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Comments */}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#708499', fontSize: '11px' }}>
                            <span>💬</span>
                            <span>{task.comment_count}</span>
                        </span>
                        {/* Due date */}
                        {dueDate && (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px',
                                color: overdue ? '#ff4b4b' : dueSoon ? '#f5c518' : '#708499',
                            }}>
                                <span>{overdue ? '🔴' : dueSoon ? '🟡' : '📅'}</span>
                                <span>{formatDistanceToNow(dueDate, { addSuffix: true, locale: es })}</span>
                            </span>
                        )}
                    </div>
                    <MemberAvatar profile={assignee} size={26} showTooltip />
                </div>
            </div>
        </div>
    )
}

function MenuItem({ icon, label, onClick, danger = false }: {
    icon: string; label: string; onClick: () => void; danger?: boolean
}) {
    return (
        <button onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
            borderRadius: '8px', border: 'none', background: 'none',
            color: danger ? '#ff6b6b' : '#f5f5f5', fontSize: '13px', cursor: 'pointer',
            width: '100%', textAlign: 'left', transition: 'background 0.12s',
        }}
            onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(255,75,75,0.1)' : 'rgba(255,255,255,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
            <span>{icon}</span> {label}
        </button>
    )
}
