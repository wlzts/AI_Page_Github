import { DBSchema, openDB } from 'idb';
import type { FrameItem, ProjectMeta } from '../types';

interface StopMotionDB extends DBSchema {
  projects: {
    key: string;
    value: ProjectMeta;
    indexes: { 'by-updatedAt': number };
  };
  frames: {
    key: string;
    value: FrameItem;
    indexes: { 'by-project': string };
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
}

const dbPromise = openDB<StopMotionDB>('stop-motion-studio-db', 1, {
  upgrade(db) {
    const projects = db.createObjectStore('projects', { keyPath: 'id' });
    projects.createIndex('by-updatedAt', 'updatedAt');
    const frames = db.createObjectStore('frames', { keyPath: 'id' });
    frames.createIndex('by-project', 'projectId');
    db.createObjectStore('meta', { keyPath: 'key' });
  },
});

export async function putFrame(frame: FrameItem) {
  const db = await dbPromise;
  await db.put('frames', frame);
}

export async function getFrames(ids: string[]) {
  const db = await dbPromise;
  const tx = db.transaction('frames', 'readonly');
  const results = await Promise.all(ids.map((id) => tx.store.get(id)));
  await tx.done;
  return results.filter((frame): frame is FrameItem => Boolean(frame));
}

export async function saveProjectMeta(meta: ProjectMeta) {
  const db = await dbPromise;
  const now = Date.now();
  await db.put('projects', {
    ...meta,
    frameCount: meta.frameOrder.length,
    updatedAt: now,
  });
  await db.put('meta', { key: 'lastProjectId', value: meta.id });
}

export async function getProject(id: string) {
  const db = await dbPromise;
  return db.get('projects', id);
}

export async function listProjects() {
  const db = await dbPromise;
  const projects = await db.getAll('projects');
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getLastProjectId() {
  const db = await dbPromise;
  const item = await db.get('meta', 'lastProjectId');
  return item?.value ?? null;
}

export async function deleteProjectFromDb(projectId: string) {
  const db = await dbPromise;
  const keys = await db.getAllKeysFromIndex('frames', 'by-project', projectId);
  const tx = db.transaction(['frames', 'projects'], 'readwrite');
  keys.forEach((key) => tx.objectStore('frames').delete(key));
  tx.objectStore('projects').delete(projectId);
  await tx.done;
}
