import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';

interface ProjectSearchFormProps {
  onSearch: (query: string) => void;
  hasActiveFilter: boolean;
  onClear: () => void;
}

export const ProjectSearchForm = ({ onSearch, hasActiveFilter, onClear }: ProjectSearchFormProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleClear = () => {
    setSearchQuery('');
    onClear();
  };

  return (
    <div className="flex items-center space-x-2">
      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search projects, IDs, or metadata..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 min-w-[300px]"
          />
        </div>
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>
      
      {hasActiveFilter && (
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <span>Filters active</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-4 w-4 p-0 hover:bg-transparent"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}
    </div>
  );
};