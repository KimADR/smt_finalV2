"use client"

import { useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Bell, ArrowUpRight, ArrowDownRight, Percent, Check, Trash2, X } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import Swal from 'sweetalert2'

export default function NotificationBell() {
  const { notifications, loading, markRead, deleteNotification, setNotifications, noteLocalDeletion } = useNotifications()
  const { token, user } = useAuth() as any
  const [open, setOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read).length
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([])

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = itemsRef.current[index + 1] || itemsRef.current[0]
      next?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = itemsRef.current[index - 1] || itemsRef.current[itemsRef.current.length - 1]
      prev?.focus()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const n = notifications[index]
      if (n && !n.read) {
        markRead(n.id)
      }
    }
  }

  async function handleDelete(id: number) {
    const prevSnapshot = notifications
    // optimistic: immediately remove locally to provide fast feedback
    const found = notifications.find(p => p.id === id)
    if (found) {
      // Mark as deleted before any API calls to prevent race conditions
      noteLocalDeletion(id, found.alertId)
      // Optimistically update UI
      setNotifications((prev) => prev.filter((p) => p.id !== id))
      
      const ok = await deleteNotification(id)
      if (ok) {
        toast({ title: 'Notification supprimée', description: 'La notification a été supprimée.' })
      } else {
        // En cas d'échec, restaurer la notification
        setNotifications(prevSnapshot)
        toast({ 
          title: 'Erreur', 
          description: 'La suppression de la notification a échoué.', 
          variant: 'destructive' 
        })
      }
    } else {
      // revert
      setNotifications(prevSnapshot)
      toast({ title: 'Erreur', description: "Impossible de supprimer la notification.", variant: 'destructive' })
    }
  }

  function renderNotification(n: any, i: number) {
    const movType = n.payload?.alert?.mouvement?.type ?? null
    const isReceipt = movType === 'CREDIT'
    const isTax = movType === 'TAXPAIMENT'
    const isUnread = !n.read

    return (
      <div
        key={n.id}
        className={`group relative py-4 px-4 border-b last:border-b-0 transition-all duration-200 ${
          isUnread
            ? 'bg-accent/5 border-l-2 border-l-accent hover:bg-accent/10'
            : 'hover:bg-muted/50'
        }`}
        role="listitem"
      >
        <button
          ref={(el) => (itemsRef.current[i] = el)}
          onKeyDown={(e) => handleKeyDown(e, i)}
            onClick={async () => {
              if (!token) {
                toast({ title: 'Authentification requise', description: "Vous devez être connecté pour marquer cette notification comme lue.", variant: 'destructive' })
                return
              }
              if (isUnread) {
                // optimistic UI for instant feedback
                setNotifications((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)))
                const ok = await markRead(n.id)
                if (ok) {
                  toast({
                    title: "Notification lue",
                    description: "La notification a été marquée comme lue.",
                  })
                } else {
                  // revert optimistic change
                  setNotifications((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: false } : p)))
                  toast({ title: 'Erreur', description: "Impossible de marquer la notification comme lue.", variant: 'destructive' })
                }
              }
            }}
          className="text-left w-full flex items-start gap-4"
        >
          <div className="flex-shrink-0 mt-0.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                isReceipt
                  ? 'bg-success/10 text-success group-hover:bg-success/20 group-hover:shadow-lg group-hover:shadow-success/20'
                  : isTax
                  ? 'bg-warning/10 text-warning group-hover:bg-warning/20 group-hover:shadow-lg group-hover:shadow-warning/20'
                  : 'bg-destructive/10 text-destructive group-hover:bg-destructive/20 group-hover:shadow-lg group-hover:shadow-destructive/20'
              }`}
            >
              {isReceipt ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : isTax ? (
                <Percent className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {n.payload?.alert?.type || 'Nouvelle alerte'}
                </span>
                {isUnread && (
                  <Badge variant="default" className="bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full">
                    Nouveau
                  </Badge>
                )}
              </div>
            </div>

            {n.payload?.movementDescription && (
              <p className="text-sm text-foreground/80 mb-2 line-clamp-2">
                {n.payload.movementDescription}
              </p>
            )}

            {(n.payload?.movementEntrepriseName || n.payload?.movementEntrepriseNif) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                {n.payload.movementEntrepriseName && (
                  <span className="font-medium">{n.payload.movementEntrepriseName}</span>
                )}
                {n.payload.movementEntrepriseNif && (
                  <span className="opacity-75">{n.payload.movementEntrepriseNif}</span>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground/70 mt-2">
              {n.payload?.dueDate
                ? new Date(n.payload.dueDate).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : new Date(n.createdAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
            </div>
          </div>
        </button>

          <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!n.read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent/20"
              onClick={async (e) => {
                e.stopPropagation()
                if (!token) {
                  toast({ title: 'Authentification requise', description: "Vous devez être connecté pour marquer cette notification comme lue.", variant: 'destructive' })
                  return
                }
                // optimistic
                setNotifications((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)))
                const ok = await markRead(n.id)
                if (ok) {
                  toast({ title: "Notification lue", description: "La notification a été marquée comme lue." })
                } else {
                  setNotifications((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: false } : p)))
                  toast({ title: 'Erreur', description: "Impossible de marquer la notification comme lue.", variant: 'destructive' })
                }
              }}
              aria-label="Marquer comme lu"
              disabled={!token}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
            onClick={async (e) => {
              e.stopPropagation()
              if (!token) {
                toast({ title: 'Authentification requise', description: "Vous devez être connecté pour supprimer cette notification.", variant: 'destructive' })
                return
              }
              const res = await Swal.fire({
                title: 'Supprimer la notification?',
                text: 'Cette action est irréversible. La notification sera définitivement supprimée.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Supprimer',
                cancelButtonText: 'Annuler',
                focusCancel: true,
                customClass: { popup: 'swal2-popup' },
              })
              if (!res.isConfirmed) { Swal.close(); return }
              await handleDelete(n.id)
            }}
            aria-label="Supprimer"
            // allow admins/agents to delete any notification
            disabled={!token || !( (user && ['ADMIN_FISCAL','AGENT_FISCAL'].includes(String(user.role).toUpperCase())) || Number(user?.id) === Number(n.userId) )}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative h-11 w-11 rounded-xl hover:bg-accent/10 transition-all duration-300 animate-glow"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 shadow-lg border-2 border-background animate-badge-pulse">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="end"
            sideOffset={8}
            className="w-[480px] max-w-[95vw] notification-glass rounded-2xl border border-border shadow-2xl animate-pop-in overflow-hidden z-50"
          >
            <div className="bg-card/95 backdrop-blur-md">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <h3 className="text-base font-semibold text-foreground">Notifications</h3>
                <div className="flex items-center gap-2">
                   {unread > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const unreadItems = notifications.filter((n) => !n.read)
                          if (unreadItems.length === 0) return
                          // optimistic: set all as read locally
                          setNotifications((prev) => prev.map((p) => ({ ...p, read: true })))
                          // call server for each and collect results
                          const results = await Promise.all(unreadItems.map((n) => markRead(n.id)))
                          // if any failed, revert those
                          const failed = unreadItems.filter((_, idx) => !results[idx])
                          if (failed.length > 0) {
                            setNotifications((prev) => prev.map((p) => (failed.some((f) => f.id === p.id) ? { ...p, read: false } : p)))
                            toast({ title: 'Erreur', description: `${failed.length} notification(s) n'ont pas pu être marquées comme lues.`, variant: 'destructive' })
                          } else {
                            toast({
                              title: "Toutes les notifications lues",
                              description: `${unread} notification${unread > 1 ? 's ont été marquées' : ' a été marquée'} comme lue${unread > 1 ? 's' : ''}.`,
                            })
                          }
                        }}
                        className="text-xs h-8 px-3 hover:bg-accent/20 text-accent"
                      >
                        Tout marquer lu
                      </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                    className="h-8 w-8 hover:bg-accent/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto" role="list">
                {loading && (
                  <div className="p-8 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
                    <p className="mt-4 text-sm text-muted-foreground">Chargement...</p>
                  </div>
                )}

                {!loading && notifications.length === 0 && (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                      <Bell className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Aucune notification</p>
                  </div>
                )}

                {!loading && notifications.map(renderNotification)}
              </div>
            </div>

            <Popover.Arrow className="fill-border" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* SweetAlert2 is used for delete confirmation; no inline AlertDialog needed */}
    </>
  )
}
