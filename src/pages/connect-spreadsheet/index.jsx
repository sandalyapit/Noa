import React, { useState, useEffect } from 'react';


import Button from '../../components/ui/Button';
import { AlertCircle, CheckCircle2, Settings, MessageSquare, BarChart3 } from 'lucide-react';







import UrlSyncPanel from '../../components/UrlSyncPanel';
import TabDataViewer from '../../components/TabDataViewer';
import AIAssistantSection from './components/AIAssistantSection';

const ConnectSpreadsheet = () => {
  const [currentStep, setCurrentStep] = useState('url');
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [connectionData, setConnectionData] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState('data'); // data, ai, analysis
  const [notifications, setNotifications] = useState([]);

  // Mock Apps Script URL - replace with your actual deployed URL
  const appsScriptUrl = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

  const addNotification = (notification) => {
    const id = Date.now();
    const newNotification = { ...notification, id, timestamp: new Date() };
    setNotifications(prev => [newNotification, ...prev?.slice(0, 4)]); // Keep last 5
    
    // Auto-remove after 5 seconds for success notifications
    if (notification?.type === 'success') {
      setTimeout(() => {
        setNotifications(prev => prev?.filter(n => n?.id !== id));
      }, 5000);
    }
  };

  const handleTabSelect = (tabInfo) => {
    setSelectedSheet(tabInfo);
    setError('');
    addNotification({
      type: 'success',
      message: `Connected to ${tabInfo?.tabName}`
    });
  };

  const handleOperationComplete = (result) => {
    addNotification({
      type: result?.type,
      message: result?.message
    });
  };

  const renderNotifications = () => {
    if (notifications?.length === 0) return null;

    return (
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications?.map((notification) => (
          <div
            key={notification?.id}
            className={`p-3 rounded-lg shadow-lg border max-w-sm ${
              notification?.type === 'success' ?'bg-green-50 border-green-200 text-green-800'
                : notification?.type === 'error' ?'bg-red-50 border-red-200 text-red-800' :'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-start">
              {notification?.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <div className="text-sm">{notification?.message}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'ai':
        return (
          <AIAssistantSection
            selectedSheet={selectedSheet}
            appsScriptUrl={appsScriptUrl}
            onOperationComplete={handleOperationComplete}
            disabled={isConnecting}
          />
        );
        
      case 'analysis':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Analysis</h3>
            <p className="text-gray-600">Advanced analysis features coming soon...</p>
          </div>
        );
        
      default: // data
        return (
          <TabDataViewer
            appsScriptUrl={appsScriptUrl}
            selected={selectedSheet}
            disabled={isConnecting}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNotifications()}
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Smart Spreadsheet Assistant</h1>
          <p className="text-gray-600 mt-2">
            Connect your Google Sheets and let AI help you manage your data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Connection Setup */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium text-gray-900">Connect Spreadsheet</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Enter your Google Sheets URL to get started
                </p>
              </div>
              
              <div className="p-6">
                <UrlSyncPanel
                  appsScriptUrl={appsScriptUrl}
                  onSelectTab={handleTabSelect}
                  disabled={isConnecting}
                />
              </div>
            </div>

            {selectedSheet && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Connected Sheet</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Tab:</strong> {selectedSheet?.tabName}</p>
                    <p><strong>ID:</strong> {selectedSheet?.spreadsheetId?.slice(0, 20)}...</p>
                    {selectedSheet?.tabMetadata && (
                      <p>
                        <strong>Size:</strong> {selectedSheet?.tabMetadata?.rows} × {selectedSheet?.tabMetadata?.cols}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Data & AI Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border h-full">
              {/* Panel Tabs */}
              <div className="border-b">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActivePanel('data')}
                    className={`py-4 text-sm font-medium border-b-2 ${
                      activePanel === 'data' ?'border-blue-500 text-blue-600' :'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 inline mr-2" />
                    Data View
                  </button>
                  
                  <button
                    onClick={() => setActivePanel('ai')}
                    className={`py-4 text-sm font-medium border-b-2 ${
                      activePanel === 'ai' ?'border-blue-500 text-blue-600' :'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 inline mr-2" />
                    AI Assistant
                  </button>
                  
                  <button
                    onClick={() => setActivePanel('analysis')}
                    className={`py-4 text-sm font-medium border-b-2 ${
                      activePanel === 'analysis' ?'border-blue-500 text-blue-600' :'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    disabled
                  >
                    <Settings className="h-4 w-4 inline mr-2" />
                    Analysis
                    <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                      Soon
                    </span>
                  </button>
                </nav>
              </div>

              {/* Panel Content */}
              <div className="h-[600px] overflow-hidden">
                {renderPanelContent()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>🔒 Your data stays in your Google Sheets. We only read and write with your permission.</p>
          <p className="mt-1">
            📚 Need help? Check out our{' '}
            <a href="#" className="text-blue-600 hover:underline">
              documentation
            </a>{' '}
            or{' '}
            <a href="#" className="text-blue-600 hover:underline">
              video tutorials
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectSpreadsheet;