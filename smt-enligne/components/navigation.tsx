"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
// ThemeToggle removed from sidebar - moved to global floating control
import { Home, BarChart3, Building2, Menu, Zap, TrendingUp, Users, FileText, Power } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
// Header controls are rendered globally in the app layout
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-context"
import Swal from "sweetalert2"

const navigation = [
  { name: "Tableau de Bord", href: "/dashboard", icon: BarChart3 },
  { name: "Entreprises", href: "/entreprises", icon: Building2 },
  { name: "Mouvements", href: "/mouvements", icon: Zap },
  { name: "Utilisateurs", href: "/utilisateurs", icon: Users },
  { name: "Rapports", href: "/rapports", icon: FileText },
]

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { role, user, logout, startLogout } = useAuth() as any
  // Avoid hydration mismatch by delaying nav items until after mount
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: "Vous allez être déconnecté de votre session.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui, me déconnecter',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    })

    if (result.isConfirmed) {
      // Signal logging out and redirect to the logout route which will show a loading screen
      try { startLogout?.() } catch {}
      router.replace('/logout')
    }
  }

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {hydrated && navigation
        .filter((item) => {
          if (!role) return false
          if (role === 'ADMIN_FISCAL') return true
          if (role === 'AGENT_FISCAL') return item.href !== '/utilisateurs'
          // ENTREPRISE: allow Dashboard, Entreprises, Mouvements
          return ['/dashboard', '/entreprises', '/mouvements'].includes(item.href)
        })
        .map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => mobile && setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg animate-glow"
                : "hover:bg-secondary hover:text-secondary-foreground",
              mobile && "text-lg",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isActive && "scale-110",
                !isActive && "group-hover:scale-105",
              )}
            />
            <span className="font-medium">{item.name}</span>
          </Link>
        )
        })}
    </>
  )

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex fixed top-0 left-0 h-full w-64 bg-card/80 backdrop-blur-xl border-r border-border z-40 flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-1 rounded-xl animate-float">
              <Image src="/logo.png" alt="Logo" width={50} height={50} className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SMT</h1>
              <p className="text-sm text-muted-foreground">Trésorerie Moderne</p>
            </div>
            {/* header controls moved to global layout */}
          </div>

          <div className="space-y-2">
            <NavItems />
          </div>
        </div>

        <div className="mt-auto p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>v2.0</span>
              </div>
            </div>

            {hydrated && user ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border">
                    <Image src={user.avatar || '/placeholder-user.jpg'} alt={user.username} width={40} height={40} className="object-cover w-full h-full" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{user.fullName || user.username}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.role}</div>
                  </div>
                </div>
                <Button variant="outline" size="icon" aria-label="Déconnexion" onClick={handleLogout}>
                  <Power className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-lg">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">SMT</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-1 rounded-xl">
                      <Image src="/logo.png" alt="Logo" width={48} height={48} className="object-contain" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-foreground">SMT</h1>
                      <p className="text-sm text-muted-foreground">Trésorerie Moderne</p>
                    </div>
                  </div>

                <div className="space-y-2">
                  <NavItems mobile />
                </div>
                {hydrated && user ? (
                  <div className="mt-6 p-4 rounded-lg border">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted border">
                          <Image src={user.avatar || '/placeholder-user.jpg'} alt={user.username} width={32} height={32} className="object-cover w-full h-full" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{user.fullName || user.username}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.role}</div>
                        </div>
                      </div>
                      <Button variant="outline" size="icon" aria-label="Déconnexion" onClick={() => { setIsOpen(false); handleLogout() }}>
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

  {/* Spacer removed: main now uses responsive padding (lg:pl-64 / pt-16) */}
    </>
  )
}
