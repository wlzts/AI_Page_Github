import { useCallback, useEffect, useRef, useState } from 'react'
import { loadCurrentProject, loadProject, saveProject, setCurrentProject } from '../lib/db'
import type { StudioFrame, StudioProject } from '../types'

type FrameSnapshot = Pick<StudioProject, 'frames'> & { selectedIds: string[]; activeFrameId: string | null }

function freshProject(): StudioProject {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: `未命名动画 ${new Date().toLocaleDateString('zh-CN')}`,
    frames: [],
    fps: 8,
    onionSkin: false,
    onionOpacity: 0.3,
    loop: true,
    updatedAt: now,
    createdAt: now,
  }
}

export function useStudioProject() {
  const [project, setProject] = useState<StudioProject>(freshProject)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const pastRef = useRef<FrameSnapshot[]>([])
  const futureRef = useRef<FrameSnapshot[]>([])
  const [historyTick, setHistoryTick] = useState(0)

  useEffect(() => {
    void (async () => {
      const saved = await loadCurrentProject()
      if (saved) setProject(saved)
      setHydrated(true)
    })()
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(() => {
      void saveProject(project)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [hydrated, project])

  const snapshot = useCallback((): FrameSnapshot => ({
    frames: project.frames,
    selectedIds,
    activeFrameId,
  }), [activeFrameId, project.frames, selectedIds])

  const commitFrames = useCallback((frames: StudioFrame[], nextSelected: string[] = [], nextActive: string | null = null) => {
    pastRef.current = [...pastRef.current.slice(-59), snapshot()]
    futureRef.current = []
    setProject((current) => ({ ...current, frames, updatedAt: Date.now() }))
    setSelectedIds(nextSelected)
    setActiveFrameId(nextActive)
    setHistoryTick((v) => v + 1)
  }, [snapshot])

  const addFrames = useCallback((incoming: StudioFrame[]) => {
    if (!incoming.length) return
    const frames = [...project.frames, ...incoming]
    const id = incoming[incoming.length - 1].id
    commitFrames(frames, [id], id)
  }, [commitFrames, project.frames])

  const deleteFrames = useCallback((ids: string[]) => {
    const set = new Set(ids)
    const frames = project.frames.filter((frame) => !set.has(frame.id))
    commitFrames(frames, [], frames.at(-1)?.id ?? null)
  }, [commitFrames, project.frames])

  const duplicateFrames = useCallback((ids: string[]) => {
    const selectedSet = new Set(ids)
    if (!selectedSet.size) return
    const clones: StudioFrame[] = []
    const frames: StudioFrame[] = []
    project.frames.forEach((frame) => {
      frames.push(frame)
      if (selectedSet.has(frame.id)) {
        const clone = { ...frame, id: crypto.randomUUID(), createdAt: Date.now() }
        clones.push(clone)
        frames.push(clone)
      }
    })
    commitFrames(frames, clones.map((f) => f.id), clones.at(-1)?.id ?? null)
  }, [commitFrames, project.frames])

  const reorderFrame = useCallback((activeId: string, overId: string) => {
    if (activeId === overId) return
    const oldIndex = project.frames.findIndex((f) => f.id === activeId)
    const newIndex = project.frames.findIndex((f) => f.id === overId)
    if (oldIndex < 0 || newIndex < 0) return
    const frames = [...project.frames]
    const [moved] = frames.splice(oldIndex, 1)
    frames.splice(newIndex, 0, moved)
    commitFrames(frames, selectedIds, activeFrameId)
  }, [activeFrameId, commitFrames, project.frames, selectedIds])

  const clearFrames = useCallback(() => commitFrames([], [], null), [commitFrames])

  const undo = useCallback(() => {
    const previous = pastRef.current.at(-1)
    if (!previous) return
    futureRef.current = [snapshot(), ...futureRef.current].slice(0, 60)
    pastRef.current = pastRef.current.slice(0, -1)
    setProject((current) => ({ ...current, frames: previous.frames, updatedAt: Date.now() }))
    setSelectedIds(previous.selectedIds)
    setActiveFrameId(previous.activeFrameId)
    setHistoryTick((v) => v + 1)
  }, [snapshot])

  const redo = useCallback(() => {
    const next = futureRef.current[0]
    if (!next) return
    pastRef.current = [...pastRef.current.slice(-59), snapshot()]
    futureRef.current = futureRef.current.slice(1)
    setProject((current) => ({ ...current, frames: next.frames, updatedAt: Date.now() }))
    setSelectedIds(next.selectedIds)
    setActiveFrameId(next.activeFrameId)
    setHistoryTick((v) => v + 1)
  }, [snapshot])

  const updateSettings = useCallback((patch: Partial<Pick<StudioProject, 'name' | 'fps' | 'onionSkin' | 'onionOpacity' | 'loop'>>) => {
    setProject((current) => ({ ...current, ...patch, updatedAt: Date.now() }))
  }, [])

  const saveNow = useCallback(async () => {
    const saved = await saveProject(project)
    setProject(saved)
  }, [project])

  const newProject = useCallback(async () => {
    await saveProject(project)
    const next = freshProject()
    await saveProject(next)
    setProject(next)
    setSelectedIds([])
    setActiveFrameId(null)
    pastRef.current = []
    futureRef.current = []
    setHistoryTick((v) => v + 1)
  }, [project])

  const switchProject = useCallback(async (id: string) => {
    await saveProject(project)
    const next = await loadProject(id)
    if (!next) throw new Error('找不到这个项目')
    await setCurrentProject(id)
    setProject(next)
    setSelectedIds([])
    setActiveFrameId(next.frames.at(-1)?.id ?? null)
    pastRef.current = []
    futureRef.current = []
    setHistoryTick((v) => v + 1)
  }, [project])

  return {
    project,
    selectedIds,
    setSelectedIds,
    activeFrameId,
    setActiveFrameId,
    hydrated,
    addFrames,
    deleteFrames,
    duplicateFrames,
    reorderFrame,
    clearFrames,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    updateSettings,
    saveNow,
    newProject,
    switchProject,
  }
}
