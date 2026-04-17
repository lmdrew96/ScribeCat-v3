import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserProfile } from '@/hooks/use-user-profile';
import { cn } from '@/lib/utils';
import { useQuery } from 'convex/react';
import { AtSign, Check, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../../../convex/_generated/api';

interface UsernameSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dismissible?: boolean;
}

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function UsernameSetupModal({
  open,
  onOpenChange,
  dismissible = true,
}: UsernameSetupModalProps) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createProfile } = useUserProfile();

  const normalizedUsername = username.toLowerCase();
  const isValidFormat = USERNAME_REGEX.test(normalizedUsername);
  const trimmedDisplayName = displayName.trim();
  const isValidDisplayName = trimmedDisplayName.length >= 1 && trimmedDisplayName.length <= 50;

  // Only check availability if format is valid
  const isTaken = useQuery(
    api.userProfiles.isUsernameTaken,
    isValidFormat ? { username: normalizedUsername } : 'skip',
  );

  const isAvailable = isValidFormat && isTaken === false;
  const isChecking = isValidFormat && isTaken === undefined;
  const canSubmit = isAvailable && isValidDisplayName;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await createProfile({
        username: normalizedUsername,
        displayName: trimmedDisplayName,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValidationIcon = () => {
    if (username.length === 0) return null;
    if (!isValidFormat) return <X className="h-4 w-4 text-destructive" />;
    if (isChecking) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (isTaken) return <X className="h-4 w-4 text-destructive" />;
    return <Check className="h-4 w-4 text-success" />;
  };

  const getValidationMessage = () => {
    if (username.length === 0) return null;
    if (username.length < 3) return 'At least 3 characters';
    if (username.length > 20) return 'Max 20 characters';
    if (!isValidFormat) return 'Letters, numbers, and underscores only';
    if (isChecking) return 'Checking availability...';
    if (isTaken) return 'Username already taken';
    return 'Available!';
  };

  return (
    <Dialog open={open} onOpenChange={dismissible ? onOpenChange : undefined}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={dismissible ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={dismissible ? undefined : (e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Choose your @username</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This is how other students will find you on ScribeCat. Usernames are permanent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-sm text-foreground">Display name</Label>
            <Input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSubmit();
              }}
              placeholder="Your name"
              className="bg-background border-border"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              How your name appears to friends, study rooms, and messages. You can change this
              later.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-foreground">Username</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSubmit();
                }}
                placeholder="your_username"
                className="bg-background border-border pl-9 pr-9"
                maxLength={20}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">{getValidationIcon()}</div>
            </div>
            <p
              className={cn(
                'text-xs',
                isAvailable ? 'text-success' : 'text-muted-foreground',
                isTaken ? 'text-destructive' : '',
                !isValidFormat && username.length > 0 ? 'text-destructive' : '',
              )}
            >
              {getValidationMessage() ?? '3-20 characters, letters, numbers, underscores'}
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Profile'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
