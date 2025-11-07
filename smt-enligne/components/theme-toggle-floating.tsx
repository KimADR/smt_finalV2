"use client"

import React from "react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ThemeToggleFloating() {
  return (
    <div className="fixed right-6 top-4 z-50">
      <div className="p-2 bg-card/80 backdrop-blur rounded-lg border border-border shadow-lg">
        <ThemeToggle />
      </div>
    </div>
  )
}
