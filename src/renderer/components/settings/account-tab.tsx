import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { useApiKeys } from '@/hooks/use-api-keys';
import type { useUserProfile } from '@/hooks/use-user-profile';
import type { useUser } from '@clerk/clerk-react';
import { Copy, Key } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '../../../../convex/_generated/dataModel';

type Profile = ReturnType<typeof useUserProfile>['profile'];
type ApiKeys = ReturnType<typeof useApiKeys>['keys'];
type ClerkUser = ReturnType<typeof useUser>['user'];

interface AccountTabProps {
  profile: Profile;
  user: ClerkUser;
  onNavigateToFriends: () => void;
  displayNameInput: string;
  onDisplayNameInputChange: (value: string) => void;
  displayNameError: string | null;
  isSavingDisplayName: boolean;
  canSaveDisplayName: boolean;
  onSaveDisplayName: () => void;
  apiKeys: ApiKeys;
  generatedKey: string | null;
  onDoneWithGeneratedKey: () => void;
  newKeyLabel: string;
  onNewKeyLabelChange: (value: string) => void;
  isGeneratingKey: boolean;
  onGenerateKey: () => void;
  onRevokeKey: (id: Id<'apiKeys'>) => void;
  onSignOut: () => void;
}

export function AccountTab({
  profile,
  user,
  onNavigateToFriends,
  displayNameInput,
  onDisplayNameInputChange,
  displayNameError,
  isSavingDisplayName,
  canSaveDisplayName,
  onSaveDisplayName,
  apiKeys,
  generatedKey,
  onDoneWithGeneratedKey,
  newKeyLabel,
  onNewKeyLabelChange,
  isGeneratingKey,
  onGenerateKey,
  onRevokeKey,
  onSignOut,
}: AccountTabProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm text-foreground">Username</Label>
        {profile ? (
          <p className="text-sm text-accent font-medium">@{profile.username}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Visit the{' '}
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={onNavigateToFriends}
            >
              Friends page
            </button>{' '}
            to set up your @username
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-foreground">Name</Label>
        {profile ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={displayNameInput}
                onChange={(e) => onDisplayNameInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSaveDisplayName) {
                    onSaveDisplayName();
                  }
                }}
                placeholder="Your name"
                className="bg-background border-border"
                maxLength={50}
              />
              <Button size="sm" onClick={onSaveDisplayName} disabled={!canSaveDisplayName}>
                {isSavingDisplayName ? 'Saving...' : 'Save'}
              </Button>
            </div>
            {displayNameError && <p className="text-xs text-destructive">{displayNameError}</p>}
            <p className="text-xs text-muted-foreground">
              Shown to friends, in study rooms, and in messages.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Set your name when you create your profile on the{' '}
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={onNavigateToFriends}
            >
              Friends page
            </button>
            .
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-foreground">Email</Label>
        <p className="text-sm text-muted-foreground">
          {user?.primaryEmailAddress?.emailAddress ?? 'No email'}
        </p>
      </div>

      {/* API Keys */}
      <div className="space-y-3 border-t border-[var(--glass-border)] pt-4">
        <div>
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            For the ScribeCat MCP server and integrations
          </p>
        </div>

        {/* Connect to Claude instructions */}
        <div className="rounded-lg border border-[var(--glass-border)] glass-light p-3 space-y-2.5">
          <p className="text-xs font-medium text-foreground">
            Connect to Claude or another AI assistant:
          </p>
          <ol className="space-y-2 text-xs text-muted-foreground list-none">
            <li className="flex gap-2">
              <span className="text-accent font-semibold shrink-0">1.</span>
              <span>
                Add this URL to your AI&apos;s{' '}
                <span className="text-foreground font-medium">custom connector</span> settings:
              </span>
            </li>
          </ol>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] text-foreground bg-background rounded px-2 py-1.5 truncate font-mono select-all">
              https://scribecat-mcp.lmdrew.workers.dev/mcp
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText('https://scribecat-mcp.lmdrew.workers.dev/mcp');
                toast.success('Copied!');
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ol className="space-y-2 text-xs text-muted-foreground list-none" start={2}>
            <li className="flex gap-2">
              <span className="text-accent font-semibold shrink-0">2.</span>
              <span>When prompted, generate an API key below and paste it into the field.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-semibold shrink-0">3.</span>
              <span>That&apos;s it — your AI can now access your sessions.</span>
            </li>
          </ol>
        </div>

        {!generatedKey && (
          <div className="flex gap-2">
            <Input
              value={newKeyLabel}
              onChange={(e) => onNewKeyLabelChange(e.target.value)}
              placeholder="Label (e.g. Coru, Claude)"
              className="flex-1 bg-background border-border text-sm"
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onGenerateKey();
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={onGenerateKey}
              disabled={isGeneratingKey}
            >
              {isGeneratingKey ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        )}

        {generatedKey && (
          <div className="rounded-lg border border-[var(--glass-border-strong)] glass-light p-3 space-y-2">
            <p className="text-xs font-medium text-accent">
              Copy this key now — it won&apos;t be shown again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-foreground bg-background rounded px-2 py-1.5 truncate font-mono">
                {generatedKey}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(generatedKey);
                  toast.success('Copied!');
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-xs h-auto p-0"
              onClick={onDoneWithGeneratedKey}
            >
              Done
            </Button>
          </div>
        )}

        {apiKeys && apiKeys.length > 0 && (
          <div className="space-y-1.5">
            {apiKeys.map((key) => (
              <div
                key={key._id}
                className="flex items-center justify-between rounded-md glass-light border border-[var(--glass-border)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {key.label ?? 'Unnamed key'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt
                      ? ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive text-xs shrink-0"
                  onClick={() => onRevokeKey(key._id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-[var(--glass-border)]">
        <Button variant="destructive" size="sm" onClick={onSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
