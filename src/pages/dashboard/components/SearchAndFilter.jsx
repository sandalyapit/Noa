import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const SearchAndFilter = ({ onSearch, onFilter, onSort }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSort, setSelectedSort] = useState('modified');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'connected', label: 'Connected' },
    { value: 'syncing', label: 'Syncing' },
    { value: 'error', label: 'Error' }
  ];

  const sortOptions = [
    { value: 'modified', label: 'Last Modified' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'size', label: 'File Size' },
    { value: 'created', label: 'Date Created' }
  ];

  const handleSearchChange = (e) => {
    const value = e?.target?.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const handleStatusChange = (value) => {
    setSelectedStatus(value);
    onFilter({ status: value });
  };

  const handleSortChange = (value) => {
    setSelectedSort(value);
    onSort(value);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedSort('modified');
    onSearch('');
    onFilter({ status: 'all' });
    onSort('modified');
  };

  return (
    <div className="space-y-4">
      {/* Main Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search spreadsheets by name, owner, or content..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Select
            options={statusOptions}
            value={selectedStatus}
            onChange={handleStatusChange}
            placeholder="Filter by status"
            className="w-40"
          />
          
          <Select
            options={sortOptions}
            value={selectedSort}
            onChange={handleSortChange}
            placeholder="Sort by"
            className="w-40"
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={isAdvancedOpen ? 'bg-muted' : ''}
          >
            <Icon name="Filter" size={16} />
          </Button>
          
          {(searchQuery || selectedStatus !== 'all' || selectedSort !== 'modified') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              iconName="X"
              iconSize={14}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      {/* Advanced Filters */}
      {isAdvancedOpen && (
        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
          <div className="flex items-center space-x-2 mb-3">
            <Icon name="SlidersHorizontal" size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Advanced Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Date Range
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  type="date"
                  placeholder="From"
                  className="text-xs"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  placeholder="To"
                  className="text-xs"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                File Size
              </label>
              <Select
                options={[
                  { value: 'all', label: 'Any Size' },
                  { value: 'small', label: 'Small (&lt; 1MB)' },
                  { value: 'medium', label: 'Medium (1-10MB)' },
                  { value: 'large', label: 'Large (&gt; 10MB)' }
                ]}
                value="all"
                onChange={() => {}}
                placeholder="Select size"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Owner
              </label>
              <Select
                options={[
                  { value: 'all', label: 'All Owners' },
                  { value: 'me', label: 'Owned by me' },
                  { value: 'shared', label: 'Shared with me' }
                ]}
                value="all"
                onChange={() => {}}
                placeholder="Select owner"
              />
            </div>
          </div>
        </div>
      )}
      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <Icon name="Search" size={14} />
          <span>
            {searchQuery ? `Results for "${searchQuery}"` : 'All spreadsheets'}
            {selectedStatus !== 'all' && ` • Status: ${selectedStatus}`}
          </span>
        </div>
        <span>Sorted by {sortOptions?.find(opt => opt?.value === selectedSort)?.label}</span>
      </div>
    </div>
  );
};

export default SearchAndFilter;