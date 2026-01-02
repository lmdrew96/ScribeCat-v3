import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods for window controls and audio operations
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Audio file operations
  saveAudio: (filename: string, audioData: ArrayBuffer) =>
    ipcRenderer.invoke('audio:save', { filename, audioData }),
  loadAudio: (filename: string) => ipcRenderer.invoke('audio:load', { filename }),
  deleteAudio: (filename: string) => ipcRenderer.invoke('audio:delete', { filename }),

  // AssemblyAI
  getAssemblyAIToken: () => ipcRenderer.invoke('assemblyai:getToken'),

  // Platform detection
  platform: process.platform,
});
