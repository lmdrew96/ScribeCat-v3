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

export default crons;
