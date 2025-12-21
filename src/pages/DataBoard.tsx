import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

const DataBoard: React.FC = () => {
  const { getProjectDocuments, addDocument, deleteDocument, activeProjectId } = useApp();
  const allDocuments = getProjectDocuments();

  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', attachmentName: '' });

  const filteredDocuments = useMemo(() => {
    return allDocuments.filter(doc => {
      if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [allDocuments, searchQuery]);

  const totalPages = Math.ceil(filteredDocuments.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + perPage);

  const handleCreate = () => {
    if (newDoc.title.trim()) {
      addDocument({
        projectId: activeProjectId,
        title: newDoc.title.trim(),
        attachmentName: newDoc.attachmentName || 'document.pdf',
        author: '관리자',
      });
      setNewDoc({ title: '', attachmentName: '' });
      setIsCreateOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace('.', '');
  };

  return (
    <div className="dashboard-card animate-fade-in">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted-foreground">
          전체 <span className="text-primary font-medium">{filteredDocuments.length}</span> 건
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">작성</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 문서 작성</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="제목 입력" value={newDoc.title} onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} />
                <Input placeholder="첨부파일명 (선택)" value={newDoc.attachmentName} onChange={(e) => setNewDoc({ ...newDoc, attachmentName: e.target.value })} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>취소</Button>
                <Button onClick={handleCreate}>등록</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="검색어를 입력하세요" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
          </div>

          <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-16">No.</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">제목</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-40">첨부파일</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-28">작성일</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-24">작성자</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-20">관리</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDocuments.map((doc, index) => (
              <tr key={doc.id} className={`border-t border-border ${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                <td className="px-4 py-3 text-sm text-muted-foreground">{startIndex + index + 1}</td>
                <td className="px-4 py-3 text-sm text-foreground">{doc.title}</td>
                <td className="px-4 py-3 text-sm text-primary flex items-center gap-1"><FileText className="w-4 h-4" />{doc.attachmentName}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(doc.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{doc.author}</td>
                <td className="px-4 py-3"><button onClick={() => deleteDocument(doc.id)} className="p-1 hover:bg-muted rounded text-muted-foreground"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {paginatedDocuments.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No documents found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-4 gap-1">
        <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 hover:bg-muted rounded disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 rounded text-sm ${currentPage === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{p}</button>
        ))}
        <button onClick={() => setCurrentPage(Math.min(totalPages || 1, currentPage + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 hover:bg-muted rounded disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

export default DataBoard;
