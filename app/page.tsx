'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Tarea = {
  id: string; titulo: string; pre_descripcion: string; descripcion: string;
  estado: string; prioridad: string; fecha_vencimiento: string; creado_en: string;
}

export default function Home() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [form, setForm] = useState({ titulo: '', pre: '', desc: '', prioridad: 'Media', fecha: '' })
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => {
    fetchTareas()
    const channel = supabase.channel('exturguay-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, () => fetchTareas())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchTareas = async () => {
    const { data } = await supabase.from('tareas').select('*').order('creado_en', { ascending: false })
    if (data) setTareas(data)
  }

  const guardarTarea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim()) return
    await supabase.from('tareas').insert([{
      titulo: form.titulo, pre_descripcion: form.pre, descripcion: form.desc,
      prioridad: form.prioridad, fecha_vencimiento: form.fecha || null
    }])
    setForm({ titulo: '', pre: '', desc: '', prioridad: 'Media', fecha: '' })
    setMostrarForm(false)
  }

  const moverTarea = async (id: string, nuevoEstado: string) => {
    await supabase.from('tareas').update({ estado: nuevoEstado }).eq('id', id)
  }

  const eliminarTarea = async (id: string) => {
    if (confirm('¿Eliminar permanentemente?')) await supabase.from('tareas').delete().eq('id', id)
  }

  const columnas = ['Pendiente', 'En Progreso', 'Revisión', 'Terminado']

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <div className="max-w-full mx-auto">

        {/* Header con Toggle de Formulario */}
        <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-black tracking-tighter text-purple-500 uppercase">Exturguay v2.0</h1>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          >
            {mostrarForm ? '✕ Cerrar' : '+ Nueva Tarea Pro'}
          </button>
        </header>

        {/* Formulario Extendido */}
        {mostrarForm && (
          <form onSubmit={guardarTarea} className="mb-10 bg-zinc-900 p-6 rounded-2xl border border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4">
            <input type="text" placeholder="Título de la tarea" className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 outline-none focus:border-purple-500" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
            <input type="text" placeholder="Resumen corto (Pre-descripción)" className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 outline-none" value={form.pre} onChange={e => setForm({ ...form, pre: e.target.value })} />
            <textarea placeholder="Descripción detallada..." className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 outline-none md:col-span-2 h-24" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
            <select className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 outline-none" value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
              <option value="Baja">Prioridad Baja</option>
              <option value="Media">Prioridad Media</option>
              <option value="Alta">Prioridad Alta</option>
            </select>
            <input type="date" className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 outline-none" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
            <button className="md:col-span-2 bg-zinc-100 text-zinc-900 font-bold py-3 rounded-xl hover:bg-white transition-colors">Crear Tarea en el Tablero</button>
          </form>
        )}

        {/* Tablero Kanban */}
        <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
          {columnas.map(col => (
            <div key={col} className="min-w-[320px] w-[320px] flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="font-bold text-zinc-400 uppercase text-xs tracking-widest">{col}</h2>
                <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded-md text-zinc-500">{tareas.filter(t => t.estado === col).length}</span>
              </div>

              <div className="flex flex-col gap-3 min-h-[500px]">
                {tareas.filter(t => t.estado === col).map(tarea => (
                  <div key={tarea.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl hover:border-zinc-600 transition-all group relative">
                    <div className={`w-1 h-8 rounded-full absolute left-0 top-4 ${tarea.prioridad === 'Alta' ? 'bg-red-500' : tarea.prioridad === 'Media' ? 'bg-yellow-500' : 'bg-blue-500'}`} />

                    <h3 className="font-bold text-sm mb-1">{tarea.titulo}</h3>
                    {tarea.pre_descripcion && <p className="text-zinc-500 text-xs mb-3 italic">{tarea.pre_descripcion}</p>}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {tarea.fecha_vencimiento && (
                        <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700">
                          📅 {tarea.fecha_vencimiento}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                      <div className="flex gap-1">
                        <button onClick={() => moverTarea(tarea.id, columnas[columnas.indexOf(col) - 1])} disabled={col === 'Pendiente'} className="p-1 hover:bg-zinc-800 rounded disabled:opacity-0 text-xs">←</button>
                        <button onClick={() => moverTarea(tarea.id, columnas[columnas.indexOf(col) + 1])} disabled={col === 'Terminado'} className="p-1 hover:bg-zinc-800 rounded disabled:opacity-0 text-xs">→</button>
                      </div>
                      <button onClick={() => eliminarTarea(tarea.id)} className="text-[10px] text-zinc-600 hover:text-red-500">BORRAR</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}