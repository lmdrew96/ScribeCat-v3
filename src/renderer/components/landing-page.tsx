import { LegalDocModal } from '@/components/legal-doc-modal';
import { SignIn } from '@clerk/clerk-react';
import { useState } from 'react';
import privacyContent from '../../../docs/PRIVACY_POLICY.md?raw';
import tosContent from '../../../docs/TERMS_OF_SERVICE.md?raw';
import { CatDisplay } from './study-quest/cat-display';

const HERO_CATS: Array<{ variant: 'grey' | 'bengal' | 'siamese' | 'wizard' | 'tricolor' }> = [
  { variant: 'grey' },
  { variant: 'bengal' },
  { variant: 'siamese' },
  { variant: 'wizard' },
  { variant: 'tricolor' },
];

const FEATURES = [
  {
    emoji: '🎙️',
    title: 'Record & Transcribe',
    desc: 'Hit record and let ScribeCat handle the rest. Real-time transcription so you can actually pay attention.',
    color: 'from-[#8cbdb9]/20 to-[#244952]/20',
    border: 'border-[#8cbdb9]/30',
  },
  {
    emoji: '✨',
    title: 'Nugget Takes Notes',
    desc: "While you record, our AI cat writes bullet notes every 45 seconds. Zone out a little. We've got you.",
    color: 'from-[#dea549]/20 to-[#88739e]/20',
    border: 'border-[#dea549]/30',
  },
  {
    emoji: '📖',
    title: 'Study Smarter',
    desc: 'Generate flashcards, quizzes, concept maps, and ELI5 breakdowns from your notes in one click.',
    color: 'from-[#96d080]/20 to-[#244952]/20',
    border: 'border-[#96d080]/30',
  },
  {
    emoji: '🐱',
    title: 'StudyQuest',
    desc: 'Your pixel art cat companion levels up as you study. Neglect your sessions, neglect your cat.',
    color: 'from-[#c45c5c]/20 to-[#88739e]/20',
    border: 'border-[#c45c5c]/30',
  },
  {
    emoji: '💬',
    title: 'Ask Nugget Anything',
    desc: 'Confused about something from your recording? Ask the AI chat. It reads your transcript and notes.',
    color: 'from-[#dbd5e2]/10 to-[#6b5a7d]/20',
    border: 'border-[#dbd5e2]/20',
  },
  {
    emoji: '🎮',
    title: 'Study Together',
    desc: 'Create study rooms, share sessions, and battle friends in live quiz games. Learning is better with chaos.',
    color: 'from-[#dea549]/20 to-[#96d080]/10',
    border: 'border-[#dea549]/25',
  },
] as const;

