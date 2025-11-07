'use client'

// Inspired by react-hot-toast library
import * as React from 'react'

import type { ToastActionElement, ToastProps } from '@/components/ui/toast'
import { normalizeErrorString } from '@/lib/utils'

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType['ADD_TOAST']
      toast: ToasterToast
    }
  | {
      type: ActionType['UPDATE_TOAST']
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType['DISMISS_TOAST']
      toastId?: ToasterToast['id']
    }
  | {
      type: ActionType['REMOVE_TOAST']
      toastId?: ToasterToast['id']
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: 'REMOVE_TOAST',
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      }

    case 'DISMISS_TOAST': {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      }
    }
    case 'REMOVE_TOAST':
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, 'id'>

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

// Helper to show the formal auth-required message (used when users try to access protected routes)
export function showAuthRequiredToast() {
  const title = 'Accès refusé — authentification requise'
  const description = "Votre requête a été refusée car vous n'êtes pas connecté(e). Veuillez vous connecter pour accéder à cette ressource."
  // Use the central toast function to emit a destructive/error toast
  toast({ title, description, variant: 'destructive', className: 'destructive' })
}

// Helper to show formal success messages for common operations (ADD/UPDATE/DELETE/etc.)
export function showOperationSuccessToast(action: 'add' | 'update' | 'delete' | 'resolve' | 'create' = 'update', entity?: string) {
  const ent = entity ? String(entity) : 'l\'élément'
  const entLower = ent.toLowerCase()
  let title = 'Opération réussie'
  let description = ''
  // Special-case: export PDF should display the project's requested strings
  if (entLower.includes('export')) {
    title = 'Export -PDF'
    description = 'Exportaion PDF reussi avec succes'
    toast({ title, description, variant: 'success', className: 'success' })
    return
  }
  switch (action) {
    case 'add':
    case 'create':
      title = 'Ajout réussi'
      description = `${ent} a été ajouté(e) avec succès.`
      break
    case 'update':
      title = 'Mise à jour réussie'
      description = `${ent} a été mis(e) à jour avec succès.`
      break
    case 'delete':
      title = 'Suppression réussie'
      description = `${ent} a été supprimé(e) avec succès.`
      break
    case 'resolve':
      title = 'Opération terminée'
      description = `${ent} a été traitée avec succès.`
      break
    default:
      title = 'Opération réussie'
      description = `${ent} a été traitée avec succès.`
  }

  toast({ title, description, variant: 'success', className: 'success' })
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}

export { useToast, toast }

// Central helper to show a standardized error toast from any thrown value.
// Returns parsed info (message/statusCode/parsed) so callers can also set local UI state.
export function showErrorToast(raw: unknown) {
  try {
    // Handle Response-like objects and numeric statuses first
    try {
      // If a Response object was passed, check its status
      const asAny = raw as any
      if (asAny && typeof asAny === 'object') {
        if (typeof asAny.status === 'number') {
          if (asAny.status === 401) {
            showAuthRequiredToast()
            return { message: 'Accès refusé', statusCode: 401, parsed: null }
          }
          // for other numeric status codes use a generic message
          toast({ title: 'Erreur', description: String(asAny.status), variant: 'destructive' })
          return { message: String(asAny.status), statusCode: asAny.status, parsed: null }
        }
      }

      // If caller rejected with a plain numeric code (e.g., Promise.reject(r.status))
      if (typeof raw === 'number') {
        if (raw === 401) {
          showAuthRequiredToast()
          return { message: 'Accès refusé', statusCode: 401, parsed: null }
        }
        toast({ title: 'Erreur', description: String(raw), variant: 'destructive' })
        return { message: String(raw), statusCode: raw, parsed: null }
      }

      // If caller passed a numeric string like '401'
      if (typeof raw === 'string' && /^\d{3}$/.test(raw.trim())) {
        const num = Number(raw.trim())
        if (num === 401) {
          showAuthRequiredToast()
          return { message: 'Accès refusé', statusCode: 401, parsed: null }
        }
        toast({ title: 'Erreur', description: raw, variant: 'destructive' })
        return { message: raw, statusCode: num, parsed: null }
      }
    } catch (inner) {
      // fallthrough to normalize below
    }

    const info = normalizeErrorString(raw)
    if (info.statusCode === 401) {
      // show formal auth required toast
      showAuthRequiredToast()
      return info
    }
    const msg = info.message || 'Une erreur est survenue'
    toast({ title: 'Erreur', description: String(msg), variant: 'destructive' })
    return info
  } catch (e) {
    try { toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' }) } catch {}
    return { message: String(raw ?? ''), statusCode: null, parsed: null }
  }
}
