"use client"

import { useState } from "react"
import { TopBar } from "@/components/top-bar"
import { HomeView } from "@/components/home-view"
import { StudyView } from "@/components/study-view"

export default function ScribeCat() {
  const [currentView, setCurrentView] = useState<"home" | "study">("home")

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-hidden">{currentView === "home" ? <HomeView /> : <StudyView />}</main>
    </div>
  )
}
