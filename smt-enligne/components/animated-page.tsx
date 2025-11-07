'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

type AnimatedPageProps = {
  children: React.ReactNode
}

export default function AnimatedPage({ children }: AnimatedPageProps) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  )
}