export function LandingPage() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showTos, setShowTos] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  if (showSignIn) {
    return (
      <div className="app-bg-orbs flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <button
          type="button"
          onClick={() => setShowSignIn(false)}
          className="glass-light glass-enter text-foreground/70 hover:text-foreground rounded-full px-4 py-1.5 text-sm transition-all hover:scale-105"
        >
          ← back to home
        </button>
        <div className="glass-enter">
          <SignIn />
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg-orbs min-h-screen overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="glass-light sticky top-0 z-50 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <img
            src="/nuggy-baby-boy.png"
            alt="Nugget"
            className="size-8 drop-shadow-sm"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="text-foreground font-semibold tracking-tight">ScribeCat</span>
        </div>
        <button
          type="button"
          onClick={() => setShowSignIn(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 py-2 text-sm font-medium transition-all hover:scale-105 hover:shadow-lg"
        >
          Sign in
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center gap-8 px-6 pb-16 pt-20 text-center">
        {/* Floating cats row */}
        <div className="flex items-end gap-6">
          {HERO_CATS.map((cat, i) => (
            <div
              key={cat.variant}
              className="glass-enter"
              style={{
                transform: `scale(1.25) translateY(${i % 2 === 0 ? '0px' : '-2px'})`,
                imageRendering: 'pixelated',
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <CatDisplay
                mood={i === 1 ? 'excited' : i === 3 ? 'happy' : 'studying'}
                variant={cat.variant}
                size="large"
              />
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="glass text-primary rounded-full px-4 py-1 text-xs font-medium uppercase tracking-widest">
            ADHD-Friendly Study Companion
          </div>

          <h1 className="text-foreground max-w-2xl text-5xl leading-tight font-bold tracking-tight sm:text-6xl">
            Your voice notes,{' '}
            <span
              className="inline-block"
              style={{ color: 'var(--primary)', textShadow: '0 0 30px var(--record-glow)' }}
            >
              but actually good.
            </span>
          </h1>

          <p className="text-muted-foreground max-w-lg text-lg leading-relaxed">
            Record → transcribe → AI notes → study tools → pixel cat companion.
            <br />
            Built for the way ADHD brains actually work.
          </p>

          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowSignIn(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-3.5 text-base font-semibold transition-all hover:scale-105 hover:shadow-[0_0_24px_var(--record-glow)]"
            >
              Get started free →
            </button>
            <span className="text-muted-foreground text-sm">@udel.edu accounts only</span>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-foreground text-3xl font-bold">Everything your brain needs</h2>
          <p className="text-muted-foreground mt-2">Six features. One cat. Zero excuses.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`glass glass-hover glass-enter rounded-2xl bg-gradient-to-br p-6 ${f.color} border ${f.border}`}
            >
              <div className="mb-3 text-3xl">{f.emoji}</div>
              <h3 className="text-foreground mb-2 font-semibold">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="glass-heavy mx-4 mb-20 rounded-3xl px-8 py-12 sm:mx-auto sm:max-w-4xl">
        <h2 className="text-foreground mb-8 text-center text-2xl font-bold">How it works</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
          {[
            { step: '1', label: 'Hit record', sub: 'Open ScribeCat before each study session' },
            {
              step: '2',
              label: 'Just talk',
              sub: 'Transcription and AI notes happen automatically',
            },
            {
              step: '3',
              label: 'Review & study',
              sub: 'Generate flashcards, quizzes, concept maps',
            },
            {
              step: '4',
              label: 'Pass the exam',
              sub: "We can't guarantee this but Nugget believes in you",
            },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-2 text-center">
              <div
                className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-full text-sm font-bold"
                style={{ boxShadow: '0 0 16px var(--record-glow)' }}
              >
                {item.step}
              </div>
              <p className="text-foreground font-medium">{item.label}</p>
              <p className="text-muted-foreground text-xs">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── StudyQuest spotlight ── */}
      <section className="mx-auto mb-20 max-w-5xl px-6">
        <div className="glass rounded-3xl p-8 sm:p-12">
          <div className="flex flex-col items-center gap-8 sm:flex-row">
            {/* Cats parade */}
            <div className="flex flex-shrink-0 flex-wrap justify-center gap-6">
              {(['demon', 'vampire', 'wizard', 'xmas'] as const).map((v, i) => (
                <div key={v} style={{ transform: 'scale(1.75)', imageRendering: 'pixelated' }}>
                  <CatDisplay mood={i % 2 === 0 ? 'excited' : 'happy'} variant={v} size="large" />
                </div>
              ))}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="text-primary mb-2 text-sm font-semibold uppercase tracking-widest">
                StudyQuest
              </div>
              <h3 className="text-foreground mb-3 text-2xl font-bold">Meet your study companion</h3>
              <p className="text-muted-foreground leading-relaxed">
                Pick a pixel cat and watch it grow as you study. Earn XP for recording sessions,
                completing study tools, winning quiz battles, and hitting your daily goals. 11
                variants — from Bengal to Holiday to literal Demon Cat.
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                ✦ Neglect your studies and your cat gets sleepy. No pressure though.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 pb-24 text-center">
        <div className="glass-heavy mx-auto max-w-lg rounded-3xl px-8 py-12">
          <img
            src="/nuggy-baby-boy.png"
            alt="Nugget"
            className="mx-auto mb-4 size-16 drop-shadow"
            style={{ imageRendering: 'pixelated' }}
          />
          <h2 className="text-foreground mb-2 text-2xl font-bold">
            Ready to actually remember your notes?
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Nugget is waiting. Your notes are not going to write themselves.
          </p>
          <button
            type="button"
            onClick={() => setShowSignIn(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-3.5 text-base font-semibold transition-all hover:scale-105 hover:shadow-[0_0_24px_var(--record-glow)]"
          >
            Let's go 🐱
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="glass-light border-t border-[var(--glass-border)] py-6 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 text-xs">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
            onClick={() => setShowTos(true)}
          >
            Terms of Service
          </button>
          <span className="text-muted-foreground/50">·</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
            onClick={() => setShowPrivacy(true)}
          >
            Privacy Policy
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          ScribeCat v3 · Made with ✦ for ADHD students · UD only for now
        </p>
      </footer>

      <LegalDocModal
        open={showTos}
        onOpenChange={setShowTos}
        title="Terms of Service"
        content={tosContent}
      />
      <LegalDocModal
        open={showPrivacy}
        onOpenChange={setShowPrivacy}
        title="Privacy Policy"
        content={privacyContent}
      />
    </div>
  );
}
