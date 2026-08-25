import { openDB } from 'idb';import type { Project } from '../types';
const dbp=openDB('stop-motion-studio',1,{upgrade(db){if(!db.objectStoreNames.contains('projects'))db.createObjectStore('projects',{keyPath:'id'});if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta');}});
export async function saveProject(p:Project){const db=await dbp;await db.put('projects',p);await db.put('meta',p.id,'lastProjectId');}
export async function loadProject(id:string){return (await dbp).get('projects',id) as Promise<Project|undefined>}
export async function loadLastProject(){const db=await dbp;const id=await db.get('meta','lastProjectId');return id?loadProject(id):undefined}
