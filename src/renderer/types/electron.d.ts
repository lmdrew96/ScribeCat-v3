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
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
