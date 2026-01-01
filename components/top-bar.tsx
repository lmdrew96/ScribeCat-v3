"use client"

import { Settings, Moon, Sun, Home, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import Image from "next/image"
import { SettingsModal } from "@/components/settings-modal"

interface TopBarProps {
  currentView: "home" | "study"
  onViewChange: (view: "home" | "study") => void
}

export function TopBar({ currentView, onViewChange }: TopBarProps) {
  const [isDark, setIsDark] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <header className="relative flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/images/untitled-20design.png"
              alt="ScribeCat logo"
              width={32}
              height={32}
              className="rounded-lg object-cover w-10 h-10"
            />
            <span className="text-lg font-semibold text-foreground">ScribeCat</span>
          </div>
        </div>

        <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
          <Button
            variant={currentView === "home" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewChange("home")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          <Button
            variant={currentView === "study" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewChange("study")}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Study</span>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="h-8 w-8">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </header>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
