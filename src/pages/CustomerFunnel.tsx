import React, { useState } from 'react';
import { Search, Grid3X3, List, Bookmark, Trash2, Globe, MapPin, Youtube, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useApp } from '@/context/AppContext';
import { getFlagEmoji, countries, BuyerStatus } from '@/data/mockData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CustomerFunnel: React.FC = () => {
  const { getProjectBuyers, addBuyer, updateBuyerStatus, toggleBookmark, deleteBuyer, activeProjectId } = useApp();
  const buyers = getProjectBuyers();

  const [activeFormTab, setActiveFormTab] = useState<'direct' | 'excel'>('direct');
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Form state
  const [formData, setFormData] = useState({
    company: '',
    country: '',
    address: '',
    websiteUrl: '',
  });

  const statuses: { key: BuyerStatus; label: string; level: string; color: string }[] = [
    { key: 'list', label: 'List', level: 'level 1', color: 'bg-status-list' },
    { key: 'lead', label: 'Lead', level: 'level 2', color: 'bg-status-lead' },
    { key: 'target', label: 'Target', level: 'level 3', color: 'bg-status-target' },
    { key: 'client', label: 'Client', level: 'level 4', color: 'bg-status-client' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim() || !formData.country) return;

    const selectedCountry = countries.find(c => c.code === formData.country);
    if (!selectedCountry) return;

    addBuyer({
      projectId: activeProjectId,
      name: formData.company.trim(),
      country: selectedCountry.name,
      countryCode: selectedCountry.code,
      status: 'list',
      bookmarked: false,
      websiteUrl: formData.websiteUrl,
      address: formData.address,
      region: selectedCountry.region,
    });

    setFormData({ company: '', country: '', address: '', websiteUrl: '' });
  };

  const filteredBuyers = buyers.filter(buyer => {
    if (showBookmarked && !buyer.bookmarked) return false;
    if (searchQuery && !buyer.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getBuyersByStatus = (status: BuyerStatus) =>
    filteredBuyers.filter(b => b.status === status);

  const handleDragStart = (e: React.DragEvent, buyerId: string) => {
    e.dataTransfer.setData('buyerId', buyerId);
  };

  const handleDrop = (e: React.DragEvent, status: BuyerStatus) => {
    e.preventDefault();
    const buyerId = e.dataTransfer.getData('buyerId');
    if (buyerId) {
      updateBuyerStatus(buyerId, status);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\. /g, '.').replace('.', '');
  };

  return (
    <div className="flex gap-6 h-full animate-fade-in">
      {/* Left Panel - Form */}
      <div className="w-80 flex-shrink-0">
        <div className="dashboard-card">
          {/* Form Tabs */}
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setActiveFormTab('direct')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeFormTab === 'direct'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              직접등록
            </button>
            <button
              onClick={() => setActiveFormTab('excel')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeFormTab === 'excel'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              엑셀업로드
            </button>
          </div>

          {activeFormTab === 'direct' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  company <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="소속회사명 입력"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  continent_sub-region_nation <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="국가검색" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {getFlagEmoji(country.code)} {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 text-xs text-muted-foreground">
                  <div>대륙 :</div>
                  <div>세부지역 :</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    google map address <span className="text-destructive">*</span>
                  </label>
                  <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    구글맵 바로가기
                  </a>
                </div>
                <Input
                  placeholder="구글맵에서 유효한 주소값을 입력하셔서 등록할 수 있습니다."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  company website URL <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="웹사이트 주소 입력"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                + 등록하기
              </Button>
            </form>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Excel upload feature coming soon
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Kanban Board */}
      <div className="flex-1 min-w-0">
        {/* Controls */}
        <div className="flex items-center justify-end gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="bookmark"
              checked={showBookmarked}
              onCheckedChange={(checked) => setShowBookmarked(checked as boolean)}
            />
            <label htmlFor="bookmark" className="text-sm text-muted-foreground cursor-pointer">
              only bookmark
            </label>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <div className="flex border border-border rounded overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-muted' : 'bg-card'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-muted' : 'bg-card'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="grid grid-cols-4 gap-4">
          {statuses.map((status) => {
            const statusBuyers = getBuyersByStatus(status.key);
            return (
              <div
                key={status.key}
                className="flex flex-col"
                onDrop={(e) => handleDrop(e, status.key)}
                onDragOver={handleDragOver}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`${status.color} text-white text-xs px-2 py-0.5 rounded`}>
                      {status.level}
                    </span>
                    <span className="font-medium text-foreground">{status.label}</span>
                  </div>
                  <button className="p-1 hover:bg-muted rounded">
                    <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>

                {/* Count */}
                <div className="text-2xl font-bold text-foreground mb-3">{statusBuyers.length}</div>

                {/* Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-350px)] scrollbar-thin">
                  {statusBuyers.map((buyer) => (
                    <div
                      key={buyer.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, buyer.id)}
                      className="dashboard-card cursor-move hover:shadow-card-hover transition-shadow"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getFlagEmoji(buyer.countryCode)}</span>
                          <span>{buyer.country}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(buyer.createdAt)}
                        </span>
                      </div>

                      {/* Name */}
                      <div className="font-medium text-foreground mb-3 truncate" title={buyer.name}>
                        {buyer.name}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleBookmark(buyer.id)}
                            className={`p-1 hover:bg-muted rounded ${buyer.bookmarked ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            <Bookmark className={`w-4 h-4 ${buyer.bookmarked ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={() => deleteBuyer(buyer.id)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground/50">
                          <MapPin className="w-3.5 h-3.5" />
                          <Globe className="w-3.5 h-3.5" />
                          <ExternalLink className="w-3.5 h-3.5" />
                          <Youtube className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomerFunnel;
