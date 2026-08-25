import { Bug, ExternalLink, FileText, Github, Palette, Shield } from 'lucide-react';
import packageJson from '../../../../package.json';

interface AboutTabProps {
  onShowTos: () => void;
  onShowPrivacy: () => void;
}

export function AboutTab({ onShowTos, onShowPrivacy }: AboutTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <img
          src="/nuggy-baby-boy.png"
          alt="ScribeCat logo"
          className="h-16 w-16 rounded-xl object-cover"
        />
        <div>
          <h3 className="text-lg font-semibold text-foreground">ScribeCat</h3>
          <p className="text-sm text-muted-foreground">v{packageJson.version}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Your ADHD-friendly study companion. Record voice notes, take notes, and study smarter.
      </p>

      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-accent hover:underline"
          onClick={() => window.open('https://github.com/lmdrew96/scribecat-v3', '_blank')}
        >
          <Github className="h-4 w-4" />
          View on GitHub
          <ExternalLink className="h-3 w-3" />
        </button>
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-accent hover:underline"
          onClick={() => window.open('https://github.com/lmdrew96/scribecat-v3/issues', '_blank')}
        >
          <Bug className="h-4 w-4" />
          Report a Bug
          <ExternalLink className="h-3 w-3" />
        </button>
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-accent hover:underline"
          onClick={() => window.open('https://adhdesigns.dev', '_blank')}
        >
          <Palette className="h-4 w-4" />
          ADHDesigns
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Legal</h4>
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-accent hover:underline"
          onClick={onShowTos}
        >
          <FileText className="h-4 w-4" />
          Terms of Service
        </button>
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-accent hover:underline"
          onClick={onShowPrivacy}
        >
          <Shield className="h-4 w-4" />
          Privacy Policy
        </button>
      </div>

      <div className="pt-4 border-t border-[var(--glass-border)]">
        <p className="text-xs text-muted-foreground">
          Made with love for distracted minds everywhere.
        </p>
      </div>
    </div>
  );
}
