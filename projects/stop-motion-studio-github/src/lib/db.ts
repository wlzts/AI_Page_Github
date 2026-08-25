import { openDB, type DBSchema } from 'idb'
import type { StudioProject } from '../types'

interface StopMotionDB extends DBSchema {
  projects: {
    key: string
    value: StudioProject
  }
  meta: {
    key: string
    value: string
  }
}

const dbPromise = openDB<StopMotionDB>('stop-motion-studio-db', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' })
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
  },
})

export async function saveProject(project: StudioProject) {
  const db = await dbPromise
  const next = { ...project, updatedAt: Date.now() }
  await db.put('projects', next)
  await db.put('meta', project.id, 'currentProjectId')
  return next
}

export async function loadProject(id: string) {
  return (await dbPromise).get('projects', id)
}

export async function loadCurrentProject() {
  const db = await dbPromise
  const id = await db.get('meta', 'currentProjectId')
  return id ? db.get('projects', id) : undefined
}

export async function listProjects() {
  const projects = await (await dbPromise).getAll('projects')
  return projects.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function setCurrentProject(id: string) {
  await (await dbPromise).put('meta', id, 'currentProjectId')
}
