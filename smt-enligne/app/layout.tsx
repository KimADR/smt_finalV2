import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Suspense } from "react"
import AnimatedPage from "@/components/animated-page"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider, RoleGate } from "@/components/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import dynamic from 'next/dynamic'

const HeaderControls = dynamic(() => import('@/components/header-controls'), { ssr: false })

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "SMT - Système Minimal de Trésorerie",
  description: "Système de gestion de trésorerie moderne pour les petites entreprises à Madagascar",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Suspense>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <AuthProvider>
              <RoleGate>
                <AnimatedPage>
                  {/* Global header controls (top-right) - aligned with page action buttons */}
                  <div className="fixed top-16 right-4 md:right-8 lg:right-12 z-[60]">
                    <HeaderControls />
                  </div>
                  {children}
                </AnimatedPage>
              </RoleGate>
            </AuthProvider>
            {/* Header-level theme toggle removed: ThemeToggle is integrated into each page header */}
          </ThemeProvider>
        </Suspense>
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
