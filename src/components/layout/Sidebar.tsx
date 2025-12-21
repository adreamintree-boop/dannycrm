import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

const Sidebar: React.FC = () => {
  const { projects, activeProjectId, setActiveProjectId, addProject, deleteProject, updateProject } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = () => {
    if (newProjectName.trim()) {
      addProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreateOpen(false);
    }
  };

  const handleEdit = () => {
    if (editingProject && editingProject.name.trim()) {
      updateProject(editingProject.id, editingProject.name.trim());
      setEditingProject(null);
      setIsEditOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteProject(id);
    }
  };

  const truncateName = (name: string, maxLength: number = 15) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  };

  return (
    <aside className="w-[200px] min-w-[200px] bg-card border-r border-border flex flex-col h-[calc(100vh-56px)]">
      {/* Create Project Button */}
      <div className="p-4">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              <Plus className="w-4 h-4" />
              프로젝트 생성
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 프로젝트 생성</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="프로젝트 이름 입력"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>취소</Button>
              <Button onClick={handleCreate}>생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            All Projects
          </span>
        </div>
        <div className="space-y-1 px-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
                activeProjectId === project.id
                  ? 'bg-secondary text-secondary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
              onClick={() => setActiveProjectId(project.id)}
            >
              <span className="text-sm truncate flex-1" title={project.name}>
                {truncateName(project.name)}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1 hover:bg-background rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingProject({ id: project.id, name: project.name });
                    setIsEditOpen(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  className="p-1 hover:bg-background rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로젝트 이름 수정</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="프로젝트 이름 입력"
            value={editingProject?.name || ''}
            onChange={(e) => setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null)}
            onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>취소</Button>
            <Button onClick={handleEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
};

export default Sidebar;
