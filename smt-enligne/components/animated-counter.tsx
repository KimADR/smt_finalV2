"use client"

import { useEffect, useState } from 'react'

type Props = {
  value: number
  duration?: number
  decimals?: number
  locale?: string
}

export default function AnimatedCounter({ value, duration = 950, decimals = 0, locale = 'fr-FR' }: Props) {
  const [v, setV] = useState(0)

  useEffect(() => {
    let mounted = true
    const start = 0
    const end = Number(value || 0)
    const startTime = performance.now()

    function ease(t: number) {
      // easeOutQuad
      return t * (2 - t)
    }

    function tick(now: number) {
      if (!mounted) return
      const t = Math.min(1, (now - startTime) / duration)
      const eased = ease(t)
      const next = start + (end - start) * eased
      setV(Number(next.toFixed(decimals)))
      if (t < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
    return () => {
      mounted = false
    }
  }, [value, duration, decimals])

  const opts: Intl.NumberFormatOptions = decimals > 0 ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : {}
  return <span>{new Intl.NumberFormat(locale, opts).format(v)}</span>
}
