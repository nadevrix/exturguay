'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { TEAM_MEMBERS, type TeamMember } from '../teamConfig'

type AuthContextType = {
    member: TeamMember | null
    loading: boolean
    signIn: (password: string, memberId: string) => { error: string | null }
    signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
    member: null, loading: true,
    signIn: () => ({ error: null }),
    signOut: () => { },
})

const STORAGE_KEY = 'exturguay_member'

export function AuthProvider({ children }: { children: ReactNode }) {
    const [member, setMember] = useState<TeamMember | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            const found = TEAM_MEMBERS.find(m => m.id === saved)
            if (found) setMember(found)
        }
        setLoading(false)
    }, [])

    const signIn = (password: string, memberId: string): { error: string | null } => {
        const correct = process.env.NEXT_PUBLIC_APP_PASSWORD
        if (password !== correct) return { error: 'Contraseña incorrecta' }
        const found = TEAM_MEMBERS.find(m => m.id === memberId)
        if (!found) return { error: 'Selecciona un miembro del equipo' }
        setMember(found)
        localStorage.setItem(STORAGE_KEY, found.id)
        return { error: null }
    }

    const signOut = () => {
        setMember(null)
        localStorage.removeItem(STORAGE_KEY)
    }

    return (
        <AuthContext.Provider value={{ member, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
