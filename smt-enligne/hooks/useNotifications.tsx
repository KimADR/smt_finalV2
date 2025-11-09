"use client"
import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { authFetch } from '@/lib/utils'
import { useAuth } from '@/components/auth-context'
import { createAlertChannel } from '@/lib/events'

type NotificationItem = {
  id: number
  userId?: number
  alertId?: number
  payload: any
  read: boolean
  deleted: boolean
  deletedAt?: string
  createdAt: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const socketRef = useRef<Socket | null>(null)
  // keep short-lived sets of recently deleted ids/alertIds to avoid re-inserting
  // the same notification immediately when reconciling or receiving realtime events
  const recentlyDeletedIdsRef = useRef<Set<number>>(new Set())
  const recentlyDeletedAlertIdsRef = useRef<Set<number>>(new Set())

  const { token, ready, user } = useAuth() as any

  // Utility: dedupe notifications by alertId (preferred) then by id.
  // Keep the most recent item for each key (assumes array is sorted by recency)
  function dedupeNotifications(arr: NotificationItem[]) {
    const seenAlert = new Map<string | number, NotificationItem>()
    const seenId = new Map<string | number, NotificationItem>()
    for (const it of arr) {
      if (it.alertId) {
        const key = String(it.alertId)
        if (!seenAlert.has(key)) seenAlert.set(key, it)
      } else {
        const key = String(it.id)
        if (!seenId.has(key)) seenId.set(key, it)
      }
    }
    return [...seenAlert.values(), ...seenId.values()]
  }

  useEffect(() => {
    // wait until auth is ready and we have a token
    if (!ready || !token) return

    // Use authFetch with a relative path so the helper prefixes the correct base URL
    setLoading(true)
    // helper: map server payload to client NotificationItem (include deleted fields)
    const mapServer = (data: any[] | undefined) => {
      const mapped = (data || []).map((n) => {
        const alert = n.alert || (n.payload && n.payload.alert) || null
        const dueDate = alert?.dueDate ?? n.payload?.dueDate ?? n.createdAt
        const movementDescription = alert?.movementDescription ?? n.payload?.movementDescription ?? null
        const movementEntrepriseName = alert?.movementEntrepriseName ?? n.payload?.movementEntrepriseName ?? null
        const movementEntrepriseNif = alert?.movementEntrepriseNif ?? n.payload?.movementEntrepriseNif ?? null

        return {
          id: n.id,
          userId: n.userId,
          alertId: alert?.id ?? n.alertId,
          payload: {
            ...(n.payload || {}),
            alert,
            dueDate,
            movementDescription,
            movementEntrepriseName,
            movementEntrepriseNif,
          },
          read: !!n.read,
          deleted: !!n.deleted,
          deletedAt: n.deletedAt,
          createdAt: n.createdAt,
        }
      })
      return mapped
    }
      

    authFetch('/api/notifications' as any)
      .then(r => {
        if (!r.ok) {
          // Log non-OK responses for debugging
          console.error('[useNotifications] fetch /api/notifications non-ok status', r.status, r.statusText)
          throw new Error(String(r.status))
        }
        return r.json()
      })
      .then((data: any[]) => {
        // Debug: show raw server payload
        // eslint-disable-next-line no-console
        console.debug('[useNotifications] fetched /api/notifications ->', data)
        const mapped = mapServer(data).filter((m) => !m.deleted)
        // dedupe initial payload
        // Defensive client-side scoping: if the authenticated user is an ENTREPRISE,
        // only keep notifications that reference the same entreprise (by id or siret).
        // Prefer authoritative user data from useAuth() when available.
        setNotifications((prev) => {
          const u = user ?? (typeof window !== 'undefined' ? (window as any).__smt_auth_user : null)
          if (u && String(u.role).toUpperCase() === 'ENTREPRISE') {
            const entId = u.entrepriseId ?? u.entreprise?.id ?? null
            const entSiret = u.entreprise?.siret ?? u.entrepriseSiret ?? null
            if (entId || entSiret) {
              const filtered = mapped.filter((m) => {
                const alertEnt = m.payload?.alert?.entreprise ?? null
                if (!alertEnt) return false
                if (entId && alertEnt.id) return Number(alertEnt.id) === Number(entId)
                if (entSiret && alertEnt.siret) return String(alertEnt.siret) === String(entSiret)
                return false
              })
              return dedupeNotifications(filtered)
            }
            // If user is ENTREPRISE but we can't determine entreprise identifier,
            // fall back to only per-user notifications when possible
            return dedupeNotifications(mapped.filter(m => Number(m.payload?.userId) === Number(u.id) || Number(m.id) < 0))
          }
          return dedupeNotifications(mapped)
        })
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[useNotifications] error fetching /api/notifications', err)
      })
      .finally(() => setLoading(false))

        // establish socket connection using token from auth context
    try {
      const authToken = token
      if (!authToken) return
      // helper to attempt socket connection with given options
      let triedPolling = false
      const connectWithOptions = (opts: any) => {
        const socket = io((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333') + '/notifications', {
          auth: { token: `Bearer ${authToken}` },
          autoConnect: true,
          ...opts,
        })
        socketRef.current = socket

        socket.on('connect', () => {
          // connected
          // eslint-disable-next-line no-console
          console.debug('[useNotifications] socket connected', socket.id)
        })

        socket.on('connect_error', (err: any) => {
          // eslint-disable-next-line no-console
          console.error('[useNotifications] Notification socket connect_error', err)
          // fallback to polling once if not yet tried
          if (!triedPolling) {
            triedPolling = true
            try {
              socket.disconnect()
            } catch {}
            // try again with polling transport which often works behind proxies
            connectWithOptions({ transports: ['polling'] })
          }
        })

        socket.on('disconnect', () => {
          // console.log('notif socket disconnected')
        })
      }

  // determine socket base: prefer NEXT_PUBLIC_API_BASE then NEXT_PUBLIC_API_URL then fallback
    const baseUrl = (process?.env?.NEXT_PUBLIC_API_URL as string) || 'http://localhost:3333'
  // initial attempt: allow default transports (prefer websocket)
  connectWithOptions({ path: new URL('/notifications', baseUrl).pathname ? undefined : undefined })

      socketRef.current?.on('alert.created', (payload: any) => {
        // debug incoming realtime payload
        // eslint-disable-next-line no-console
        console.debug('[useNotifications] socket event alert.created', payload)
        // create a small notification wrapper
        const n: any = {
          id: Date.now() * -1, // temporary client id
          alertId: payload?.alert?.id,
          payload: { alert: payload?.alert, ...payload },
          read: false,
          createdAt: new Date().toISOString(),
        }
        // avoid adding duplicate temp and dedupe list
        // Prevent adding if this alert or id was just deleted locally
        if (n.alertId && recentlyDeletedAlertIdsRef.current.has(Number(n.alertId))) {
          console.debug('[useNotifications] skipping realtime add for recently deleted alert', n.alertId)
        } else if (recentlyDeletedIdsRef.current.has(Number(n.id))) {
          console.debug('[useNotifications] skipping realtime add for recently deleted id', n.id)
        } else {
          setNotifications((prev) => dedupeNotifications([n, ...prev]).slice(0, 50))
        }
        // attempt to refetch official list shortly after and MERGE with temp items
        setTimeout(() => {
          // fetch official server list to get persisted notifications
          authFetch('/api/notifications' as any)
            .then((r) => {
              if (!r.ok) throw new Error(String(r.status));
              return r.json();
            })
            .then((data: any[]) => {
              const serverMapped = (data || []).map((n) => {
                const alert = n.alert || (n.payload && n.payload.alert) || null;
                return {
                  id: n.id,
                  userId: n.userId,
                  alertId: alert?.id ?? n.alertId,
                  payload: { ...(n.payload || {}), alert },
                  read: !!n.read,
                  deleted: !!n.deleted,
                  deletedAt: n.deletedAt,
                  createdAt: n.createdAt,
                } as NotificationItem;
              }).filter(s => !s.deleted);

              // apply the same entreprise-scoping to serverMapped before merging
              const u = user ?? (typeof window !== 'undefined' ? (window as any).__smt_auth_user : null)
              let scopedServer = serverMapped
              if (u && String(u.role).toUpperCase() === 'ENTREPRISE') {
                const entId = u.entrepriseId ?? u.entreprise?.id ?? null
                const entSiret = u.entreprise?.siret ?? u.entrepriseSiret ?? null
                if (entId || entSiret) {
                  scopedServer = serverMapped.filter((m) => {
                    const alertEnt = m.payload?.alert?.entreprise ?? null
                    if (!alertEnt) return false
                    if (entId && alertEnt.id) return Number(alertEnt.id) === Number(entId)
                    if (entSiret && alertEnt.siret) return String(alertEnt.siret) === String(entSiret)
                    return false
                  })
                } else {
                  // fallback: only keep notifications that are explicitly for this user
                  scopedServer = serverMapped.filter((m) => Number(m.payload?.userId) === Number(u.id))
                }
              }

              setNotifications((prev) => {
                // keep client-temporary notifications (negative ids) that are not yet matched by server
                const temps = prev.filter((p) => Number(p.id) < 0);
                // remove temps that the server already persisted (match by alertId)
                const keptTemps = temps.filter((t) => !serverMapped.some((s) => s.alertId && t.alertId && s.alertId === t.alertId));

                // preserve read state for server items if previously changed client-side
                const prevById = new Map<number, NotificationItem>();
                for (const p of prev) {
                  if (Number(p.id) > 0) prevById.set(Number(p.id), p);
                }

                // Filter out server items that were recently deleted locally to avoid reintroducing them
                const mergedServer = scopedServer
                  .filter((s) => {
                    if (s.id && recentlyDeletedIdsRef.current.has(Number(s.id))) {
                      console.debug('[useNotifications] filtering out server item with recently deleted id', s.id)
                      return false
                    }
                    if (s.alertId && recentlyDeletedAlertIdsRef.current.has(Number(s.alertId))) {
                      console.debug('[useNotifications] filtering out server item with recently deleted alertId', s.alertId)
                      return false
                    }
                    return true
                  })
                  .map((s) => ({ ...s, read: prevById.get(Number(s.id))?.read ?? s.read }));

                // combine server items first (most recent), then remaining temps and dedupe by alertId/id
                const combined = [...mergedServer, ...keptTemps];
                return dedupeNotifications(combined);
              });
            })
            .catch(() => {})
        }, 500);
      })

      // also listen for server-side events that affect alerts
      const alertCh = createAlertChannel()
      socketRef.current?.on('alert.resolved', (payload: any) => {
        // payload: { alertId }
        try { alertCh.post({ type: 'alert.resolved', payload }) } catch {}
      })
      socketRef.current?.on('alert.deleted', (payload: any) => {
        try { alertCh.post({ type: 'alert.deleted', payload }) } catch {}
      })

      // expose connect errors to console for easier debugging
      // (connected handlers and fallback logic already handle errors)
      return () => {
        try {
          socketRef.current?.disconnect()
        } catch {}
      }
    } catch (e) {
      // ignore
    }
  }, [ready, token])

  async function markRead(id: number): Promise<boolean> {
    try {
      const r = await authFetch(`/api/notifications/${id}/read` as any, { method: 'PATCH' } as any)
      if (!r.ok) {
        // eslint-disable-next-line no-console
        console.error('[useNotifications] markRead failed', id, r.status)
        return false
      }
      setNotifications((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)))
      return true
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[useNotifications] markRead error', err)
      return false
    }
  }

  async function deleteNotification(id: number): Promise<boolean> {
    try {
      let targetId = Number(id)

      // If this is a temporary client-only notification (negative id), try to
      // resolve the real server id by matching alertId (or other payload data).
      if (Number(id) < 0) {
        const local = notifications.find((p) => Number(p.id) === Number(id))
        const alertId = local?.alertId ?? local?.payload?.alert?.id ?? null
        if (alertId) {
          try {
            const listRes = await authFetch('/api/notifications' as any)
            if (listRes.ok) {
              const listData = await listRes.json()
              const match = (listData || []).find((n: any) => {
                const srvAlert = n.alert || (n.payload && n.payload.alert) || null
                const srvAlertId = srvAlert?.id ?? n.alertId ?? null
                return srvAlertId && Number(srvAlertId) === Number(alertId)
              })
              if (match) {
                targetId = Number(match.id)
              } else {
                // no server match found: it was only a client temp. Remove locally.
                setNotifications((prev) => prev.filter((p) => p.id !== id))
                return true
              }
            } else {
              // couldn't fetch server list; pessimistically remove the temp locally
              setNotifications((prev) => prev.filter((p) => p.id !== id))
              return true
            }
          } catch (e) {
            // network or parse error: remove temp locally
            setNotifications((prev) => prev.filter((p) => p.id !== id))
            return true
          }
        } else {
          // no local alertId to match; remove temp locally
          setNotifications((prev) => prev.filter((p) => p.id !== id))
          return true
        }
      }

      const r = await authFetch(`/api/notifications/${targetId}` as any, { method: 'DELETE' } as any)
      if (!r.ok) {
        // eslint-disable-next-line no-console
        console.error('[useNotifications] deleteNotification failed', targetId, r.status)
        // If server returns 404 for the target id, remove locally and consider success
        if (r.status === 404) {
          setNotifications((prev) => prev.filter((p) => p.id !== id && p.id !== targetId))
          return true
        }
        return false
      }

      // After successful delete, immediately remove locally for snappy UX.
      // Also add to recentlyDeleted sets to avoid re-insertion by realtime/reconcile.
      let deletedAlertId: number | null = null
      // determine the server id (targetId) and ensure we track both client temp id and server id
      const resolvedServerId = Number(targetId)
      setNotifications((prev) => {
        // find by either original id (could be temp negative) or resolved server id
        const found = prev.find((p) => Number(p.id) === Number(id) || Number(p.id) === resolvedServerId)
        if (found && found.alertId) deletedAlertId = Number(found.alertId)
        return prev.filter((p) => Number(p.id) !== Number(id) && Number(p.id) !== resolvedServerId)
      })

      if (deletedAlertId) {
        recentlyDeletedAlertIdsRef.current.add(deletedAlertId)
        setTimeout(() => recentlyDeletedAlertIdsRef.current.delete(deletedAlertId as number), 60 * 1000)
      }
      // track both ids to prevent re-insertion from server/system events
      try {
        recentlyDeletedIdsRef.current.add(Number(id))
      } catch {}
      if (resolvedServerId && resolvedServerId > 0 && resolvedServerId !== Number(id)) {
        recentlyDeletedIdsRef.current.add(resolvedServerId)
        setTimeout(() => recentlyDeletedIdsRef.current.delete(resolvedServerId), 60 * 1000)
      }
      setTimeout(() => recentlyDeletedIdsRef.current.delete(Number(id)), 60 * 1000)

      // schedule a background reconcile: re-fetch server list shortly after
      // to ensure eventual consistency (won't block caller).
      setTimeout(async () => {
        try {
          const res = await authFetch('/api/notifications' as any)
          if (!res.ok) {
            // keep local state as-is if server not reachable
            console.debug('[useNotifications] reconcile /api/notifications failed', res.status)
            return
          }
          const data = await res.json()
          const serverMapped = (data || []).map((n: any) => {
            const alert = n.alert || (n.payload && n.payload.alert) || null
            return {
              id: n.id,
              alertId: alert?.id ?? n.alertId,
              payload: { ...(n.payload || {}), alert },
              read: !!n.read,
              deleted: !!n.deleted,
              deletedAt: n.deletedAt,
              createdAt: n.createdAt,
            }
          }).filter((s: any) => !s.deleted)

          setNotifications((prev) => {
            // preserve temp negative ids
            const temps = prev.filter((p) => Number(p.id) < 0)
            // Filter out any server items that were recently deleted locally
            const filteredServer = serverMapped.filter((s: NotificationItem) => {
              if (!s) return false
              if (s.id && recentlyDeletedIdsRef.current.has(Number(s.id))) {
                // avoid re-inserting by server id
                return false
              }
              if (s.alertId && recentlyDeletedAlertIdsRef.current.has(Number(s.alertId))) {
                // avoid re-inserting by alert id
                return false
              }
              return true
            })

            // combine filtered server items with temps and dedupe
            const combined = [...filteredServer, ...temps]
            return dedupeNotifications(combined)
          })
        } catch (e) {
          console.debug('[useNotifications] reconcile error', e)
        }
      }, 600)

      return true
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[useNotifications] deleteNotification error', err)
      return false
    }
  }

  // Mark a notification as locally deleted to prevent
  // optimistic removal from being overwritten by server sync
  function noteLocalDeletion(id: number, alertId?: number) {
    try {
      // Add to recentlyDeletedIds with longer timeout
      if (id != null) {
        recentlyDeletedIdsRef.current.add(Number(id))
        // Keep deleted IDs longer to ensure sync doesn't bring them back
        setTimeout(() => recentlyDeletedIdsRef.current.delete(Number(id)), 5 * 60 * 1000)
      }
      // Also track associated alert IDs
      if (alertId != null) {
        recentlyDeletedAlertIdsRef.current.add(Number(alertId))
        setTimeout(() => recentlyDeletedAlertIdsRef.current.delete(Number(alertId)), 5 * 60 * 1000)
      }
      // Force an immediate sync to propagate deletion and map server items
      authFetch('/api/notifications' as any)
        .then((r) => {
          if (!r.ok) return null
          return r.json()
        })
        .then((data: any[] | null) => {
          if (!data) return
          const mapped = (data || []).map((n) => {
            const alert = n.alert || (n.payload && n.payload.alert) || null
            return {
              id: n.id,
              userId: n.userId,
              alertId: alert?.id ?? n.alertId,
              payload: { ...(n.payload || {}), alert },
              read: !!n.read,
              deleted: !!n.deleted,
              deletedAt: n.deletedAt,
              createdAt: n.createdAt,
            }
          }).filter((s) => !s.deleted)

          // apply entreprise scoping like initial fetch
          const u = user ?? (typeof window !== 'undefined' ? (window as any).__smt_auth_user : null)
          let scoped = mapped
          if (u && String(u.role).toUpperCase() === 'ENTREPRISE') {
            const entId = u.entrepriseId ?? u.entreprise?.id ?? null
            const entSiret = u.entreprise?.siret ?? u.entrepriseSiret ?? null
            if (entId || entSiret) {
              scoped = mapped.filter((m) => {
                const alertEnt = m.payload?.alert?.entreprise ?? null
                if (!alertEnt) return false
                if (entId && alertEnt.id) return Number(alertEnt.id) === Number(entId)
                if (entSiret && alertEnt.siret) return String(alertEnt.siret) === String(entSiret)
                return false
              })
            } else {
              scoped = mapped.filter((m) => Number(m.payload?.userId) === Number(u.id))
            }
          }

          // Filter out recently deleted items before setting notifications
          const filtered = scoped.filter((n) => {
            if (recentlyDeletedIdsRef.current.has(Number(n.id))) return false
            if (n.alertId && recentlyDeletedAlertIdsRef.current.has(Number(n.alertId))) return false
            return true
          })

          setNotifications(filtered)
        })
        .catch(() => {})
    } catch {}
  }

  return { notifications, loading, socket: socketRef.current, markRead, deleteNotification, setNotifications, noteLocalDeletion }
}
