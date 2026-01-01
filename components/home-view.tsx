"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { NotesPanel } from "@/components/notes-panel"
import { RecordingPanel } from "@/components/recording-panel"
import { GripVertical } from "lucide-react"

export function HomeView() {
  const [leftWidth, setLeftWidth] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      const container = e.currentTarget as HTMLElement
      const rect = container.getBoundingClientRect()
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(Math.max(newWidth, 25), 75))
    },
    [isDragging],
  )

  return (
    <div
      className="flex h-full select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{ width: `${leftWidth}%` }} className="min-w-0">
        <NotesPanel />
      </div>

      {/* Drag handle */}
      <div
        className="group flex w-1 cursor-col-resize items-center justify-center bg-border hover:bg-primary/30 transition-colors"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div style={{ width: `${100 - leftWidth}%` }} className="min-w-0">
        <RecordingPanel />
      </div>
    </div>
  )
}
