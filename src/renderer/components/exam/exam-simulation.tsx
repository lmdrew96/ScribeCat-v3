import { Button } from '@/components/ui/button';
import { useExamSimulation } from '@/hooks/use-exam-simulation';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ExamSimulationProps {
  examRoomId: Id<'examRooms'>;
  sessionCount: number;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function ExamSimulation({ examRoomId, sessionCount }: ExamSimulationProps) {
  const sim = useExamSimulation(examRoomId);
  const [showResults, setShowResults] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [questionCount, setQuestionCount] = useState(20);

  if (sessionCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <GraduationCap className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">Add sessions first</p>
        <p className="text-xs text-muted-foreground">
          Exam simulation needs session content to generate from
        </p>
      </div>
    );
  }

  // ─── Active Simulation ────────────────────────────────────
  if (sim.isActive) {
    const question = sim.currentQuestion;
    const answeredThis = sim.answers.find((a) => a.questionIndex === sim.currentIndex);
    const isUrgent = sim.timeRemaining < 60000;

    return (
      <div className="flex h-full flex-col">
        {/* Timer bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--glass-border)] glass-light">
          <div className="flex items-center gap-2">
            <Clock className={cn('h-4 w-4', isUrgent ? 'text-red-400' : 'text-muted-foreground')} />
            <span className={cn('text-sm font-mono font-medium', isUrgent && 'text-red-400')}>
              {formatTime(sim.timeRemaining)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {sim.answeredCount}/{sim.questions.length} answered
            </span>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                void sim.finishSimulation();
                setShowResults(true);
              }}
            >
              Finish Exam
            </Button>
          </div>
        </div>

        {/* Question nav */}
        <div className="flex gap-1 px-4 py-2 border-b border-[var(--glass-border)] overflow-x-auto">
          {sim.questions.map((_, i) => {
            const answered = sim.answers.find((a) => a.questionIndex === i);
            return (
              <button
                type="button"
                key={i}
                onClick={() => sim.goToQuestion(i)}
                className={cn(
                  'h-7 w-7 rounded text-[10px] font-medium transition-colors shrink-0',
                  i === sim.currentIndex && 'ring-2 ring-accent',
                  answered
                    ? 'bg-accent/20 text-accent'
                    : 'bg-[var(--glass-bg)] text-muted-foreground',
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Question content */}
        {question && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-accent">
                  Question {sim.currentIndex + 1}
                </span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    question.difficulty === 'hard'
                      ? 'bg-red-500/20 text-red-400'
                      : question.difficulty === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400',
                  )}
                >
                  {question.difficulty}
                </span>
                <span className="text-[10px] text-muted-foreground">{question.topic}</span>
              </div>

              <p className="text-sm font-medium text-foreground mb-4">{question.question}</p>

              <div className="space-y-2">
                {question.options.map((opt, j) => (
                  <button
                    type="button"
                    key={j}
                    onClick={() => sim.submitAnswer(j)}
                    disabled={!!answeredThis}
                    className={cn(
                      'w-full text-left rounded-lg px-4 py-3 text-sm transition-colors border',
                      answeredThis?.selectedAnswer === j
                        ? 'border-accent bg-accent/20 text-foreground'
                        : 'border-[var(--glass-border)] hover:border-accent/30 text-foreground',
                      !!answeredThis && 'cursor-default',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Nav buttons */}
              <div className="flex justify-between mt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={sim.currentIndex === 0}
                  onClick={() => sim.goToQuestion(sim.currentIndex - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={sim.currentIndex === sim.questions.length - 1}
                  onClick={() => sim.goToQuestion(sim.currentIndex + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Results View ─────────────────────────────────────────
  if (showResults && sim.attempts.length > 0) {
    const latest = sim.attempts[sim.attempts.length - 1];
    const pct =
      latest.totalQuestions > 0 ? Math.round((latest.score / latest.totalQuestions) * 100) : 0;

    return (
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-3">
          <Trophy
            className={cn(
              'h-12 w-12 mx-auto',
              pct >= 80 ? 'text-yellow-400' : 'text-muted-foreground',
            )}
          />
          <h3 className="text-xl font-bold text-foreground">{pct}%</h3>
          <p className="text-sm text-muted-foreground">
            {latest.score}/{latest.totalQuestions} correct in {formatTime(latest.timeUsed)}
          </p>
        </div>

        {/* Topic breakdown */}
        {latest.topicBreakdown && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Topic Breakdown
            </h4>
            {latest.topicBreakdown.map((t, i) => {
              const topicPct = t.total > 0 ? (t.correct / t.total) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-foreground w-32 truncate">{t.topic}</span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--glass-bg)]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        topicPct >= 75
                          ? 'bg-green-500'
                          : topicPct >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500',
                      )}
                      style={{ width: `${topicPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {t.correct}/{t.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowResults(false)}>
            Back
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              sim.startSimulation(timeLimitMinutes);
              setShowResults(false);
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ─── Setup / Landing ──────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/50" />
        <h3 className="text-sm font-medium text-foreground">Exam Simulation</h3>
        <p className="text-xs text-muted-foreground">
          Timed practice exam — no hints, real exam conditions
        </p>
      </div>

      {/* Settings */}
      <div className="space-y-4 glass-light rounded-lg p-4 border border-[var(--glass-border)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Questions</span>
          <div className="flex gap-1">
            {[15, 20, 30].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setQuestionCount(n)}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors',
                  questionCount === n
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Time Limit</span>
          <div className="flex gap-1">
            {[15, 30, 45, 60].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setTimeLimitMinutes(n)}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors',
                  timeLimitMinutes === n
                    ? 'bg-accent/20 text-accent'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {n}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3">
        {sim.hasQuestions ? (
          <Button onClick={() => sim.startSimulation(timeLimitMinutes)} className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Start Exam
          </Button>
        ) : (
          <Button
            onClick={() => void sim.generate(questionCount)}
            disabled={sim.isGenerating}
            className="gap-2"
          >
            {sim.isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <GraduationCap className="h-4 w-4" />
                Generate Exam
              </>
            )}
          </Button>
        )}
        {sim.error && <p className="text-xs text-destructive">{sim.error}</p>}
      </div>

      {/* Past attempts */}
      {sim.attempts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Past Attempts
          </h4>
          {sim.attempts.map((attempt) => {
            const pct =
              attempt.totalQuestions > 0
                ? Math.round((attempt.score / attempt.totalQuestions) * 100)
                : 0;
            return (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-lg p-3 glass-light border border-[var(--glass-border)]"
              >
                <div className="flex items-center gap-2">
                  {pct >= 80 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-foreground">{pct}%</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {attempt.score}/{attempt.totalQuestions}
                  </span>
                  <span>{formatTime(attempt.timeUsed)}</span>
                  <span>
                    {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
