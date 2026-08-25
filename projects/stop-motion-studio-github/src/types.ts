export type PreviewMode = 'camera' | 'frame' | 'playback';

export type FrameItem = {
  id: string;
  projectId: string;
  blob: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  createdAt: number;
};

export type ProjectMeta = {
  id: string;
  name: string;
  fps: number;
  loop: boolean;
  onionEnabled: boolean;
  onionOpacity: number;
  frameOrder: string[];
  frameCount: number;
  createdAt: number;
  updatedAt: number;
};

export type ExportFormat = 'gif' | 'webm';
export type ExportResolution = 'source' | '720p' | '480p';
