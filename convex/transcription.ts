/**
 * AssemblyAI transcription endpoints — replaces Electron main process IPC.
 * Keeps API key server-side in Convex environment variables.
 */

import { httpAction } from './_generated/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Get a temporary AssemblyAI streaming token.
 * The client uses this to open a WebSocket for real-time transcription.
 */
export const getStreamingToken = httpAction(async () => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'AssemblyAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  try {
    const response = await fetch(
      'https://streaming.assemblyai.com/v3/token?expires_in_seconds=480',
      {
        method: 'GET',
        headers: { Authorization: apiKey },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get token: ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as { token: string };
    return new Response(JSON.stringify({ success: true, token: data.token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to get token';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

/**
 * Batch transcription from a publicly-accessible audio URL.
 * Client uploads audio to Convex storage, gets the URL, then calls this endpoint.
 * Supports speaker diarization.
 */
export const transcribeFromUrl = httpAction(async (_ctx, request) => {
  const { audioUrl, speakerLabels } = await request.json();

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'AssemblyAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  try {
    // Step 1: Request transcription
    const transcriptBody: Record<string, unknown> = {
      audio_url: audioUrl,
      speaker_labels: speakerLabels ?? false,
    };

    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transcriptBody),
    });

    if (!transcriptResponse.ok) {
      throw new Error(`Transcription request failed: ${transcriptResponse.statusText}`);
    }

    interface TranscriptStatusResponse {
      id: string;
      status: string;
      text?: string;
      utterances?: Array<{ speaker: string; text: string; start: number; end: number }>;
      words?: Array<{ text: string; start: number; end: number; speaker?: string }>;
      error?: string;
    }

    const transcriptData = (await transcriptResponse.json()) as TranscriptStatusResponse;
    const transcriptId = transcriptData.id;

    // Step 2: Poll for completion
    let result: TranscriptStatusResponse = transcriptData;
    while (result.status !== 'completed' && result.status !== 'error') {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { Authorization: apiKey },
      });

      result = (await pollResponse.json()) as TranscriptStatusResponse;
    }

    if (result.status === 'error') {
      throw new Error(result.error || 'Transcription failed');
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcript: result.text || '',
        utterances: result.utterances || [],
        words: result.words || [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Transcription failed';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
