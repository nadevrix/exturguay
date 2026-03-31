'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/auth/AuthProvider'
import { TEAM_MEMBERS } from '../../lib/teamConfig'

export default function LoginPage() {
    const { signIn } = useAuth()
    const [password, setPassword] = useState('')
    const [memberId, setMemberId] = useState(TEAM_MEMBERS[0]?.id ?? '')
    const [error, setError] = useState<string | null>(null)

    const handle = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        const { error } = signIn(password, memberId)
        if (error) setError(error)
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1621', padding: '16px' }}>
            {/* Blobs decorativos */}
            <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(51,144,236,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(38,198,218,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="animate-scaleIn" style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3390ec, #1a6dbf)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '36px', fontWeight: 800, margin: '0 auto 16px',
                        boxShadow: '0 10px 40px rgba(51,144,236,0.4)',
                    }}>
                        E
                    </div>
                    <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>Exturguay</h1>
                    <p style={{ margin: '6px 0 0', color: '#708499', fontSize: '14px' }}>Panel del equipo de hackatones</p>
                </div>

                {/* Card */}
                <form onSubmit={handle} style={{
                    background: '#17212b', borderRadius: '20px', padding: '28px 32px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', gap: '20px',
                }}>
                    {/* ¿Quién eres? */}
                    <div>
                        <label style={{ fontSize: '11px', color: '#708499', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>
                            ¿QUIÉN ERES?
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {TEAM_MEMBERS.map(m => (
                                <button key={m.id} type="button" onClick={() => setMemberId(m.id)} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '10px 14px', borderRadius: '12px', cursor: 'pointer',
                                    border: memberId === m.id ? `1px solid ${m.avatar_color}50` : '1px solid rgba(255,255,255,0.07)',
                                    background: memberId === m.id ? `${m.avatar_color}18` : '#242f3d',
                                    transition: 'all 0.15s', textAlign: 'left',
                                }}>
                                    <div style={{
                                        width: '38px', height: '38px', borderRadius: '50%', background: m.avatar_color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0,
                                        boxShadow: memberId === m.id ? `0 0 0 2px ${m.avatar_color}50` : 'none',
                                    }}>
                                        {m.avatar_initials}
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: memberId === m.id ? '#f5f5f5' : '#a8b8cc' }}>
                                            {m.display_name}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#708499' }}>@{m.username}</p>
                                    </div>
                                    {memberId === m.id && (
                                        <span style={{ marginLeft: 'auto', color: m.avatar_color, fontSize: '16px' }}>✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contraseña */}
                    <div>
                        <label style={{ fontSize: '11px', color: '#708499', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
                            CONTRASEÑA DEL EQUIPO
                        </label>
                        <input
                            type="password" value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="••••••" autoFocus required
                            style={{
                                width: '100%', background: '#242f3d', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px', padding: '12px 16px', color: '#f5f5f5', fontSize: '15px',
                                letterSpacing: '0.1em',
                            }}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            background: 'rgba(255,75,75,0.1)', border: '1px solid rgba(255,75,75,0.25)',
                            borderRadius: '10px', padding: '10px 14px', color: '#ff7070', fontSize: '13px',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ padding: '13px', fontSize: '14px' }}>
                        → Entrar al tablero
                    </button>
                </form>

                <p style={{ textAlign: 'center', color: '#516070', fontSize: '11px', marginTop: '20px' }}>
                    Exturguay © 2026 — Solo para el equipo 🔒
                </p>
            </div>
        </div>
    )
}
