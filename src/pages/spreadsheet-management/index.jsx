import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SpreadsheetSelector from './components/SpreadsheetSelector';
import TabSelector from './components/TabSelector';
import DataTable from './components/DataTable';
import OperationPanel from './components/OperationPanel';
import AuditPanel from './components/AuditPanel';
import AIPanel from './components/AIPanel';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const SpreadsheetManagement = () => {
  const navigate = useNavigate();
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState(null);
  const [selectedTab, setSelectedTab] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock data
  const mockSpreadsheets = [
    {
      id: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      name: "Customer Database 2024",
      tabCount: 4,
      lastModified: "2 hours ago",
      collaborators: 3,
      tabs: [
        {
          id: "sheet1",
          name: "Customer List",
          rowCount: 1247,
          columnCount: 8,
          lastModified: "2 hours ago",
          hasChanges: false
        },
        {
          id: "sheet2", 
          name: "Orders",
          rowCount: 3456,
          columnCount: 12,
          lastModified: "1 day ago",
          hasChanges: true
        },
        {
          id: "sheet3",
          name: "Products",
          rowCount: 234,
          columnCount: 6,
          lastModified: "3 days ago",
          hasChanges: false
        }
      ]
    },
    {
      id: "2CxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      name: "Sales Report Q4",
      tabCount: 2,
      lastModified: "1 day ago",
      collaborators: 5,
      tabs: [
        {
          id: "sales1",
          name: "Monthly Sales",
          rowCount: 156,
          columnCount: 10,
          lastModified: "1 day ago",
          hasChanges: false
        },
        {
          id: "sales2",
          name: "Regional Data",
          rowCount: 89,
          columnCount: 7,
          lastModified: "2 days ago",
          hasChanges: false
        }
      ]
    }
  ];

  const mockHeaders = [
    { name: "Customer Name", type: "text", confidence: 95 },
    { name: "Email", type: "email", confidence: 98 },
    { name: "Phone", type: "phone", confidence: 87 },
    { name: "Company", type: "text", confidence: 92 },
    { name: "Registration Date", type: "date", confidence: 94 },
    { name: "Status", type: "category", confidence: 99 }
  ];

  const mockData = [
    ["John Smith", "john.smith@email.com", "555-0123", "Tech Corp", "01/15/2024", "Active"],
    ["Sarah Johnson", "sarah.j@company.com", "555-0124", "Design Studio", "02/20/2024", "Active"],
    ["Mike Wilson", "mike.wilson@firm.com", "555-0125", "Law Firm", "03/10/2024", "Inactive"],
    ["Emily Davis", "emily.davis@startup.com", "555-0126", "StartupXYZ", "04/05/2024", "Active"],
    ["David Brown", "david.b@enterprise.com", "555-0127", "Enterprise Inc", "05/12/2024", "Pending"],
    ["Lisa Garcia", "lisa.garcia@agency.com", "555-0128", "Marketing Agency", "06/18/2024", "Active"],
    ["Tom Anderson", "tom.a@consulting.com", "555-0129", "Consulting Group", "07/22/2024", "Active"],
    ["Anna Martinez", "anna.m@nonprofit.org", "555-0130", "Nonprofit Org", "08/14/2024", "Inactive"]
  ];

  const mockAuditLogs = [
    {
      operation: "cell_update",
      description: "Updated customer email address",
      user: "John Smith",
      timestamp: new Date(Date.now() - 300000),
      details: "Row 3, Column B",
      changes: [
        { old: "old.email@company.com", new: "new.email@company.com" }
      ]
    },
    {
      operation: "row_add",
      description: "Added new customer record",
      user: "Sarah Johnson",
      timestamp: new Date(Date.now() - 900000),
      details: "Row 9"
    },
    {
      operation: "bulk_update",
      description: "Updated status for 5 customers",
      user: "Mike Wilson",
      timestamp: new Date(Date.now() - 1800000),
      details: "Status column"
    },
    {
      operation: "export",
      description: "Exported customer data to CSV",
      user: "Emily Davis",
      timestamp: new Date(Date.now() - 3600000),
      details: "1247 rows exported"
    }
  ];

  const mockSnapshots = [
    {
      id: "snap_1",
      name: "Before Q4 Updates",
      description: "Snapshot before quarterly data updates",
      timestamp: new Date(Date.now() - 86400000),
      rowCount: 1200,
      size: "2.3 MB"
    },
    {
      id: "snap_2",
      name: "Post Migration",
      description: "After data migration from old system",
      timestamp: new Date(Date.now() - 172800000),
      rowCount: 1150,
      size: "2.1 MB"
    },
    {
      id: "snap_3",
      name: "Initial Import",
      description: "First data import snapshot",
      timestamp: new Date(Date.now() - 259200000),
      rowCount: 1000,
      size: "1.8 MB"
    }
  ];

  useEffect(() => {
    // Auto-select first spreadsheet and tab for demo
    if (mockSpreadsheets?.length > 0 && !selectedSpreadsheet) {
      const firstSheet = mockSpreadsheets?.[0];
      setSelectedSpreadsheet(firstSheet);
      if (firstSheet?.tabs?.length > 0) {
        setSelectedTab(firstSheet?.tabs?.[0]);
      }
    }
  }, []);

  const handleSpreadsheetChange = (spreadsheet) => {
    setSelectedSpreadsheet(spreadsheet);
    setSelectedTab(spreadsheet?.tabs?.[0] || null);
    setSelectedRows([]);
  };

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setSelectedRows([]);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const handleAddTab = (tabName) => {
    if (selectedSpreadsheet) {
      const newTab = {
        id: `tab_${Date.now()}`,
        name: tabName,
        rowCount: 0,
        columnCount: 6,
        lastModified: "Just now",
        hasChanges: true
      };
      
      const updatedSpreadsheet = {
        ...selectedSpreadsheet,
        tabs: [...selectedSpreadsheet?.tabs, newTab]
      };
      
      setSelectedSpreadsheet(updatedSpreadsheet);
      setSelectedTab(newTab);
    }
  };

  const handleCellEdit = (rowIndex, columnIndex, newValue) => {
    console.log(`Editing cell [${rowIndex}, ${columnIndex}] to: ${newValue}`);
    // Simulate cell update
  };

  const handleSort = (columnIndex, direction) => {
    setSortConfig({ column: columnIndex, direction });
    console.log(`Sorting column ${columnIndex} in ${direction} order`);
  };

  const handleAddRow = (rowData) => {
    setIsProcessing(true);
    console.log('Adding row:', rowData);
    setTimeout(() => setIsProcessing(false), 1000);
  };

  const handleDeleteRows = (rows) => {
    setIsProcessing(true);
    console.log('Deleting rows:', rows);
    setTimeout(() => {
      setSelectedRows([]);
      setIsProcessing(false);
    }, 1000);
  };

  const handleBulkUpdate = (rows, operation) => {
    setIsProcessing(true);
    console.log('Bulk update:', { rows, operation });
    setTimeout(() => setIsProcessing(false), 1500);
  };

  const handleExport = (format, selectedRowsOnly) => {
    console.log(`Exporting to ${format}`, selectedRowsOnly ? 'selected rows only' : 'all data');
  };

  const handleRestoreSnapshot = (snapshotId) => {
    console.log('Restoring snapshot:', snapshotId);
  };

  const handleCreateSnapshot = () => {
    console.log('Creating new snapshot');
  };

  const handleAITransform = (request) => {
    setIsProcessing(true);
    console.log('AI Transform request:', request);
    setTimeout(() => setIsProcessing(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Breadcrumb />
          
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Spreadsheet Management
                </h1>
                <p className="text-muted-foreground">
                  Manage and manipulate your connected Google Sheets with AI-powered tools
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  iconName="Plus"
                  iconPosition="left"
                  onClick={() => navigate('/connect-spreadsheet')}
                >
                  Connect New Sheet
                </Button>
                <Button
                  variant="default"
                  iconName="LayoutDashboard"
                  iconPosition="left"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3 space-y-6">
              <SpreadsheetSelector
                spreadsheets={mockSpreadsheets}
                selectedSpreadsheet={selectedSpreadsheet}
                onSpreadsheetChange={handleSpreadsheetChange}
                onRefresh={handleRefresh}
              />

              {selectedSpreadsheet && (
                <TabSelector
                  tabs={selectedSpreadsheet?.tabs}
                  selectedTab={selectedTab}
                  onTabChange={handleTabChange}
                  onAddTab={handleAddTab}
                />
              )}

              <AIPanel
                onAITransform={handleAITransform}
                isProcessing={isProcessing}
              />

              {selectedTab && (
                <>
                  <OperationPanel
                    selectedRows={selectedRows}
                    onAddRow={handleAddRow}
                    onDeleteRows={handleDeleteRows}
                    onBulkUpdate={handleBulkUpdate}
                    onExport={handleExport}
                    isProcessing={isProcessing}
                  />

                  <DataTable
                    data={mockData}
                    headers={mockHeaders}
                    selectedRows={selectedRows}
                    onRowSelect={setSelectedRows}
                    onCellEdit={handleCellEdit}
                    onSort={handleSort}
                    sortConfig={sortConfig}
                    isLoading={isLoading}
                  />
                </>
              )}

              {!selectedSpreadsheet && (
                <div className="bg-card border border-border rounded-lg p-12 text-center">
                  <Icon name="FileSpreadsheet" size={64} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No Spreadsheet Selected
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Select a connected spreadsheet to start managing your data
                  </p>
                  <Button
                    variant="default"
                    iconName="Plus"
                    iconPosition="left"
                    onClick={() => navigate('/connect-spreadsheet')}
                  >
                    Connect Your First Spreadsheet
                  </Button>
                </div>
              )}
            </div>

            <div className="xl:col-span-1">
              <AuditPanel
                auditLogs={mockAuditLogs}
                snapshots={mockSnapshots}
                onRestoreSnapshot={handleRestoreSnapshot}
                onCreateSnapshot={handleCreateSnapshot}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SpreadsheetManagement;