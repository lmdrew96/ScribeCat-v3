import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { generateNotes } from './generateNotes';
import { extractLectureContext } from './lectureContext';
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

// Generate Notes (full AI notes from transcript)
http.route({
  path: '/generateNotes',
  method: 'OPTIONS',
  handler: corsHandler,
});

http.route({
  path: '/generateNotes',
  method: 'POST',
  handler: generateNotes,
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

export default http;
