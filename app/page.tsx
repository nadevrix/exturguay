'use client'

import { useEffect, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthProvider'
import type { Task, Profile, Tag } from '../lib/types'
import { COLUMNAS, COLUMN_CONFIG } from '../lib/types'
import TaskCard from '../components/TaskCard'
import CreateTaskModal from '../components/CreateTaskModal'
import TaskDetailPanel from '../components/TaskDetailPanel'
import MemberAvatar from '../components/MemberAvatar'
import LoginPage from './login/page'
import toast from 'react-hot-toast'

export default function Board() {
  const { member, loading, signOut } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [filterMember, setFilterMember] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [createColumn, setCreateColumn] = useState<Task['estado']>('Pendiente')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Real-time loading
  const fetchAll = useCallback(async () => {
    const [{ data: tasksData }, { data: membersData }, { data: tagsData }] = await Promise.all([
      supabase.from('tasks').select('*, assignee:profiles(*), tags:task_tags(tag:tags(*))').order('posicion', { ascending: true }),
      supabase.from('profiles').select('*').order('display_name'),
      supabase.from('tags').select('*').order('name'),
    ])
    if (tasksData) {
      // Flatten tags from task_tags join
      const normalized = tasksData.map((t: Record<string, unknown>) => ({
        ...t,
        tags: ((t.tags as { tag: Tag }[]) ?? []).map((tt) => tt.tag).filter(Boolean),
      }))
      setTasks(normalized as Task[])
    }
    if (membersData) setMembers(membersData as Profile[])
    if (tagsData) setTags(tagsData as Tag[])
  }, [])

  useEffect(() => {
    if (!member) return
    fetchAll()
    // Real-time subscription
    const channel = supabase.channel('board-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_tags' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [member, fetchAll])

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const destColumn = destination.droppableId as Task['estado']
    const tasksInDest = tasks.filter(t => t.estado === destColumn).sort((a, b) => a.posicion - b.posicion)

    let newPos: number
    if (tasksInDest.length === 0) newPos = 1000
    else if (destination.index === 0) newPos = tasksInDest[0].posicion / 2
    else if (destination.index >= tasksInDest.length) newPos = tasksInDest[tasksInDest.length - 1].posicion + 1000
    else newPos = (tasksInDest[destination.index - 1].posicion + tasksInDest[destination.index].posicion) / 2

    const updated = tasks.map(t =>
      t.id === draggableId ? { ...t, estado: destColumn, posicion: newPos } : t
    ).sort((a, b) => a.posicion - b.posicion)
    setTasks(updated)

    await supabase.from('tasks').update({ estado: destColumn, posicion: newPos }).eq('id', draggableId)
    if (destination.droppableId !== source.droppableId) {
      if (member?.id) {
        await supabase.from('activity_log').insert([{
          task_id: draggableId, actor_id: member.id, action: 'moved',
          payload: { from: source.droppableId, to: destColumn },
        }])
      }
      toast.success(`Movido a ${destColumn}`)
    }
  }

  // Filtering
  const filtered = tasks.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.title.toLowerCase().includes(q)
      || t.pre_description?.toLowerCase().includes(q)
      || t.tags?.some(tag => tag.name.toLowerCase().includes(q))
    const matchPriority = !filterPriority || t.prioridad === filterPriority
    const matchMember = !filterMember || t.assignee_id === filterMember
    return matchSearch && matchPriority && matchMember
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1621' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #3390ec, #1a6dbf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 16px', animation: 'pulse-glow 2s infinite' }}>E</div>
        <p style={{ color: '#708499', fontSize: '14px' }}>Cargando Exturguay...</p>
      </div>
    </div>
  )

  if (!member) return <LoginPage />

  return (
    <div style={{ minHeight: '100vh', background: '#0e1621', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: '#17212b', borderBottom: '1px solid rgba(0,0,0,0.3)',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 50,
        height: '56px', display: 'flex', alignItems: 'center', gap: '16px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '8px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3390ec, #1a6dbf)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '16px', boxShadow: '0 4px 12px rgba(51,144,236,0.3)',
          }}>E</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, lineHeight: 1.2 }}>Exturguay</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#4ea4f5', lineHeight: 1 }}>{tasks.length} tareas activas</p>
          </div>
        </div>

        {/* Search */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '520px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#708499', fontSize: '14px' }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tareas, etiquetas..."
              style={{
                width: '100%', background: '#242f3d', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px', padding: '7px 12px 7px 34px', color: '#f5f5f5', fontSize: '13px',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#708499', cursor: 'pointer', fontSize: '14px',
              }}>×</button>
            )}
          </div>

          {/* Filter by priority */}
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{
            background: '#242f3d', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px', padding: '7px 10px', color: filterPriority ? '#3390ec' : '#708499',
            fontSize: '12px', cursor: 'pointer', colorScheme: 'dark',
          }}>
            <option value="">Prioridad</option>
            <option value="Crítica">🔴 Crítica</option>
            <option value="Alta">🟠 Alta</option>
            <option value="Media">🟡 Media</option>
            <option value="Baja">🔵 Baja</option>
          </select>

          {/* Filter by member */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {members.slice(0, 5).map(m => (
              <div key={m.id} onClick={() => setFilterMember(f => f === m.id ? '' : m.id)} style={{ cursor: 'pointer', opacity: filterMember && filterMember !== m.id ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                <MemberAvatar profile={m} size={28} showTooltip selected={filterMember === m.id} />
              </div>
            ))}
          </div>

          {(search || filterPriority || filterMember) && (
            <button onClick={() => { setSearch(''); setFilterPriority(''); setFilterMember('') }} style={{
              padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,75,75,0.3)',
              background: 'rgba(255,75,75,0.1)', color: '#ff7070', cursor: 'pointer', fontSize: '11px',
            }}>
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Add button */}
        <button
          onClick={() => { setCreateColumn('Pendiente'); setShowCreate(true) }}
          className="btn-primary"
          style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Nueva Tarea
        </button>

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <div onClick={() => setUserMenuOpen(v => !v)} style={{ cursor: 'pointer' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: member.avatar_color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: '#fff',
            }}>
              {member.avatar_initials}
            </div>
          </div>
          {userMenuOpen && (
            <div className="animate-scaleIn" style={{
              position: 'absolute', right: 0, top: '44px', zIndex: 100,
              background: '#17212b', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px', padding: '8px', minWidth: '200px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <div style={{ padding: '10px 14px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{member.display_name}</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#708499' }}>@{member.username}</p>
              </div>
              <button onClick={async () => { setUserMenuOpen(false); await signOut(); toast('Sesión cerrada 👋') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                  borderRadius: '9px', border: 'none', background: 'none',
                  color: '#ff6b6b', fontSize: '13px', cursor: 'pointer', width: '100%', textAlign: 'left',
                  marginTop: '4px', transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,75,75,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                🚪 Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Stats bar */}
      <div style={{ padding: '12px 24px', display: 'flex', gap: '12px', alignItems: 'center', background: '#0e1621', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        {COLUMNAS.map(col => {
          const count = tasks.filter(t => t.estado === col).length
          return (
            <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#17212b', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '12px' }}>{COLUMN_CONFIG[col].emoji}</span>
              <span style={{ fontSize: '12px', color: '#708499' }}>{col}</span>
              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#f5f5f5',
                background: '#242f3d', borderRadius: '999px', padding: '0 6px', minWidth: '18px', textAlign: 'center',
              }}>{count}</span>
            </div>
          )
        })}
        {(search || filterPriority || filterMember) && (
          <span style={{ fontSize: '12px', color: '#3390ec', marginLeft: '4px' }}>
            🔍 {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Board */}
      <div style={{ flex: 1, padding: '20px 24px', overflowX: 'auto' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: '16px', minWidth: 'max-content', alignItems: 'flex-start' }}>
            {COLUMNAS.map(col => {
              const colTasks = filtered.filter(t => t.estado === col)
              const cfg = COLUMN_CONFIG[col]
              return (
                <div key={col} style={{ width: '296px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {/* Column header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{cfg.emoji}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
                      <span style={{
                        background: '#17212b', color: '#708499', fontSize: '11px', fontWeight: 700,
                        borderRadius: '999px', padding: '0 7px', border: '1px solid rgba(255,255,255,0.06)',
                      }}>{colTasks.length}</span>
                    </div>
                    <button
                      onClick={() => { setCreateColumn(col); setShowCreate(true) }}
                      style={{
                        background: 'none', border: 'none', color: '#708499', cursor: 'pointer',
                        fontSize: '18px', lineHeight: 1, borderRadius: '6px', padding: '2px 6px',
                        transition: 'color 0.15s',
                      }}
                      title="Agregar tarea"
                      onMouseEnter={e => (e.currentTarget.style.color = '#3390ec')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#708499')}
                    >
                      +
                    </button>
                  </div>

                  {/* Droppable */}
                  <Droppable droppableId={col}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          minHeight: '72px', padding: '8px',
                          background: snapshot.isDraggingOver ? 'rgba(51,144,236,0.07)' : '#17212b22',
                          borderRadius: '16px',
                          border: snapshot.isDraggingOver ? '1px solid rgba(51,144,236,0.25)' : '1px solid rgba(255,255,255,0.04)',
                          transition: 'all 0.2s',
                          display: 'flex', flexDirection: 'column', gap: '8px',
                        }}
                      >
                        {colTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  transform: snapshot.isDragging
                                    ? `${provided.draggableProps.style?.transform} rotate(1.5deg)`
                                    : provided.draggableProps.style?.transform,
                                }}
                                className={snapshot.isDragging ? 'task-card dragging' : ''}
                              >
                                <TaskCard
                                  task={task}
                                  members={members}
                                  onDeleted={fetchAll}
                                  onClick={() => setSelectedTask(task)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div style={{ textAlign: 'center', padding: '20px 16px', color: '#708499', fontSize: '12px' }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>
                              {col === 'Terminado' ? '🎉' : '📋'}
                            </div>
                            {col === 'Terminado' ? 'Sin tareas terminadas aún' : 'Sin tareas aquí'}
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateTaskModal
          initialColumn={createColumn}
          members={members}
          tags={tags}
          onClose={() => setShowCreate(false)}
          onCreated={fetchAll}
        />
      )}

      {selectedTask && (
        <TaskDetailPanel
          task={tasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          members={members}
          tags={tags}
          onClose={() => setSelectedTask(null)}
          onUpdated={fetchAll}
        />
      )}
    </div>
  )
}
