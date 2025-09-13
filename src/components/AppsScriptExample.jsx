import React, { useState, useEffect } from 'react';
import { Play, Database, FileText, Plus, Edit, Search } from 'lucide-react';
import serviceManager from '../services/serviceManager';

/**
 * Apps Script Example Component
 * Demonstrates how to use the Apps Script URL functionality
 */
const AppsScriptExample = () => {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [tabName, setTabName] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      const result = await serviceManager.initialize();
      setInitialized(result.success);
      if (!result.success) {
        console.error('Service initialization failed:', result.errors);
      }
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  };

  const setLoadingState = (action, isLoading) => {
    setLoading(prev => ({ ...prev, [action]: isLoading }));
  };

  const setResult = (action, result) => {
    setResults(prev => ({ ...prev, [action]: result }));
  };

  const handleDiscoverSpreadsheets = async () => {
    setLoadingState('discover', true);
    try {
      const appsScript = serviceManager.getAppsScriptService();
      if (!appsScript) {
        throw new Error('Apps Script service not available. Please configure it first.');
      }

      const result = await appsScript.discoverAll();
      setResult('discover', result);
    } catch (error) {
      setResult('discover', { success: false, error: error.message });
    } finally {
      setLoadingState('discover', false);
    }
  };

  const handleListTabs = async () => {
    if (!spreadsheetId) {
      alert('Please enter a spreadsheet ID');
      return;
    }

    setLoadingState('listTabs', true);
    try {
      const appsScript = serviceManager.getAppsScriptService();
      if (!appsScript) {
        throw new Error('Apps Script service not available. Please configure it first.');
      }

      const result = await appsScript.listTabs(spreadsheetId);
      setResult('listTabs', result);
    } catch (error) {
      setResult('listTabs', { success: false, error: error.message });
    } finally {
      setLoadingState('listTabs', false);
    }
  };

  const handleFetchTabData = async () => {
    if (!spreadsheetId || !tabName) {
      alert('Please enter both spreadsheet ID and tab name');
      return;
    }

    setLoadingState('fetchTabData', true);
    try {
      const appsScript = serviceManager.getAppsScriptService();
      if (!appsScript) {
        throw new Error('Apps Script service not available. Please configure it first.');
      }

      const result = await appsScript.fetchTabData(spreadsheetId, tabName, {
        sampleMaxRows: 10 // Limit sample data for demo
      });
      setResult('fetchTabData', result);
    } catch (error) {
      setResult('fetchTabData', { success: false, error: error.message });
    } finally {
      setLoadingState('fetchTabData', false);
    }
  };

  const handleAddRow = async () => {
    if (!spreadsheetId || !tabName) {
      alert('Please enter both spreadsheet ID and tab name');
      return;
    }

    setLoadingState('addRow', true);
    try {
      const appsScript = serviceManager.getAppsScriptService();
      if (!appsScript) {
        throw new Error('Apps Script service not available. Please configure it first.');
      }

      // Sample data - in a real app, this would come from a form
      const sampleData = [
        'Sample Name',
        'sample@example.com',
        new Date().toISOString().split('T')[0],
        'Demo data from Apps Script integration'
      ];

      const result = await appsScript.addRow(spreadsheetId, tabName, sampleData, {
        dryRun: true, // Set to false to actually add data
        author: 'demo-user'
      });
      setResult('addRow', result);
    } catch (error) {
      setResult('addRow', { success: false, error: error.message });
    } finally {
      setLoadingState('addRow', false);
    }
  };

  const handleUpdateCell = async () => {
    if (!spreadsheetId || !tabName) {
      alert('Please enter both spreadsheet ID and tab name');
      return;
    }

    setLoadingState('updateCell', true);
    try {
      const appsScript = serviceManager.getAppsScriptService();
      if (!appsScript) {
        throw new Error('Apps Script service not available. Please configure it first.');
      }

      const result = await appsScript.updateCell(
        spreadsheetId,
        tabName,
        'A1', // Update cell A1
        `Updated at ${new Date().toLocaleTimeString()}`,
        {
          dryRun: true, // Set to false to actually update
          author: 'demo-user'
        }
      );
      setResult('updateCell', result);
    } catch (error) {
      setResult('updateCell', { success: false, error: error.message });
    } finally {
      setLoadingState('updateCell', false);
    }
  };

  const handleProcessInstruction = async () => {
    if (!spreadsheetId || !tabName) {
      alert('Please enter both spreadsheet ID and tab name for context');
      return;
    }

    setLoadingState('processInstruction', true);
    try {
      const instruction = "Add a new row with name 'John Doe', email 'john@example.com', and today's date";
      const context = {
        spreadsheetId,
        tabName,
        headers: ['Name', 'Email', 'Date', 'Notes'] // Sample headers
      };

      const result = await serviceManager.processUserInstruction(instruction, context);
      setResult('processInstruction', result);
    } catch (error) {
      setResult('processInstruction', { success: false, error: error.message });
    } finally {
      setLoadingState('processInstruction', false);
    }
  };

  const renderResult = (action) => {
    const result = results[action];
    if (!result) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Result:</h4>
        <pre className="text-sm text-gray-700 overflow-auto max-h-64">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  };

  const renderActionButton = (action, label, icon, handler, disabled = false) => {
    const isLoading = loading[action];
    
    return (
      <div className="space-y-2">
        <button
          onClick={handler}
          disabled={disabled || isLoading || !initialized}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            icon
          )}
          <span>{isLoading ? 'Loading...' : label}</span>
        </button>
        {renderResult(action)}
      </div>
    );
  };

  if (!initialized) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Service Initialization</h3>
        <p className="text-yellow-700">
          Services are initializing or not configured. Please check your Apps Script configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Apps Script Integration Demo</h2>
        <p className="text-gray-600 mb-6">
          This demo shows how to interact with Google Sheets through the Apps Script URL integration.
        </p>

        {/* Configuration Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spreadsheet ID
            </label>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="1uus7f... (extract from Google Sheets URL)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tab Name
            </label>
            <input
              type="text"
              value={tabName}
              onChange={(e) => setTabName(e.target.value)}
              placeholder="Sheet1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderActionButton(
            'discover',
            'Discover Spreadsheets',
            <Search className="h-4 w-4" />,
            handleDiscoverSpreadsheets
          )}

          {renderActionButton(
            'listTabs',
            'List Tabs',
            <FileText className="h-4 w-4" />,
            handleListTabs,
            !spreadsheetId
          )}

          {renderActionButton(
            'fetchTabData',
            'Fetch Tab Data',
            <Database className="h-4 w-4" />,
            handleFetchTabData,
            !spreadsheetId || !tabName
          )}

          {renderActionButton(
            'addRow',
            'Add Row (Dry Run)',
            <Plus className="h-4 w-4" />,
            handleAddRow,
            !spreadsheetId || !tabName
          )}

          {renderActionButton(
            'updateCell',
            'Update Cell (Dry Run)',
            <Edit className="h-4 w-4" />,
            handleUpdateCell,
            !spreadsheetId || !tabName
          )}

          {renderActionButton(
            'processInstruction',
            'Process AI Instruction',
            <Play className="h-4 w-4" />,
            handleProcessInstruction,
            !spreadsheetId || !tabName
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">How to Use</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Configure your Apps Script URL and token in the configuration section</li>
            <li>Enter a Google Sheets spreadsheet ID (extract from the URL)</li>
            <li>Enter a tab name (e.g., "Sheet1")</li>
            <li>Try the different actions to see how they work</li>
            <li>Check the results below each button</li>
            <li>Note: Add Row and Update Cell are in "dry run" mode by default</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AppsScriptExample;