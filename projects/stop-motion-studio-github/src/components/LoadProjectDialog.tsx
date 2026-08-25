import { FolderOpen, Trash2, X } from 'lucide-react';
import type { ProjectMeta } from '../types';

export function LoadProjectDialog({
  open,
  projects,
  currentProjectId,
  onLoad,
  onDelete,
  onClose,
}: {
  open: boolean;
  projects: ProjectMeta[];
  currentProjectId: string;
  onLoad: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop">
      <div className="dialog-card max-w-xl" role="dialog" aria-modal="true" aria-labelledby="load-project-title">
        <div className="dialog-header">
          <div>
            <h2 id="load-project-title" className="text-base font-semibold text-white">打开本地项目</h2>
            <p className="mt-1 text-xs text-zinc-500">项目和帧保存在当前浏览器的 IndexedDB。</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="dialog-body max-h-[60vh] space-y-2 overflow-y-auto">
          {!projects.length ? (
            <div className="py-10 text-center text-sm text-zinc-500">还没有保存的项目。</div>
          ) : projects.map((project) => (
            <div key={project.id} className={`project-row ${project.id === currentProjectId ? 'project-row-current' : ''}`}>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onLoad(project.id)}>
                <div className="flex items-center gap-2">
                  <FolderOpen size={15} className="shrink-0 text-zinc-500" />
                  <span className="truncate text-sm font-medium text-zinc-200">{project.name}</span>
                  {project.id === currentProjectId && <span className="current-badge">当前</span>}
                </div>
                <div className="mt-1 pl-6 text-xs text-zinc-600">
                  {project.frameCount} 帧 · {project.fps} FPS · {new Date(project.updatedAt).toLocaleString('zh-CN')}
                </div>
              </button>
              <button className="icon-button-small hover:text-rose-300" type="button" onClick={() => onDelete(project.id)} title="删除项目">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
