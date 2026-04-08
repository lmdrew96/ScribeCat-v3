import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Clean up deleted sessions older than 30 days
// Runs daily at 2 AM
crons.daily(
  'cleanup-old-deleted-sessions',
  { hourUTC: 2, minuteUTC: 0 },
  internal.sessions.cleanupOldDeleted,
);

// Delete expired audio files based on user retention settings
// Runs daily at 3 AM (1 hour after trash cleanup)
crons.daily(
  'cleanup-expired-audio',
  { hourUTC: 3, minuteUTC: 0 },
  internal.audioCleanup.cleanupExpiredAudio,
);

export default crons;
