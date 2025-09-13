import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Database, 
  BarChart3, 
  Zap, 
  FileText,
  Users,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import AppsScriptConfig from './AppsScriptConfig';
import AppsScriptExample from './AppsScriptExample';
import AIChatPanel from './AIChatPanel';
import serviceManager from '../services/serviceManager';

/**
 * Integrated Demo Component
 * Showcases all the integrated features working together
 */
const IntegratedDemo = () => {
  const [activeDemo, setActiveDemo] = useState('overview');
  const [servicesStatus, setServicesStatus] = useState({});
  const [currentSheetContext, setCurrentSheetContext] = useState(null);
  const [demoData, setDemoData] = useState({
    spreadsheets: [],
    operations: [],
    aiInteractions: 0
  });

  useEffect(() => {
    initializeDemo();
    checkServicesStatus();
  }, []);

  const initializeDemo = async () => {
    // Initialize demo data
    setDemoData({
      spreadsheets: [
        {
          id: 'demo-1',
          name: 'Sales Dashboard 2024',
          tabName: 'Q4 Data',
          rows: 1247,
          cols: 8,
          status: 'connected'
        },
        {
          id: 'demo-2', 
          name: 'Customer Database',
          tabName: 'Customers',
          rows: 3456,
          cols: 12,
          status: 'syncing'
        }
      ],
      operations: [
        { type: 'AI Analysis', status: 'completed', time: '2 min ago' },
        { type: 'Data Export', status: 'completed', time: '5 min ago' },
        { type: 'Bulk Update', status: 'in-progress', time: 'now' }
      ],
      aiInteractions: 23
    });

    // Set demo sheet context
    setCurrentSheetContext({
      spreadsheetId: 'demo-1',
      tabName: 'Q4 Data',
      rows: 1247,
      cols: 8
    });
  };

  const checkServicesStatus = async () => {
    try {
      const health = await serviceManager.getServicesHealth();
      setServicesStatus(health.services);
    } catch (error) {
      console.error('Failed to check services status:', error);
    }
  };

  const handleDemoAction = async (action) => {
    console.log('Demo action:', action);
    
    // Simulate action execution
    const newOperation = {
      type: action,
      status: 'in-progress',
      time: 'now'
    };
    
    setDemoData(prev => ({
      ...prev,
      operations: [newOperation, ...prev.operations.slice(0, 4)]
    }));

    // Simulate completion after 2 seconds
    setTimeout(() => {
      setDemoData(prev => ({
        ...prev,
        operations: prev.operations.map(op => 
          op.time === 'now' ? { ...op, status: 'completed', time: 'just now' } : op
        ),
        aiInteractions: action.includes('AI') ? prev.aiInteractions + 1 : prev.aiInteractions
      }));
    }, 2000);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Smart Spreadsheet Assistant</h2>
        <p className="text-blue-100">
          Complete integration of Apps Script URL, AI Chat Panel, Context Menus, and Service Management
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Database className="h-8 w-8 text-blue-500 mr-3" />
            <h3 className="text-lg font-semibold">Apps Script Integration</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Secure, token-based connection to Google Sheets with comprehensive error handling and retry logic.
          </p>
          <div className="flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-green-700">Connected & Operational</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <MessageSquare className="h-8 w-8 text-green-500 mr-3" />
            <h3 className="text-lg font-semibold">AI Chat Panel</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Context-aware AI assistant that understands your spreadsheet data and can execute actions.
          </p>
          <div className="flex items-center text-sm">
            <Activity className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-blue-700">{demoData.aiInteractions} interactions today</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Zap className="h-8 w-8 text-purple-500 mr-3" />
            <h3 className="text-lg font-semibold">Context Menus</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Right-click context menus for spreadsheets, rows, columns, and cells with smart actions.
          </p>
          <div className="flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-purple-500 mr-2" />
            <span className="text-purple-700">Enhanced productivity</span>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Services Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(servicesStatus).map(([service, status]) => (
            <div key={service} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
              <div className="flex items-center">
                {status.healthy ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={`ml-2 text-sm ${status.healthy ? 'text-green-700' : 'text-red-700'}`}>
                  {status.healthy ? 'Healthy' : 'Error'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Operations */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Operations</h3>
        <div className="space-y-3">
          {demoData.operations.map((operation, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  operation.status === 'completed' ? 'bg-green-500' :
                  operation.status === 'in-progress' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="font-medium">{operation.type}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                {operation.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderConfiguration = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Service Configuration</h2>
        <p className="text-gray-600 mb-6">
          Configure your Apps Script URL, tokens, and hidden parser settings.
        </p>
        <AppsScriptConfig onConfigChange={(config) => console.log('Config updated:', config)} />
      </div>
    </div>
  );

  const renderApiDemo = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Apps Script API Demo</h2>
        <p className="text-gray-600 mb-6">
          Test the Apps Script integration with real API calls.
        </p>
        <AppsScriptExample />
      </div>
    </div>
  );

  const renderAiDemo = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold mb-2">AI Chat Panel Demo</h2>
          <p className="text-gray-600">
            Experience the AI assistant with full spreadsheet context awareness.
          </p>
        </div>
        <div className="h-96">
          <AIChatPanel
            sheetContext={currentSheetContext}
            onActionGenerated={(action) => handleDemoAction(`AI ${action.action}`)}
            onSheetContextChange={(action) => console.log('Sheet context change:', action)}
          />
        </div>
      </div>
    </div>
  );

  const renderContextDemo = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Context Menu Demo</h2>
        <p className="text-gray-600 mb-6">
          Right-click on the elements below to see context menus in action.
        </p>
        
        {/* Demo Spreadsheet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoData.spreadsheets.map((sheet) => (
            <div
              key={sheet.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              data-context-menu={JSON.stringify({
                type: 'spreadsheet',
                id: sheet.id,
                name: sheet.name,
                spreadsheetId: sheet.id,
                tabName: sheet.tabName,
                ...sheet
              })}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{sheet.name}</h3>
                <div className={`px-2 py-1 rounded text-xs ${
                  sheet.status === 'connected' ? 'bg-green-100 text-green-700' :
                  sheet.status === 'syncing' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {sheet.status}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">Tab: {sheet.tabName}</p>
              <p className="text-sm text-gray-500">{sheet.rows} rows × {sheet.cols} columns</p>
              <p className="text-xs text-blue-600 mt-2">Right-click for context menu</p>
            </div>
          ))}
        </div>

        {/* Demo Table */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Sample Data Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Email', 'Status', 'Date'].map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-2 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100"
                      data-context-menu={JSON.stringify({
                        type: 'column',
                        index,
                        name: header,
                        spreadsheetId: 'demo-1',
                        tabName: 'Q4 Data'
                      })}
                    >
                      {header}
                      <span className="text-xs text-blue-600 block">Right-click column</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['John Doe', 'john@example.com', 'Active', '2024-01-15'],
                  ['Jane Smith', 'jane@example.com', 'Inactive', '2024-02-20'],
                  ['Bob Johnson', 'bob@example.com', 'Active', '2024-03-10']
                ].map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-gray-50 cursor-pointer"
                    data-context-menu={JSON.stringify({
                      type: 'row',
                      index: rowIndex,
                      data: row,
                      spreadsheetId: 'demo-1',
                      tabName: 'Q4 Data'
                    })}
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-2 border-b text-sm"
                        data-context-menu={JSON.stringify({
                          type: 'cell',
                          row: rowIndex,
                          column: cellIndex,
                          value: cell,
                          spreadsheetId: 'demo-1',
                          tabName: 'Q4 Data'
                        })}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-blue-600 mt-2">
            Right-click on rows, columns, or cells to see different context menus
          </p>
        </div>
      </div>
    </div>
  );

  const demoTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'api', label: 'API Demo', icon: Database },
    { id: 'ai', label: 'AI Chat', icon: MessageSquare },
    { id: 'context', label: 'Context Menus', icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Integrated Features Demo
          </h1>
          <p className="text-gray-600">
            Explore all the integrated features of the Smart Spreadsheet Assistant
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <nav className="flex space-x-8 px-6">
            {demoTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDemo(tab.id)}
                  className={`py-4 text-sm font-medium border-b-2 flex items-center space-x-2 ${
                    activeDemo === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Demo Content */}
        <div className="min-h-96">
          {activeDemo === 'overview' && renderOverview()}
          {activeDemo === 'config' && renderConfiguration()}
          {activeDemo === 'api' && renderApiDemo()}
          {activeDemo === 'ai' && renderAiDemo()}
          {activeDemo === 'context' && renderContextDemo()}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            🚀 All features are fully integrated and working together seamlessly
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntegratedDemo;