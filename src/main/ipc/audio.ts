import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ipcMain } from 'electron';
import { app } from 'electron';

/**
 * Set up IPC handlers for audio and file operations
 */
export function setupAudioIPC() {
  // Get the user data directory for storing audio files
  const audioDir = path.join(app.getPath('userData'), 'recordings');

  // Ensure audio directory exists
  fs.mkdir(audioDir, { recursive: true }).catch(console.error);

  /**
   * Save audio file to local storage
   */
  ipcMain.handle(
    'audio:save',
    async (_, { filename, audioData }: { filename: string; audioData: ArrayBuffer }) => {
      try {
        const filePath = path.join(audioDir, filename);
        await fs.writeFile(filePath, Buffer.from(audioData));
        return { success: true, filePath };
      } catch (error) {
        console.error('Error saving audio file:', error);
        return { success: false, error: (error as Error).message };
      }
    },
  );

  /**
   * Load audio file from local storage
   */
  ipcMain.handle('audio:load', async (_, { filename }: { filename: string }) => {
    try {
      const filePath = path.join(audioDir, filename);
      const data = await fs.readFile(filePath);
      return { success: true, data: data.buffer };
    } catch (error) {
      console.error('Error loading audio file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Delete audio file from local storage
   */
  ipcMain.handle('audio:delete', async (_, { filename }: { filename: string }) => {
    try {
      const filePath = path.join(audioDir, filename);
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting audio file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Transcribe an uploaded audio file via AssemblyAI batch API
   * Supports speaker diarization when enabled
   */
  ipcMain.handle(
    'assemblyai:transcribeFile',
    async (_, { filePath, speakerLabels }: { filePath: string; speakerLabels?: boolean }) => {
      const apiKey = process.env.ASSEMBLYAI_API_KEY;
      if (!apiKey) {
        return { success: false, error: 'AssemblyAI API key not configured' };
      }

      try {
        // Step 1: Upload the audio file
        const fileData = fsSync.readFileSync(filePath);
        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/octet-stream',
          },
          body: fileData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const uploadData = (await uploadResponse.json()) as { upload_url: string };

        // Step 2: Request transcription
        const transcriptBody: Record<string, unknown> = {
          audio_url: uploadData.upload_url,
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

        // Step 3: Poll for completion
        let result: TranscriptStatusResponse = transcriptData;
        while (result.status !== 'completed' && result.status !== 'error') {
          await new Promise((resolve) => setTimeout(resolve, 3000));

          const pollResponse = await fetch(
            `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
            {
              headers: { Authorization: apiKey },
            },
          );

          result = (await pollResponse.json()) as TranscriptStatusResponse;
        }

        if (result.status === 'error') {
          throw new Error(result.error || 'Transcription failed');
        }

        return {
          success: true,
          transcript: result.text || '',
          utterances: result.utterances || [],
          words: result.words || [],
        };
      } catch (error) {
        console.error('Error transcribing file:', error);
        return { success: false, error: (error as Error).message };
      }
    },
  );

  /**
   * Get AssemblyAI temporary token for v3 streaming API
   * This keeps the API key secure in the main process
   */
  ipcMain.handle('assemblyai:getToken', async () => {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'AssemblyAI API key not configured' };
    }

    try {
      // Generate temporary token using v3 API
      const response = await fetch(
        'https://streaming.assemblyai.com/v3/token?expires_in_seconds=480',
        {
          method: 'GET',
          headers: {
            Authorization: apiKey,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get token: ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as { token: string };
      return { success: true, token: data.token };
    } catch (error) {
      console.error('Error getting AssemblyAI token:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
