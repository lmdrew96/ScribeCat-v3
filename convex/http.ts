import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { auth } from './auth';
import { generateNotes } from './generateNotes';
import { extractLectureContext } from './lectureContext';
import { generateNuggetNotes } from './nuggetNotes';
import { nuggetChat } from './nuggetChat';

const http = httpRouter();

auth.addHttpRoutes(http);

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

export default http;
