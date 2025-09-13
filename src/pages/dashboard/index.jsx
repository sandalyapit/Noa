import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import MetricsCard from './components/MetricsCard';
import SpreadsheetCard from './components/SpreadsheetCard';
import OperationHistoryItem from './components/OperationHistoryItem';
import QuickActionToolbar from './components/QuickActionToolbar';
import SearchAndFilter from './components/SearchAndFilter';

const Dashboard = () => {
  const navigate = useNavigate();
  const [filteredSpreadsheets, setFilteredSpreadsheets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState({ status: 'all' });
  const [currentSort, setCurrentSort] = useState('modified');

  // Mock data for metrics
  const metricsData = [
    {
      title: 'Connected Sheets',
      value: '24',
      subtitle: '3 new this week',
      icon: 'FileSpreadsheet',
      trend: 'up',
      trendValue: '+12.5%',
      color: 'primary'
    },
    {
      title: 'Recent Operations',
      value: '156',
      subtitle: 'Last 24 hours',
      icon: 'Activity',
      trend: 'up',
      trendValue: '+8.2%',
      color: 'success'
    },
    {
      title: 'Data Processed',
      value: '2.4M',
      subtitle: 'Rows this month',
      icon: 'Database',
      trend: 'up',
      trendValue: '+15.3%',
      color: 'warning'
    },
    {
      title: 'System Status',
      value: '99.9%',
      subtitle: 'Uptime this month',
      icon: 'Shield',
      trend: 'neutral',
      trendValue: 'Stable',
      color: 'success'
    }
  ];

  // Mock data for spreadsheets
  const mockSpreadsheets = [
    {
      id: 1,
      name: 'Sales Dashboard Q4 2024',
      sheets: 5,
      rows: 2847,
      status: 'connected',
      lastModified: '2024-12-12T14:30:00Z',
      owner: 'John Smith',
      lastOperation: 'Data import',
      size: '2.3 MB',
      collaborators: 4,
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop&crop=center'
    },
    {
      id: 2,
      name: 'Employee Performance Tracker',
      sheets: 3,
      rows: 1256,
      status: 'syncing',
      lastModified: '2024-12-12T13:15:00Z',
      owner: 'Sarah Johnson',
      lastOperation: 'Formula update',
      size: '1.8 MB',
      collaborators: 7,
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop&crop=center'
    },
    {
      id: 3,
      name: 'Inventory Management System',
      sheets: 8,
      rows: 4521,
      status: 'connected',
      lastModified: '2024-12-12T11:45:00Z',
      owner: 'Mike Chen',
      lastOperation: 'Bulk update',
      size: '3.7 MB',
      collaborators: 2,
      thumbnail: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=100&h=100&fit=crop&crop=center'
    },
    {
      id: 4,
      name: 'Marketing Campaign Analytics',
      sheets: 4,
      rows: 1893,
      status: 'error',
      lastModified: '2024-12-12T09:20:00Z',
      owner: 'Emily Davis',
      lastOperation: 'Data validation',
      size: '2.1 MB',
      collaborators: 5,
      thumbnail: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=100&h=100&fit=crop&crop=center'
    },
    {
      id: 5,
      name: 'Financial Budget 2025',
      sheets: 6,
      rows: 3247,
      status: 'connected',
      lastModified: '2024-12-11T16:30:00Z',
      owner: 'Robert Wilson',
      lastOperation: 'Export to PDF',
      size: '2.9 MB',
      collaborators: 3,
      thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=100&h=100&fit=crop&crop=center'
    },
    {
      id: 6,
      name: 'Customer Feedback Analysis',
      sheets: 2,
      rows: 987,
      status: 'connected',
      lastModified: '2024-12-11T14:15:00Z',
      owner: 'Lisa Anderson',
      lastOperation: 'Chart creation',
      size: '1.4 MB',
      collaborators: 6,
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop&crop=center'
    }
  ];

  // Mock data for operation history
  const operationHistory = [
    {
      id: 1,
      type: 'update',
      description: 'Updated sales data in Q4 dashboard',
      spreadsheetName: 'Sales Dashboard Q4 2024',
      status: 'success',
      timestamp: '2024-12-12T14:30:00Z',
      affectedRows: 45
    },
    {
      id: 2,
      type: 'connect',
      description: 'Connected new spreadsheet',
      spreadsheetName: 'Customer Feedback Analysis',
      status: 'success',
      timestamp: '2024-12-12T13:45:00Z'
    },
    {
      id: 3,
      type: 'export',
      description: 'Exported financial data to CSV',
      spreadsheetName: 'Financial Budget 2025',
      status: 'success',
      timestamp: '2024-12-12T12:20:00Z',
      affectedRows: 156
    },
    {
      id: 4,
      type: 'update',
      description: 'Failed to update inventory data',
      spreadsheetName: 'Inventory Management System',
      status: 'error',
      timestamp: '2024-12-12T11:15:00Z',
      errorMessage: 'Permission denied for range A1:Z100'
    },
    {
      id: 5,
      type: 'duplicate',
      description: 'Duplicated performance tracker',
      spreadsheetName: 'Employee Performance Tracker',
      status: 'pending',
      timestamp: '2024-12-12T10:30:00Z'
    }
  ];

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchQuery, currentFilter, currentSort]);

  const applyFiltersAndSort = () => {
    let filtered = [...mockSpreadsheets];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered?.filter(sheet =>
        sheet?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        sheet?.owner?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        sheet?.lastOperation?.toLowerCase()?.includes(searchQuery?.toLowerCase())
      );
    }

    // Apply status filter
    if (currentFilter?.status !== 'all') {
      filtered = filtered?.filter(sheet => sheet?.status === currentFilter?.status);
    }

    // Apply sorting
    filtered?.sort((a, b) => {
      switch (currentSort) {
        case 'name':
          return a?.name?.localeCompare(b?.name);
        case 'size':
          return parseFloat(b?.size) - parseFloat(a?.size);
        case 'created':
          return new Date(b.lastModified) - new Date(a.lastModified);
        case 'modified':
        default:
          return new Date(b.lastModified) - new Date(a.lastModified);
      }
    });

    setFilteredSpreadsheets(filtered);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilter = (filter) => {
    setCurrentFilter(filter);
  };

  const handleSort = (sort) => {
    setCurrentSort(sort);
  };

  const handleConnectNew = () => {
    navigate('/connect-spreadsheet');
  };

  const handleSpreadsheetEdit = (spreadsheet) => {
    navigate('/spreadsheet-management', { state: { spreadsheet } });
  };

  const handleSpreadsheetDuplicate = (spreadsheet) => {
    console.log('Duplicating spreadsheet:', spreadsheet?.name);
    // Mock duplication logic
  };

  const handleSpreadsheetDisconnect = (spreadsheet) => {
    console.log('Disconnecting spreadsheet:', spreadsheet?.name);
    // Mock disconnection logic
  };

  const handleBulkOperation = () => {
    console.log('Opening bulk operations');
  };

  const handleExport = () => {
    console.log('Exporting data');
  };

  const handleSettings = () => {
    console.log('Opening settings');
  };

  const handleRefresh = () => {
    console.log('Refreshing all data');
  };

  return (
    <div className="min-h-screen bg-background">
      <main>
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <Breadcrumb />

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your Google Sheets connections and monitor operations
              </p>
            </div>
            <Button
              variant="default"
              onClick={handleConnectNew}
              iconName="Plus"
              iconPosition="left"
              className="mt-4 sm:mt-0"
            >
              Connect New Spreadsheet
            </Button>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metricsData?.map((metric, index) => (
              <MetricsCard key={index} {...metric} />
            ))}
          </div>

          {/* Quick Actions Toolbar */}
          <div className="mb-8">
            <QuickActionToolbar
              onBulkOperation={handleBulkOperation}
              onExport={handleExport}
              onSettings={handleSettings}
              onRefresh={handleRefresh}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Spreadsheets Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Connected Spreadsheets</h2>
                <span className="text-sm text-muted-foreground">
                  {filteredSpreadsheets?.length} of {mockSpreadsheets?.length} sheets
                </span>
              </div>

              {/* Search and Filter */}
              <SearchAndFilter
                onSearch={handleSearch}
                onFilter={handleFilter}
                onSort={handleSort}
              />

              {/* Spreadsheets Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredSpreadsheets?.length > 0 ? (
                  filteredSpreadsheets?.map((spreadsheet) => (
                    <div
                      key={spreadsheet?.id}
                      data-context-menu={JSON.stringify({
                        type: 'spreadsheet',
                        id: spreadsheet.id,
                        name: spreadsheet.name,
                        spreadsheetId: spreadsheet.id,
                        tabName: 'Sheet1', // Default tab name
                        ...spreadsheet
                      })}
                    >
                      <SpreadsheetCard
                        spreadsheet={spreadsheet}
                        onEdit={handleSpreadsheetEdit}
                        onDuplicate={handleSpreadsheetDuplicate}
                        onDisconnect={handleSpreadsheetDisconnect}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <div className="text-center py-12 bg-card border border-border rounded-lg">
                      <Icon name="Search" size={48} className="mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No spreadsheets found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery ? 'Try adjusting your search criteria' : 'Connect your first spreadsheet to get started'}
                      </p>
                      <Button
                        variant="outline"
                        onClick={searchQuery ? () => setSearchQuery('') : handleConnectNew}
                        iconName={searchQuery ? "X" : "Plus"}
                        iconPosition="left"
                      >
                        {searchQuery ? 'Clear Search' : 'Connect Spreadsheet'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Operation History Sidebar */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Recent Operations</h2>
                <Button variant="ghost" size="sm" iconName="History" iconSize={14}>
                  View All
                </Button>
              </div>

              <div className="bg-card border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center space-x-2">
                    <Icon name="Activity" size={16} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Operation History</span>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {operationHistory?.map((operation) => (
                    <OperationHistoryItem key={operation?.id} operation={operation} />
                  ))}
                </div>
                
                <div className="p-4 border-t border-border">
                  <Button variant="outline" size="sm" fullWidth iconName="ExternalLink" iconSize={14}>
                    View Complete History
                  </Button>
                </div>
              </div>

              {/* System Status Card */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Icon name="Shield" size={16} className="text-success" />
                  <span className="text-sm font-medium text-foreground">System Status</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Google Sheets API</span>
                    <span className="flex items-center text-success">
                      <Icon name="CheckCircle" size={12} className="mr-1" />
                      Operational
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">AI Processing</span>
                    <span className="flex items-center text-success">
                      <Icon name="CheckCircle" size={12} className="mr-1" />
                      Operational
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Data Sync</span>
                    <span className="flex items-center text-warning">
                      <Icon name="Clock" size={12} className="mr-1" />
                      Delayed
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date()?.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;