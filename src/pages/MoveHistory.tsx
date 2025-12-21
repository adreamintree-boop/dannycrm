import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useApp } from '@/context/AppContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MoveHistory: React.FC = () => {
  const { getProjectMoveHistory } = useApp();
  const allHistory = getProjectMoveHistory();

  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    all: true,
    funnel: true,
    activity: true,
    document: true,
  });

  const handleFilterChange = (key: keyof typeof filters, checked: boolean) => {
    if (key === 'all') {
      setFilters({
        all: checked,
        funnel: checked,
        activity: checked,
        document: checked,
      });
    } else {
      const newFilters = { ...filters, [key]: checked };
      const allChecked = newFilters.funnel && newFilters.activity && newFilters.document;
      setFilters({ ...newFilters, all: allChecked });
    }
  };

  const filteredHistory = useMemo(() => {
    return allHistory.filter(item => {
      // Category filter
      if (!filters.all) {
        if (item.category === 'funnel' && !filters.funnel) return false;
        if (item.category === 'activity' && !filters.activity) return false;
        if (item.category === 'document' && !filters.document) return false;
      }

      // Search filter
      if (searchQuery && !item.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [allHistory, filters, searchQuery]);

  const totalPages = Math.ceil(filteredHistory.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + perPage);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 10;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="text-primary font-medium">{part}</span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="dashboard-card animate-fade-in">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Select
            value={String(perPage)}
            onValueChange={(value) => {
              setPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-all"
                checked={filters.all}
                onCheckedChange={(checked) => handleFilterChange('all', checked as boolean)}
              />
              <label htmlFor="filter-all" className="text-sm text-foreground cursor-pointer">
                전체(all)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-funnel"
                checked={filters.funnel}
                onCheckedChange={(checked) => handleFilterChange('funnel', checked as boolean)}
              />
              <label htmlFor="filter-funnel" className="text-sm text-foreground cursor-pointer">
                바이어 등급(funnel insight)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-activity"
                checked={filters.activity}
                onCheckedChange={(checked) => handleFilterChange('activity', checked as boolean)}
              />
              <label htmlFor="filter-activity" className="text-sm text-foreground cursor-pointer">
                영업활동일지(activity report)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-document"
                checked={filters.document}
                onCheckedChange={(checked) => handleFilterChange('document', checked as boolean)}
              />
              <label htmlFor="filter-document" className="text-sm text-foreground cursor-pointer">
                자료실(document hub)
              </label>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-20">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-32">Author</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-32">Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedHistory.map((item, index) => (
              <tr
                key={item.id}
                className={`border-t border-border ${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}
              >
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.id}</td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {highlightText(item.description, searchQuery)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.author}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.date}</td>
              </tr>
            ))}
            {paginatedHistory.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          total : {filteredHistory.length.toLocaleString()}
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-2 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveHistory;
