// Lightweight wrapper for BroadcastChannel with fallback to window.postMessage for older browsers
type MvtEvent = {
  type: 'movement.created' | 'movement.updated' | 'movement.deleted'
  payload?: any
}

const CHANNEL_NAME = 'smt-mouvements'

export function createChannel() {
  if (typeof BroadcastChannel !== 'undefined') {
    const ch = new BroadcastChannel(CHANNEL_NAME)
    return {
      post: (ev: MvtEvent) => ch.postMessage(ev),
      on: (fn: (ev: MvtEvent) => void) => {
        const h = (m: MessageEvent) => fn(m.data as MvtEvent)
        ch.addEventListener('message', h)
        return () => ch.removeEventListener('message', h)
      },
    }
  }

  // fallback: use window events
  return {
    post: (ev: MvtEvent) => {
      try {
        window.postMessage({ __smt_channel: CHANNEL_NAME, payload: ev }, window.location.origin)
      } catch {}
    },
    on: (fn: (ev: MvtEvent) => void) => {
      const h = (e: MessageEvent) => {
        try {
          const d = e.data
          if (d && d.__smt_channel === CHANNEL_NAME) fn(d.payload as MvtEvent)
        } catch {}
      }
      window.addEventListener('message', h)
      return () => window.removeEventListener('message', h)
    },
  }
}

export type { MvtEvent }

// Small helper channel for alert events so different client parts can react
type AlertEvent = {
  type: 'alert.created' | 'alert.resolved' | 'alert.deleted'
  payload?: any
}

export function createAlertChannel() {
  const name = 'smt-alerts'
  if (typeof BroadcastChannel !== 'undefined') {
    const ch = new BroadcastChannel(name)
    return {
      post: (ev: AlertEvent) => ch.postMessage(ev),
      on: (fn: (ev: AlertEvent) => void) => {
        const h = (m: MessageEvent) => fn(m.data as AlertEvent)
        ch.addEventListener('message', h)
        return () => ch.removeEventListener('message', h)
      },
    }
  }

  return {
    post: (ev: AlertEvent) => {
      try {
        window.postMessage({ __smt_alert_channel: name, payload: ev }, window.location.origin)
      } catch {}
    },
    on: (fn: (ev: AlertEvent) => void) => {
      const h = (e: MessageEvent) => {
        try {
          const d = e.data
          if (d && d.__smt_alert_channel === name) fn(d.payload as AlertEvent)
        } catch {}
      }
      window.addEventListener('message', h)
      return () => window.removeEventListener('message', h)
    },
  }
}

export type { AlertEvent }
