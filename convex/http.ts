import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { examNuggetChat } from './examChat';
import { extractLectureContext } from './lectureContext';
import { mcpGetCourses, mcpGetSession, mcpListSessions, mcpSearchSessions } from './mcpApi';
import { nuggetChat } from './nuggetChat';
import { generateNuggetNotes } from './nuggetNotes';
import { reportBug } from './reportBug';
import { scrubTranscript } from './scrubTranscript';
import { getStreamingToken, transcribeFromUrl } from './transcription';

const http = httpRouter();

// CORS preflight handler
const corsHandler = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
});

// Lecture Context (Sonnet - every ~2 min during recording)
http.route({
  path: '/lectureContext',
  method: 'OPTIONS',
  handler: corsHandler,
});

http.route({
  path: '/lectureContext',
  method: 'POST',
  handler: extractLectureContext,
});

// Nugget Notes (Haiku - every ~45s during recording)
http.route({
  path: '/nuggetNotes',
  method: 'OPTIONS',
  handler: corsHandler,
});

http.route({
  path: '/nuggetNotes',
  method: 'POST',
  handler: generateNuggetNotes,
});

// Nugget Chat (Sonnet - Q&A about content)
http.route({
  path: '/nuggetChat',
  method: 'OPTIONS',
  handler: corsHandler,
});

http.route({
  path: '/nuggetChat',
  method: 'POST',
  handler: nuggetChat,
});

// Scrub Transcript (Haiku - every ~2 min during recording, sliding 800-word window)
http.route({
  path: '/scrubTranscript',
  method: 'OPTIONS',
  handler: corsHandler,
});

http.route({
  path: '/scrubTranscript',
  method: 'POST',
  handler: scrubTranscript,
});

// Bug Report (creates GitHub Issue)
http.route({
  path: '/reportBug',
  method: 'OPTIONS',
  handler: corsHandler,
});

http.route({
  path: '/reportBug',
  method: 'POST',
  handler: reportBug,
});

// AssemblyAI Streaming Token (for real-time transcription)
http.route({
  path: '/assemblyai/token',
  method: 'OPTIONS',
  handler: corsHandler,
});

http.route({
  path: '/assemblyai/token',
  method: 'GET',
  handler: getStreamingToken,
});

// AssemblyAI Batch Transcription (file upload)
http.route({
  path: '/assemblyai/transcribe',
  method: 'OPTIONS',
  handler: corsHandler,
});

http.route({
  path: '/assemblyai/transcribe',
  method: 'POST',
  handler: transcribeFromUrl,
});

// Exam Nugget Chat (multi-session AI chat in exam rooms)
http.route({
  path: '/examNuggetChat',
  method: 'OPTIONS',
  handler: corsHandler,
});

http.route({
  path: '/examNuggetChat',
  method: 'POST',
  handler: examNuggetChat,
});

// MCP API routes (API-key authenticated — no CORS needed, server-to-server)
http.route({ path: '/mcp/sessions', method: 'GET', handler: mcpListSessions });
http.route({ path: '/mcp/session', method: 'GET', handler: mcpGetSession });
http.route({ path: '/mcp/sessions/search', method: 'GET', handler: mcpSearchSessions });
http.route({ path: '/mcp/courses', method: 'GET', handler: mcpGetCourses });

export default http;
