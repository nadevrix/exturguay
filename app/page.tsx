'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

type Tarea = {
  id: string; titulo: string; pre_descripcion: string;
  estado: string; prioridad: string; posicion: number;
  encargado: string; // Nueva: 'R', 'A', 'J' (por ejemplo)
}

export default function Home() {
  const [tareas, setTareas] = useState<Tarea[]>([])

  useEffect(() => {
    fetchTareas()
    const channel = supabase.channel('telegram-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, () => fetchTareas())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchTareas = async () => {
    const { data } = await supabase.from('tareas').select('*').order('posicion', { ascending: true })
    if (data) setTareas(data)
  }

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const tareasEnColumna = tareas.filter(t => t.estado === destination.droppableId);
    let nuevaPosicion: number;

    if (tareasEnColumna.length === 0) {
      nuevaPosicion = 1000;
    } else if (destination.index === 0) {
      nuevaPosicion = tareasEnColumna[0].posicion / 2;
    } else if (destination.index === tareasEnColumna.length) {
      nuevaPosicion = tareasEnColumna[tareasEnColumna.length - 1].posicion + 1000;
    } else {
      const prev = tareasEnColumna[destination.index - 1].posicion;
      const next = tareasEnColumna[destination.index].posicion;
      nuevaPosicion = (prev + next) / 2;
    }

    const nuevasTareas = Array.from(tareas);
    const index = nuevasTareas.findIndex(t => t.id === draggableId);
    nuevasTareas[index] = { ...nuevasTareas[index], estado: destination.droppableId, posicion: nuevaPosicion };
    setTareas(nuevasTareas.sort((a, b) => a.posicion - b.posicion));

    await supabase.from('tareas')
      .update({ estado: destination.droppableId, posicion: nuevaPosicion })
      .eq('id', draggableId);
  };

  const columnas = ['Pendiente', 'En Progreso', 'Revisión', 'Terminado']

  // Colores de avatares estilo Telegram
  const getAvatarColor = (char: string) => {
    const colors: { [key: string]: string } = {
      'R': 'bg-orange-500',
      'K': 'bg-green-500',
      'A': 'bg-blue-400'
    };
    return colors[char] || 'bg-purple-500';
  }

  return (
    <main className="min-h-screen bg-[#0e1621] text-[#f5f5f5] font-sans">
      {/* Barra Superior estilo Telegram */}
      <header className="bg-[#17212b] border-b border-black/20 p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3390ec] rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
              E
            </div>
            <div>
              <h1 className="font-bold text-sm">Exturguay Official</h1>
              <p className="text-[#4ea4f5] text-xs">3 miembros, online</p>
            </div>
          </div>
          <input
            className="bg-[#242f3d] border-none rounded-2xl px-4 py-2 text-xs w-64 outline-none placeholder-[#708499] focus:ring-1 focus:ring-[#3390ec]"
            placeholder="Escribe una tarea..."
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                const val = e.currentTarget.value;
                e.currentTarget.value = '';
                await supabase.from('tareas').insert([{
                  titulo: val,
                  estado: 'Pendiente',
                  posicion: Date.now(),
                  encargado: 'K' // Por defecto para Kadriser
                }]);
              }
            }}
          />
        </div>
      </header>

      <div className="p-6 overflow-x-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 min-w-max">
            {columnas.map(colId => (
              <Droppable key={colId} droppableId={colId}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="w-72 flex flex-col gap-3"
                  >
                    <h2 className="text-[#4ea4f5] text-xs font-bold uppercase tracking-wider px-2 mb-1">
                      {colId}
                    </h2>

                    <div className="flex flex-col gap-2 min-h-[70vh] bg-[#17212b]/50 p-2 rounded-xl border border-white/5">
                      {tareas.filter(t => t.estado === colId).map((tarea, index) => (
                        <Draggable key={tarea.id} draggableId={tarea.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-[#242f3d] p-3 rounded-xl shadow-sm hover:bg-[#2b394a] transition-colors border border-transparent active:border-[#3390ec]/30 group"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[13px] leading-tight flex-1">{tarea.titulo}</span>
                                <div className={`w-6 h-6 rounded-full ${getAvatarColor(tarea.encargado)} flex items-center justify-center text-[10px] font-bold`}>
                                  {tarea.encargado}
                                </div>
                              </div>

                              <div className="flex justify-between items-center mt-3">
                                <span className="text-[10px] text-[#708499]">17:21 ✓✓</span>
                                <div className={`h-1.5 w-1.5 rounded-full ${tarea.prioridad === 'Alta' ? 'bg-red-400' : 'bg-[#3390ec]'}`} />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
    </main>
  )
}