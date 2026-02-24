import { CatDisplay } from '@/components/study-quest/cat-display';
import type { CatVariant } from '@/components/study-quest/cat-sprites';
import { cn } from '@/lib/utils';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ConversationItem {
  conversationId: Id<'conversations'>;
  otherUser: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    catVariant: string | null;
    catLevel: number | null;
  };
  lastMessageText: string | null;
  lastMessageAt: number;
  hasUnread: boolean;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  selectedId: Id<'conversations'> | null;
  onSelect: (conversationId: Id<'conversations'>) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
        <p className="text-sm font-medium text-foreground">No messages yet</p>
        <p className="text-xs text-muted-foreground text-center">
          Start a conversation from your Friends list
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {conversations.map((convo) => {
        const { otherUser } = convo;
        const initials = otherUser.displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <button
            type="button"
            key={convo.conversationId}
            onClick={() => onSelect(convo.conversationId)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all',
              selectedId === convo.conversationId
                ? 'glass bg-[var(--glass-bg)] border border-[var(--glass-border-strong)] shadow-[0_0_12px_var(--glass-glow)]'
                : 'hover:bg-[var(--glass-bg-light)]',
            )}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              {otherUser.catVariant ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full glass-light">
                  <CatDisplay
                    mood="idle"
                    variant={otherUser.catVariant as CatVariant}
                    size="small"
                  />
                </div>
              ) : otherUser.avatarUrl ? (
                <img
                  src={otherUser.avatarUrl}
                  alt={otherUser.displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--glass-bg)] text-sm font-medium text-foreground">
                  {initials}
                </div>
              )}
            </div>

            {/* Name + preview */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    'truncate text-sm text-foreground',
                    convo.hasUnread ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {otherUser.displayName}
                </p>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatRelativeTime(convo.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <p
                  className={cn(
                    'truncate text-xs',
                    convo.hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  {convo.lastMessageText ?? 'No messages yet'}
                </p>
                {convo.hasUnread && <span className="shrink-0 h-2 w-2 rounded-full bg-accent" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
