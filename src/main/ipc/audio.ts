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
   * Get AssemblyAI temporary token
   * This keeps the API key secure in the main process
   */
  ipcMain.handle('assemblyai:getToken', async () => {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'AssemblyAI API key not configured' };
    }

    try {
      const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method: 'POST',
        headers: {
          authorization: apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get token: ${response.statusText}`);
      }

      const data = (await response.json()) as { token: string };
      return { success: true, token: data.token };
    } catch (error) {
      console.error('Error getting AssemblyAI token:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
