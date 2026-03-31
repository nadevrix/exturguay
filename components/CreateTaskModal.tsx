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
    const [description, setDescription] = useState('')
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
            description: description.trim() || null,
            pre_description: preDesc.trim() || null,
            prioridad,
            estado,
            assignee_id: assigneeId || null,
            created_by: null,
            due_date: dueDate || null,
            posicion: Date.now(),
        }]).select().single()

        if (error) {
            toast.error(`Error: ${error.message}`)
            setLoading(false)
            return
        }

        if (task && selectedTags.length > 0) {
            await supabase.from('task_tags').insert(selectedTags.map(tid => ({ task_id: task.id, tag_id: tid })))
        }

        setLoading(false)
        toast.success('Tarea creada ✨')
        onCreated()
        onClose()
    }

    const toggleTag = (tid: string) =>
        setSelectedTags(prev => prev.includes(tid) ? prev.filter(t => t !== tid) : [...prev, tid])

    return (
        <div
            className="modal-backdrop"
            style={{
                position: 'fixed', inset: 0, zIndex: 200,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="animate-scaleIn" style={{
                background: '#17212b',
                borderRadius: '20px',
                width: '100%', maxWidth: '600px',
                maxHeight: '92vh',          /* ← nunca se sale de pantalla */
                display: 'flex', flexDirection: 'column',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                overflow: 'hidden',
            }}>
                {/* Header fijo */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexShrink: 0,
                }}>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>✨ Nueva Tarea</h2>
                    <button onClick={onClose} style={{
                        background: 'none', color: '#708499', cursor: 'pointer',
                        fontSize: '20px', lineHeight: 1, border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '1px 8px',
                    }}>×</button>
                </div>

                {/* Cuerpo con scroll */}
                <form onSubmit={handleSubmit} style={{
                    flex: 1, overflowY: 'auto',
                    display: 'flex', flexDirection: 'column',
                }}>
                    {/* ── ZONA PRINCIPAL: Título + Descripción (estilo ClickUp) ── */}
                    <div style={{ padding: '20px 20px 0' }}>
                        {/* Título */}
                        <input
                            autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="Nombre de la tarea..."
                            required
                            style={{
                                width: '100%', background: 'none', border: 'none',
                                color: '#f5f5f5', fontSize: '20px', fontWeight: 700,
                                padding: '0', marginBottom: '10px', outline: 'none',
                            }}
                        />
                        {/* Descripción estilo ClickUp — grande y prominente, no "opcional" */}
                        <textarea
                            value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Agrega una descripción, pasos, o bloques de código...&#10;&#10;Soporta Markdown:  **negrita**  `código`  ```js ... ```"
                            rows={6}
                            style={{
                                width: '100%', background: 'none', border: 'none',
                                color: '#a8b8cc', fontSize: '13px', lineHeight: 1.7,
                                resize: 'none', outline: 'none', padding: '0',
                                fontFamily: 'Inter, sans-serif',
                            }}
                        />
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />

                    {/* ── METADATOS compactos ── */}
                    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>

                        {/* Fila 1: Prioridad + Columna */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#708499', fontWeight: 700, letterSpacing: '0.07em' }}>PRIORIDAD</p>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {(Object.keys(PRIORITY_CONFIG) as Task['prioridad'][]).map(p => (
                                        <button key={p} type="button" onClick={() => setPrioridad(p)} style={{
                                            padding: '4px 10px', borderRadius: '999px', border: 'none',
                                            background: prioridad === p ? PRIORITY_CONFIG[p].bg : '#242f3d',
                                            color: prioridad === p ? PRIORITY_CONFIG[p].color : '#708499',
                                            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                            outline: prioridad === p ? `1px solid ${PRIORITY_CONFIG[p].color}50` : '1px solid transparent',
                                            transition: 'all 0.15s',
                                        }}>
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#708499', fontWeight: 700, letterSpacing: '0.07em' }}>COLUMNA</p>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {COLUMNAS.map(c => (
                                        <button key={c} type="button" onClick={() => setEstado(c)} style={{
                                            padding: '4px 10px', borderRadius: '999px', border: 'none',
                                            background: estado === c ? 'rgba(51,144,236,0.15)' : '#242f3d',
                                            color: estado === c ? '#3390ec' : '#708499',
                                            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                            outline: estado === c ? '1px solid rgba(51,144,236,0.4)' : '1px solid transparent',
                                            transition: 'all 0.15s',
                                        }}>
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Fila 2: Asignar + Fecha */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#708499', fontWeight: 700, letterSpacing: '0.07em' }}>ASIGNAR A</p>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <div onClick={() => setAssigneeId(null)} style={{
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        background: assigneeId === null ? 'rgba(51,144,236,0.2)' : '#242f3d',
                                        border: assigneeId === null ? '2px solid #3390ec' : '2px solid transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s',
                                    }}>∅</div>
                                    {members.map(m => (
                                        <MemberAvatar key={m.id} profile={m} size={30} selected={assigneeId === m.id}
                                            onClick={() => setAssigneeId(m.id)} showTooltip />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#708499', fontWeight: 700, letterSpacing: '0.07em' }}>FECHA LÍMITE</p>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    style={{
                                        background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px', padding: '7px 12px', color: dueDate ? '#f5f5f5' : '#708499',
                                        fontSize: '12px', cursor: 'pointer', colorScheme: 'dark', width: '100%',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Resumen corto */}
                        <div>
                            <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#708499', fontWeight: 700, letterSpacing: '0.07em' }}>
                                RESUMEN CORTO <span style={{ color: '#516070', fontWeight: 400 }}>({preDesc.length}/100)</span>
                            </p>
                            <input
                                type="text" value={preDesc} onChange={e => setPreDesc(e.target.value.slice(0, 100))}
                                placeholder="Una frase que resume la tarea (aparece en la tarjeta)"
                                style={{
                                    width: '100%', background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '10px', padding: '9px 12px', color: '#f5f5f5', fontSize: '12px',
                                }}
                            />
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div>
                                <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#708499', fontWeight: 700, letterSpacing: '0.07em' }}>ETIQUETAS</p>
                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                    {tags.map(tag => {
                                        const active = selectedTags.includes(tag.id)
                                        return (
                                            <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} style={{
                                                padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
                                                border: active ? `1px solid ${tag.color}60` : '1px solid rgba(255,255,255,0.08)',
                                                background: active ? `${tag.color}20` : '#242f3d',
                                                color: active ? tag.color : '#708499', cursor: 'pointer', transition: 'all 0.15s',
                                            }}>
                                                {tag.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer fijo */}
                <div style={{
                    padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', gap: '8px', justifyContent: 'flex-end', flexShrink: 0,
                    background: '#17212b',
                }}>
                    <button type="button" onClick={onClose} style={{
                        padding: '9px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                        background: 'none', color: '#708499', cursor: 'pointer', fontSize: '13px',
                    }}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit as unknown as React.MouseEventHandler}
                        disabled={loading || !title.trim()}
                        className="btn-primary"
                        style={{ padding: '9px 22px', fontSize: '13px', opacity: !title.trim() ? 0.5 : 1 }}
                    >
                        {loading ? '⏳ Creando...' : '✨ Crear Tarea'}
                    </button>
                </div>
            </div>
        </div>
    )
}
