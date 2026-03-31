'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Task, Profile, Tag, Comment, ActivityLog, Attachment } from '../lib/types'
import { PRIORITY_CONFIG, COLUMN_CONFIG, COLUMNAS } from '../lib/types'
import { supabase } from '../lib/supabase'
import MemberAvatar from './MemberAvatar'
import { useAuth } from '../lib/auth/AuthProvider'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { CSSProperties } from 'react'
const syntaxStyle = vscDarkPlus as { [key: string]: CSSProperties }
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type Props = {
    task: Task
    members: Profile[]
    tags: Tag[]
    onClose: () => void
    onUpdated: () => void
}

export default function TaskDetailPanel({ task, members, tags, onClose, onUpdated }: Props) {
    const { member } = useAuth()
    const [editingTitle, setEditingTitle] = useState(false)
    const [title, setTitle] = useState(task.title)
    const [description, setDescription] = useState(task.description ?? '')
    const [preDesc, setPreDesc] = useState(task.pre_description ?? '')
    const [estado, setEstado] = useState<Task['estado']>(task.estado)
    const [prioridad, setPrioridad] = useState<Task['prioridad']>(task.prioridad)
    const [assigneeId, setAssigneeId] = useState<string | null>(task.assignee_id)
    const [dueDate, setDueDate] = useState(task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '')
    const [selectedTags, setSelectedTags] = useState<string[]>(task.tags?.map(t => t.id) ?? [])
    const [descTab, setDescTab] = useState<'edit' | 'preview'>('edit')
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')
    const [activity, setActivity] = useState<ActivityLog[]>([])
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [draggingFile, setDraggingFile] = useState(false)
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const titleRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadComments()
        loadActivity()
        loadAttachments()
        loadTaskTags()
    }, [task.id])

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onClose])

    const loadComments = async () => {
        const { data } = await supabase.from('comments').select('*, author:profiles(*)').eq('task_id', task.id).order('created_at')
        setComments((data as Comment[]) ?? [])
    }
    const loadActivity = async () => {
        const { data } = await supabase.from('activity_log').select('*, actor:profiles(*)').eq('task_id', task.id).order('created_at', { ascending: false }).limit(20)
        setActivity((data as ActivityLog[]) ?? [])
    }
    const loadAttachments = async () => {
        const { data } = await supabase.from('attachments').select('*').eq('task_id', task.id).order('created_at')
        setAttachments((data as Attachment[]) ?? [])
    }
    const loadTaskTags = async () => {
        const { data } = await supabase.from('task_tags').select('tag_id').eq('task_id', task.id)
        if (data) setSelectedTags(data.map((r: { tag_id: string }) => r.tag_id))
    }

    const autoSave = useCallback((updates: Partial<Task>) => {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(async () => {
            const { error } = await supabase.from('tasks').update(updates).eq('id', task.id)
            if (!error) onUpdated()
        }, 600)
    }, [task.id, onUpdated])

    const saveTitle = async () => {
        setEditingTitle(false)
        if (title.trim() !== task.title) {
            await supabase.from('tasks').update({ title: title.trim() }).eq('id', task.id)
            logActivity('updated', { field: 'title', from: task.title, to: title.trim() })
            onUpdated()
        }
    }

    const logActivity = async (action: string, payload?: Record<string, unknown>) => {
        if (!member?.id) return
        await supabase.from('activity_log').insert([{ task_id: task.id, actor_id: member.id, action, payload }])
        loadActivity()
    }

    const handleEstadoChange = async (val: Task['estado']) => {
        const prev = estado
        setEstado(val)
        await supabase.from('tasks').update({ estado: val, posicion: Date.now() }).eq('id', task.id)
        logActivity('moved', { from: prev, to: val })
        onUpdated()
    }

    const handleAssigneeChange = async (id: string | null) => {
        setAssigneeId(id)
        await supabase.from('tasks').update({ assignee_id: id }).eq('id', task.id)
        logActivity('assigned', { assignee_id: id })
        onUpdated()
    }

    const handlePrioridadChange = async (val: Task['prioridad']) => {
        setPrioridad(val)
        await supabase.from('tasks').update({ prioridad: val }).eq('id', task.id)
        onUpdated()
    }

    const handleDueDateChange = async (val: string) => {
        setDueDate(val)
        await supabase.from('tasks').update({ due_date: val || null }).eq('id', task.id)
        onUpdated()
    }

    const handleTagToggle = async (tagId: string) => {
        const active = selectedTags.includes(tagId)
        if (active) {
            setSelectedTags(p => p.filter(t => t !== tagId))
            await supabase.from('task_tags').delete().eq('task_id', task.id).eq('tag_id', tagId)
        } else {
            setSelectedTags(p => [...p, tagId])
            await supabase.from('task_tags').insert([{ task_id: task.id, tag_id: tagId }])
        }
    }

    const submitComment = async () => {
        if (!newComment.trim() || !member?.id) return
        await supabase.from('comments').insert([{ task_id: task.id, author_id: member.id, content: newComment.trim() }])
        logActivity('commented', { preview: newComment.trim().slice(0, 50) })
        setNewComment('')
        loadComments()
    }

    const handleFileDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setDraggingFile(false)
        const files = Array.from(e.dataTransfer.files)
        for (const file of files) {
            const path = `tasks/${task.id}/${Date.now()}_${file.name}`
            const { error } = await supabase.storage.from('attachments').upload(path, file)
            if (!error) {
                const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
                await supabase.from('attachments').insert([{
                    task_id: task.id,
                    uploaded_by: member?.id ?? null,
                    file_name: file.name,
                    file_url: urlData.publicUrl,
                    file_size: file.size,
                    mime_type: file.type,
                }])
                logActivity('attachment_added', { file_name: file.name })
                loadAttachments()
                toast.success(`📎 ${file.name} subido`)
            } else {
                toast.error(`Error subiendo ${file.name}`)
            }
        }
    }

    const assignee = members.find(m => m.id === assigneeId) ?? null
    const priority = PRIORITY_CONFIG[prioridad]

    return (
        <div
            className="modal-backdrop"
            style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="animate-slideInRight" style={{
                width: '100%', maxWidth: '680px', height: '100%',
                background: '#17212b', overflowY: 'auto',
                borderLeft: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Sticky Header */}
                <div style={{
                    padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    position: 'sticky', top: 0, background: '#17212b', zIndex: 10,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '4px', height: '20px', borderRadius: '2px', background: priority.color }} />
                        <span style={{ fontSize: '11px', color: '#708499', fontFamily: 'monospace' }}>
                            #{task.id.slice(0, 8)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={onClose} style={{
                            padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                            background: 'none', color: '#708499', cursor: 'pointer', fontSize: '13px',
                        }}>
                            ✕ Cerrar
                        </button>
                    </div>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                    {/* Title */}
                    <div>
                        {editingTitle ? (
                            <input
                                ref={titleRef} autoFocus value={title} onChange={e => setTitle(e.target.value)}
                                onBlur={saveTitle}
                                onKeyDown={e => { if (e.key === 'Enter') saveTitle() }}
                                style={{
                                    width: '100%', background: 'rgba(51,144,236,0.1)', border: '1px solid rgba(51,144,236,0.4)',
                                    borderRadius: '10px', padding: '8px 12px', color: '#f5f5f5',
                                    fontSize: '22px', fontWeight: 700, outline: 'none',
                                }}
                            />
                        ) : (
                            <h1
                                onClick={() => setEditingTitle(true)}
                                style={{
                                    margin: 0, fontSize: '22px', fontWeight: 700, cursor: 'text',
                                    padding: '8px', borderRadius: '10px', border: '1px solid transparent',
                                    transition: 'border-color 0.15s, background 0.15s',
                                }}
                                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgba(51,144,236,0.3)'; (e.target as HTMLElement).style.background = 'rgba(51,144,236,0.06)' }}
                                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'transparent'; (e.target as HTMLElement).style.background = 'transparent' }}
                                title="Click para editar"
                            >
                                {title} <span style={{ fontSize: '14px', color: '#708499' }}>✏️</span>
                            </h1>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div style={{
                        background: '#1c2a38', borderRadius: '16px', padding: '20px',
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        {/* Status */}
                        <div>
                            <label style={{ fontSize: '11px', color: '#708499', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>ESTADO</label>
                            <select value={estado} onChange={e => handleEstadoChange(e.target.value as Task['estado'])}
                                style={{
                                    width: '100%', background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '10px', padding: '9px 12px', color: '#f5f5f5', fontSize: '13px',
                                    cursor: 'pointer', colorScheme: 'dark',
                                }}>
                                {COLUMNAS.map(c => <option key={c} value={c}>{COLUMN_CONFIG[c].emoji} {c}</option>)}
                            </select>
                        </div>

                        {/* Priority */}
                        <div>
                            <label style={{ fontSize: '11px', color: '#708499', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>PRIORIDAD</label>
                            <select value={prioridad} onChange={e => handlePrioridadChange(e.target.value as Task['prioridad'])}
                                style={{
                                    width: '100%', background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '10px', padding: '9px 12px', fontSize: '13px',
                                    cursor: 'pointer', color: priority.color, colorScheme: 'dark',
                                }}>
                                {(Object.keys(PRIORITY_CONFIG) as Task['prioridad'][]).map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* Assignee */}
                        <div>
                            <label style={{ fontSize: '11px', color: '#708499', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>ENCARGADO</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div onClick={() => handleAssigneeChange(null)} style={{
                                    width: '32px', height: '32px', borderRadius: '50%', background: assigneeId === null ? 'rgba(51,144,236,0.2)' : '#242f3d',
                                    border: assigneeId === null ? '2px solid #3390ec' : '2px solid transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px',
                                }}>∅</div>
                                {members.map(m => (
                                    <MemberAvatar key={m.id} profile={m} size={32} selected={assigneeId === m.id}
                                        onClick={() => handleAssigneeChange(m.id)} showTooltip />
                                ))}
                            </div>
                        </div>

                        {/* Due date */}
                        <div>
                            <label style={{ fontSize: '11px', color: '#708499', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>FECHA LÍMITE</label>
                            <input type="datetime-local" value={dueDate} onChange={e => handleDueDateChange(e.target.value)}
                                style={{
                                    width: '100%', background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '10px', padding: '9px 12px', color: '#f5f5f5', fontSize: '13px',
                                    colorScheme: 'dark',
                                }}
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div>
                            <label style={{ fontSize: '11px', color: '#708499', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>ETIQUETAS</label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {tags.map(tag => {
                                    const active = selectedTags.includes(tag.id)
                                    return (
                                        <button key={tag.id} onClick={() => handleTagToggle(tag.id)} style={{
                                            padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
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

                    {/* Pre-description */}
                    <div>
                        <label style={{ fontSize: '11px', color: '#708499', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>RESUMEN RÁPIDO</label>
                        <input
                            type="text" value={preDesc}
                            onChange={e => { setPreDesc(e.target.value.slice(0, 100)); autoSave({ pre_description: e.target.value.slice(0, 100) }) }}
                            placeholder="Resumen breve (máx 100 caracteres)"
                            style={{
                                width: '100%', background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px', padding: '10px 14px', color: '#f5f5f5', fontSize: '13px',
                            }}
                        />
                    </div>

                    {/* Description (Markdown) */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={{ fontSize: '11px', color: '#708499', fontWeight: 600, letterSpacing: '0.06em' }}>DESCRIPCIÓN (MARKDOWN)</label>
                            <div style={{ display: 'flex', background: '#242f3d', borderRadius: '8px', padding: '3px' }}>
                                {(['edit', 'preview'] as const).map(tab => (
                                    <button key={tab} onClick={() => setDescTab(tab)} style={{
                                        padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px',
                                        background: descTab === tab ? '#3390ec' : 'transparent',
                                        color: descTab === tab ? '#fff' : '#708499', transition: 'all 0.15s',
                                    }}>
                                        {tab === 'edit' ? '✏️ Editar' : '👁 Vista'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {descTab === 'edit' ? (
                            <textarea
                                value={description}
                                onChange={e => { setDescription(e.target.value); autoSave({ description: e.target.value }) }}
                                placeholder={`Describe la tarea...\n\n## Usa Markdown:\n- **negrita**, *cursiva*\n- \`código\`\n- [ ] checklists\n\`\`\`js\nconsole.log('hello')\n\`\`\``}
                                rows={10}
                                style={{
                                    width: '100%', background: '#1a2233', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px', padding: '14px', color: '#f5f5f5', fontSize: '13px',
                                    lineHeight: 1.7, resize: 'vertical', fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                }}
                            />
                        ) : (
                            <div className="markdown-body" style={{
                                background: '#1a2233', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px', padding: '16px', minHeight: '140px',
                            }}>
                                {description ? (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                            code({ className, children, ...props }) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                return match ? (
                                                    // @ts-ignore - react-syntax-highlighter style type mismatch
                                                    <SyntaxHighlighter style={syntaxStyle} language={match[1]} PreTag="div">
                                                        {String(children).replace(/\n$/, '')}
                                                    </SyntaxHighlighter>
                                                ) : (
                                                    <code className={className} {...props}>{children}</code>
                                                )
                                            },
                                        }}
                                    >
                                        {description}
                                    </ReactMarkdown>
                                ) : (
                                    <p style={{ color: '#708499', margin: 0, fontSize: '13px' }}>Sin descripción aún. Cambia a modo edición para escribir.</p>
                                )}
                            </div>
                        )}
                        <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#708499' }}>Auto-guardado activado ⚡</p>
                    </div>

                    {/* Attachments */}
                    <div>
                        <label style={{ fontSize: '11px', color: '#708499', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
                            ADJUNTOS ({attachments.length})
                        </label>
                        <div
                            onDragOver={e => { e.preventDefault(); setDraggingFile(true) }}
                            onDragLeave={() => setDraggingFile(false)}
                            onDrop={handleFileDrop}
                            style={{
                                border: `2px dashed ${draggingFile ? '#3390ec' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '14px', padding: '24px',
                                textAlign: 'center', transition: 'all 0.2s',
                                background: draggingFile ? 'rgba(51,144,236,0.08)' : '#1a2233',
                            }}
                        >
                            <p style={{ color: draggingFile ? '#3390ec' : '#708499', margin: 0, fontSize: '13px' }}>
                                {draggingFile ? '📥 Suelta aquí' : '📎 Arrastra archivos aquí para adjuntar'}
                            </p>
                        </div>
                        {attachments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                                {attachments.map(att => (
                                    <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                        background: '#242f3d', borderRadius: '10px', textDecoration: 'none',
                                        color: '#f5f5f5', fontSize: '13px', border: '1px solid rgba(255,255,255,0.06)',
                                        transition: 'background 0.15s',
                                    }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#2b3a4d')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#242f3d')}
                                    >
                                        <span style={{ fontSize: '18px' }}>{att.mime_type?.startsWith('image/') ? '🖼️' : '📄'}</span>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontWeight: 500 }}>{att.file_name}</p>
                                            {att.file_size && <p style={{ margin: 0, fontSize: '11px', color: '#708499' }}>{(att.file_size / 1024).toFixed(1)} KB</p>}
                                        </div>
                                        <span style={{ color: '#3390ec', fontSize: '12px' }}>Abrir →</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    <div>
                        <label style={{ fontSize: '11px', color: '#708499', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>
                            COMENTARIOS ({comments.length})
                        </label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                            <MemberAvatar profile={member ? { id: member.id, username: member.username, display_name: member.display_name, avatar_color: member.avatar_color, avatar_initials: member.avatar_initials, role: 'member', created_at: '' } : null} size={32} />
                            <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                                <input
                                    value={newComment} onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                                    placeholder="Escribe un comentario... (Enter para enviar)"
                                    style={{
                                        flex: 1, background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '10px', padding: '10px 14px', color: '#f5f5f5', fontSize: '13px',
                                    }}
                                />
                                <button onClick={submitComment} className="btn-primary"
                                    style={{ padding: '0 16px', fontSize: '13px', flexShrink: 0 }}>
                                    ↑
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {comments.map(c => {
                                const author = members.find(m => m.id === c.author_id)
                                return (
                                    <div key={c.id} style={{ display: 'flex', gap: '10px' }} className="animate-fadeIn">
                                        <MemberAvatar profile={author ?? null} size={32} />
                                        <div style={{ flex: 1, background: '#1c2a38', borderRadius: '12px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#3390ec' }}>{author?.display_name ?? 'Usuario'}</span>
                                                <span style={{ fontSize: '11px', color: '#708499' }}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#c8d8e8', lineHeight: 1.5 }}>{c.content}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div>
                        <label style={{ fontSize: '11px', color: '#708499', fontWeight: 600, letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>
                            ACTIVIDAD RECIENTE
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activity.length === 0 && (
                                <p style={{ color: '#708499', fontSize: '13px', margin: 0 }}>Sin actividad registrada.</p>
                            )}
                            {activity.map(entry => {
                                const actor = members.find(m => m.id === entry.actor_id)
                                const actionLabel: Record<string, string> = {
                                    created: 'creó esta tarea',
                                    moved: `movió de "${(entry.payload as { from?: string })?.from}" a "${(entry.payload as { to?: string })?.to}"`,
                                    updated: `editó ${(entry.payload as { field?: string })?.field ?? 'la tarea'}`,
                                    commented: 'dejó un comentario',
                                    assigned: 'cambió el encargado',
                                    deleted: 'eliminó algo',
                                    attachment_added: `adjuntó "${(entry.payload as { file_name?: string })?.file_name}"`,
                                }
                                return (
                                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <MemberAvatar profile={actor ?? null} size={24} />
                                        <p style={{ margin: 0, fontSize: '12px', color: '#708499', lineHeight: 1.4 }}>
                                            <span style={{ color: '#a8b8cc', fontWeight: 500 }}>{actor?.display_name ?? '?'}</span>
                                            {' '}{actionLabel[entry.action] ?? entry.action}
                                            <span style={{ color: '#516070', marginLeft: '6px' }}>
                                                · {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: es })}
                                            </span>
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
