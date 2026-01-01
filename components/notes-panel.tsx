"use client"

import type React from "react"
import { useState } from "react"
import { Sparkles, Bold, Italic, List, Heading1, Underline, Strikethrough } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NotesPanel() {
  const [notes, setNotes] = useState("")
  const [hasContent, setHasContent] = useState(false)

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value)
    setHasContent(e.target.value.length > 0)
  }

  return (
    <div className="flex h-full flex-col p-2 gap-2">
      {/* Compact toolbar */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 rounded-md bg-secondary/50 p-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Bold className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Italic className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Underline className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Strikethrough className="h-3 w-3" />
          </Button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Heading1 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <List className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex-1" />

        <Button
          variant="default"
          size="sm"
          className="gap-1.5 h-7 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Sparkles className="h-3 w-3" />
          Generate
        </Button>
      </div>

      {/* Editor area */}
      <div className="relative flex-1 rounded-lg bg-card min-h-0">
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Start typing your notes..."
          className="h-full w-full resize-none rounded-lg bg-transparent p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        />

        {!hasContent && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Notes will appear here as you type</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">or let AI generate them</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
