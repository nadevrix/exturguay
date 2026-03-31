'use client'

import { useState, useEffect } from 'react'
import type { Tag, Profile, Task } from '../lib/types'
import { PRIORITY_CONFIG, COLUMNAS } from '../lib/types'
import { supabase } from '../lib/supabase'
import MemberAvatar from './MemberAvatar'
import { useAuth } from '../lib/auth/AuthProvider'
import toast from 'react-hot-toast'

type Props = {
    initialColumn?: Task['estado']
    members: Profile[]
    tags: Tag[]
    onClose: () => void
    onCreated: () => void
}

export default function CreateTaskModal({ initialColumn = 'Pendiente', members, tags, onClose, onCreated }: Props) {
    const { member } = useAuth()
    const [title, setTitle] = useState('')
    const [preDesc, setPreDesc] = useState('')
    const [prioridad, setPrioridad] = useState<Task['prioridad']>('Media')
    const [estado, setEstado] = useState<Task['estado']>(initialColumn)
    const [assigneeId, setAssigneeId] = useState<string | null>(null)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [dueDate, setDueDate] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onClose])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return
        setLoading(true)

        const { data: task, error } = await supabase.from('tasks').insert([{
            title: title.trim(),
            pre_description: preDesc.trim() || null,
            prioridad,
            estado,
            assignee_id: assigneeId,
            created_by: member?.id ?? null,
            due_date: dueDate || null,
            posicion: Date.now(),
            project_id: '00000000-0000-0000-0000-000000000001',
        }]).select().single()

        if (!error && task && selectedTags.length > 0) {
            await supabase.from('task_tags').insert(selectedTags.map(tid => ({ task_id: task.id, tag_id: tid })))
        }

        if (task && member?.id) {
            await supabase.from('activity_log').insert([{
                task_id: task.id, actor_id: member.id,
                action: 'created', payload: { title: task.title },
            }])
        }

        setLoading(false)
        if (!error) {
            toast.success('Tarea creada ✨')
            onCreated()
            onClose()
        }
    }

    const toggleTag = (tid: string) => {
        setSelectedTags(prev => prev.includes(tid) ? prev.filter(t => t !== tid) : [...prev, tid])
    }

    return (
        <div
            className="modal-backdrop"
            style={{
                position: 'fixed', inset: 0, zIndex: 200,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="animate-scaleIn" style={{
                background: '#17212b', borderRadius: '20px', padding: '0',
                width: '100%', maxWidth: '540px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>✨ Nueva Tarea</h2>
                    <button onClick={onClose} style={{
                        background: 'none', color: '#708499', cursor: 'pointer',
                        fontSize: '20px', lineHeight: 1, border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '2px 8px',
                    }}>×</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Title */}
                    <div>
                        <input
                            autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="Título de la tarea..."
                            required
                            style={{
                                width: '100%', background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px', padding: '13px 16px', color: '#f5f5f5', fontSize: '15px',
                                fontWeight: 600,
                            }}
                        />
                    </div>

                    {/* Pre-description */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ fontSize: '12px', color: '#708499', fontWeight: 600 }}>RESUMEN</label>
                            <span style={{ fontSize: '11px', color: preDesc.length > 90 ? '#f5c518' : '#708499' }}>{preDesc.length}/100</span>
                        </div>
                        <input
                            type="text" value={preDesc} onChange={e => setPreDesc(e.target.value.slice(0, 100))}
                            placeholder="Descripción corta (opcional)"
                            style={{
                                width: '100%', background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px', padding: '11px 16px', color: '#f5f5f5', fontSize: '13px',
                            }}
                        />
                    </div>

                    {/* Priority + Status row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '12px', color: '#708499', fontWeight: 600, display: 'block', marginBottom: '8px' }}>PRIORIDAD</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {(Object.keys(PRIORITY_CONFIG) as Task['prioridad'][]).map(p => (
                                    <button key={p} type="button" onClick={() => setPrioridad(p)} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
                                        borderRadius: '9px', border: prioridad === p ? `1px solid ${PRIORITY_CONFIG[p].color}40` : '1px solid transparent',
                                        background: prioridad === p ? PRIORITY_CONFIG[p].bg : '#242f3d',
                                        cursor: 'pointer', color: prioridad === p ? PRIORITY_CONFIG[p].color : '#708499',
                                        fontSize: '13px', fontWeight: prioridad === p ? 600 : 400, transition: 'all 0.15s',
                                    }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PRIORITY_CONFIG[p].color }} />
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', color: '#708499', fontWeight: 600, display: 'block', marginBottom: '8px' }}>COLUMNA</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {COLUMNAS.map(c => (
                                    <button key={c} type="button" onClick={() => setEstado(c)} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
                                        borderRadius: '9px', border: estado === c ? '1px solid rgba(51,144,236,0.4)' : '1px solid transparent',
                                        background: estado === c ? 'rgba(51,144,236,0.12)' : '#242f3d',
                                        cursor: 'pointer', color: estado === c ? '#3390ec' : '#708499',
                                        fontSize: '12px', fontWeight: estado === c ? 600 : 400, transition: 'all 0.15s',
                                    }}>
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Assignee */}
                    <div>
                        <label style={{ fontSize: '12px', color: '#708499', fontWeight: 600, display: 'block', marginBottom: '8px' }}>ASIGNAR A</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <div onClick={() => setAssigneeId(null)} style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: assigneeId === null ? 'rgba(51,144,236,0.2)' : '#242f3d',
                                border: assigneeId === null ? '2px solid #3390ec' : '2px solid transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s',
                            }}>
                                ∅
                            </div>
                            {members.map(m => (
                                <MemberAvatar key={m.id} profile={m} size={36} selected={assigneeId === m.id}
                                    onClick={() => setAssigneeId(m.id)} showTooltip />
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div>
                            <label style={{ fontSize: '12px', color: '#708499', fontWeight: 600, display: 'block', marginBottom: '8px' }}>ETIQUETAS</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {tags.map(tag => {
                                    const active = selectedTags.includes(tag.id)
                                    return (
                                        <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} style={{
                                            padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                                            border: active ? `1px solid ${tag.color}60` : '1px solid rgba(255,255,255,0.08)',
                                            background: active ? `${tag.color}25` : '#242f3d',
                                            color: active ? tag.color : '#708499', cursor: 'pointer', transition: 'all 0.15s',
                                        }}>
                                            {tag.name}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Due date */}
                    <div>
                        <label style={{ fontSize: '12px', color: '#708499', fontWeight: 600, display: 'block', marginBottom: '8px' }}>FECHA LÍMITE</label>
                        <input
                            type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
                            style={{
                                background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px', padding: '11px 16px', color: '#f5f5f5', fontSize: '13px',
                                colorScheme: 'dark',
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                        <button type="button" onClick={onClose} style={{
                            padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                            background: 'none', color: '#708499', cursor: 'pointer', fontSize: '13px',
                        }}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading || !title.trim()} className="btn-primary"
                            style={{ padding: '10px 24px', fontSize: '13px', opacity: !title.trim() ? 0.5 : 1 }}>
                            {loading ? '⏳ Creando...' : '✨ Crear Tarea'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
