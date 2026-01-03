import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { auth } from './auth';
import { generateNotes } from './generateNotes';

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

export default http;
