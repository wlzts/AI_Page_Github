export const FPS_OPTIONS = [1, 2, 4, 6, 8, 10, 12, 15, 24] as const

export type StudioFrame = {
  id: string
  blob: Blob
  thumbnail: Blob
  width: number
  height: number
  createdAt: number
  sourceName?: string
}

export type StudioProject = {
  id: string
  name: string
  frames: StudioFrame[]
  fps: number
  onionSkin: boolean
  onionOpacity: number
  loop: boolean
  updatedAt: number
  createdAt: number
}

export type ViewMode = 'camera' | 'frame' | 'playback'
export type ExportFormat = 'gif' | 'webm'
export type ExportResolution = 'original' | '480' | '720' | '1080'
