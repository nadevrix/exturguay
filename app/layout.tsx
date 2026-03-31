import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import { AuthProvider } from "../lib/auth/AuthProvider"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Exturguay — Team Kanban",
  description: "Premium project management for hackathon teams",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ background: '#0e1621', color: '#f5f5f5' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#242f3d',
              color: '#f5f5f5',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            },
            success: { iconTheme: { primary: '#26c6da', secondary: '#242f3d' } },
            error: { iconTheme: { primary: '#ff4b4b', secondary: '#242f3d' } },
          }}
        />
      </body>
    </html>
  )
}
