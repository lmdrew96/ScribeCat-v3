export interface ElectronAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  saveAudio: (
    filename: string,
    audioData: ArrayBuffer,
  ) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  loadAudio: (
    filename: string,
  ) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>;
  deleteAudio: (filename: string) => Promise<{ success: boolean; error?: string }>;
  getAssemblyAIToken: () => Promise<{ success: boolean; token?: string; error?: string }>;
  transcribeFile: (
    filePath: string,
    speakerLabels?: boolean,
  ) => Promise<{
    success: boolean;
    transcript?: string;
    utterances?: Array<{ speaker: string; text: string; start: number; end: number }>;
    words?: Array<{ text: string; start: number; end: number; speaker?: string }>;
    error?: string;
  }>;
  showOpenDialog: (options: {
    filters: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{ canceled: boolean; filePaths: string[] }>;
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
