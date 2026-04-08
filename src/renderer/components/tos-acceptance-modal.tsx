import { LegalDocModal } from '@/components/legal-doc-modal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStudySettings } from '@/hooks/use-productivity';
import { FileText, Shield } from 'lucide-react';
import { useState } from 'react';
import privacyContent from '../../../docs/PRIVACY_POLICY.md?raw';
import tosContent from '../../../docs/TERMS_OF_SERVICE.md?raw';

const CURRENT_TOS_VERSION = '1.0';

export function TosAcceptanceModal() {
  const { settings, updateSettings } = useStudySettings();
  const [showTos, setShowTos] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Show when settings are loaded but TOS not yet accepted (or outdated version)
  const needsAcceptance =
    settings &&
    '_id' in settings &&
    (!settings.tosAcceptedAt || settings.tosVersion !== CURRENT_TOS_VERSION);

  // Also show for new users who don't have settings yet
  const isNewUser = settings && !('_id' in settings) && !settings.tosAcceptedAt;

  const open = needsAcceptance || isNewUser;

  const handleAccept = async () => {
    await updateSettings({
      tosAcceptedAt: Date.now(),
      tosVersion: CURRENT_TOS_VERSION,
    });
  };

  if (!open) return null;

  return (
    <>
      <Dialog open onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to ScribeCat</DialogTitle>
            <DialogDescription>
              Please review and accept our terms before continuing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-foreground/80">
            <p>By using ScribeCat, you agree to:</p>
            <ul className="space-y-2 pl-1">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted-foreground">•</span>
                Use the app only for personal study purposes
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted-foreground">•</span>
                Obtain consent from all parties before recording audio
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted-foreground">•</span>
                Comply with all applicable laws and institutional policies
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted-foreground">•</span>
                Acknowledge that audio data is processed by third-party AI services
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-accent hover:underline"
              onClick={() => setShowTos(true)}
            >
              <FileText className="h-3.5 w-3.5" />
              Terms of Service
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-accent hover:underline"
              onClick={() => setShowPrivacy(true)}
            >
              <Shield className="h-3.5 w-3.5" />
              Privacy Policy
            </button>
          </div>

          <DialogFooter>
            <Button onClick={handleAccept} className="w-full sm:w-auto">
              I Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
