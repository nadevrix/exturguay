'use client'

import type { Profile } from '../lib/types'

type Props = {
    profile: Profile | null
    size?: number
    showTooltip?: boolean
    onClick?: () => void
    selected?: boolean
}

export default function MemberAvatar({ profile, size = 32, showTooltip = false, onClick, selected = false }: Props) {
    const initials = profile?.avatar_initials ?? '?'
    const color = profile?.avatar_color ?? '#708499'
    const name = profile?.display_name ?? 'Sin asignar'

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} className="group">
            <div
                onClick={onClick}
                title={showTooltip ? name : undefined}
                style={{
                    width: size, height: size, borderRadius: '50%',
                    background: profile ? color : '#2b3a4d',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: `${size * 0.38}px`, fontWeight: 700, color: '#fff',
                    cursor: onClick ? 'pointer' : 'default',
                    flexShrink: 0,
                    boxShadow: selected ? `0 0 0 2px #3390ec, 0 0 0 4px rgba(51,144,236,0.25)` : undefined,
                    transition: 'box-shadow 0.15s',
                    userSelect: 'none',
                }}
            >
                {profile ? initials : '?'}
            </div>
            {showTooltip && (
                <div style={{
                    position: 'absolute', bottom: `${size + 6}px`, left: '50%', transform: 'translateX(-50%)',
                    background: '#17212b', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '4px 8px', fontSize: '11px', color: '#f5f5f5',
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                    opacity: 0, transition: 'opacity 0.15s',
                }} className="group-hover:opacity-100">
                    {name}
                </div>
            )}
        </div>
    )
}
