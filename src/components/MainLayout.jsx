import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './ui/Header';
import AIChatPanel from './AIChatPanel';
import AppsScriptConfig from './AppsScriptConfig';
import ContextMenu from './ContextMenu';
import FloatingActionButton from './FloatingActionButton';
import serviceManager from '../services/serviceManager';
import { MessageSquare, Settings, X, Maximize2, Minimize2, Bot, Zap } from 'lucide-react';

/**
 * Main Layout Component
 * Provides the overall application layout with integrated AI chat panel,
 * context menu, and floating action buttons
 */
const MainLayout = ({ children }) => {
  const location = useLocation();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [aiPanelMaximized, setAiPanelMaximized] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, data: null });
  const [currentSheetContext, setCurrentSheetContext] = useState(null);
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [quickActions, setQuickActions] = useState([]);
  const contextMenuRef = useRef(null);

  useEffect(() => {
    initializeServices();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ visible: false, x: 0, y: 0, data: null });
      }
    };

    const handleContextMenu = (event) => {
      // Only show context menu on specific elements
      const target = event.target.closest('[data-context-menu]');
      if (target) {
        event.preventDefault();
        const contextData = JSON.parse(target.getAttribute('data-context-menu') || '{}');
        setContextMenu({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          data: contextData
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const initializeServices = async () => {
    try {
      const result = await serviceManager.initialize();
      setServicesInitialized(result.success);
      
      if (!result.success && result.errors.length > 0) {
        // Auto-open config panel if services aren't configured
        setConfigPanelOpen(true);
      }
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  };

  const handleAiActionGenerated = async (action) => {
    try {
      if (!currentSheetContext) {
        console.warn('No sheet context available for action execution');
        return;
      }

      // Execute the action through service manager
      const result = await serviceManager.executeAction({
        ...action,
        spreadsheetId: action.spreadsheetId || currentSheetContext.spreadsheetId,
        tabName: action.tabName || currentSheetContext.tabName
      });

      console.log('Action executed:', result);
      
      // You could show a toast notification here
      if (result.success) {
        // Refresh data or update UI as needed
      }
    } catch (error) {
      console.error('Failed to execute AI action:', error);
    }
  };

  const handleContextMenuAction = async (action, data) => {
    setContextMenu({ visible: false, x: 0, y: 0, data: null });
    
    try {
      switch (action) {
        case 'analyze':
          if (data.type === 'spreadsheet') {
            setCurrentSheetContext(data);
            setAiPanelOpen(true);
          }
          break;
          
        case 'duplicate':
          if (data.type === 'spreadsheet') {
            const appsScript = serviceManager.getAppsScriptService();
            if (appsScript) {
              // Implement duplication logic
              console.log('Duplicating spreadsheet:', data);
            }
          }
          break;
          
        case 'export':
          if (data.type === 'spreadsheet') {
            // Implement export logic
            console.log('Exporting spreadsheet:', data);
          }
          break;
          
        case 'refresh':
          // Refresh data
          window.location.reload();
          break;
          
        case 'settings':
          setConfigPanelOpen(true);
          break;
          
        default:
          console.log('Unknown context menu action:', action);
      }
    } catch (error) {
      console.error('Context menu action failed:', error);
    }
  };

  const getQuickActionsForPage = () => {
    const basePath = location.pathname;
    
    switch (basePath) {
      case '/dashboard':
        return [
          {
            icon: MessageSquare,
            label: 'AI Assistant',
            action: () => setAiPanelOpen(true),
            color: 'bg-blue-500 hover:bg-blue-600'
          },
          {
            icon: Settings,
            label: 'Configure',
            action: () => setConfigPanelOpen(true),
            color: 'bg-gray-500 hover:bg-gray-600'
          }
        ];
        
      case '/connect-spreadsheet':
        return [
          {
            icon: Bot,
            label: 'AI Help',
            action: () => setAiPanelOpen(true),
            color: 'bg-green-500 hover:bg-green-600'
          }
        ];
        
      case '/spreadsheet-management':
        return [
          {
            icon: MessageSquare,
            label: 'AI Assistant',
            action: () => setAiPanelOpen(true),
            color: 'bg-blue-500 hover:bg-blue-600'
          },
          {
            icon: Zap,
            label: 'Quick Actions',
            action: () => {
              // Show quick actions menu
              console.log('Quick actions');
            },
            color: 'bg-purple-500 hover:bg-purple-600'
          }
        ];
        
      default:
        return [
          {
            icon: MessageSquare,
            label: 'AI Assistant',
            action: () => setAiPanelOpen(true),
            color: 'bg-blue-500 hover:bg-blue-600'
          }
        ];
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Main Content */}
      <main className="pt-16 relative">
        {children}
      </main>

      {/* AI Chat Panel */}
      {aiPanelOpen && (
        <div className={`fixed right-0 top-16 bottom-0 bg-white border-l border-gray-200 shadow-xl z-40 transition-all duration-300 ${
          aiPanelMaximized ? 'w-full' : 'w-96'
        }`}>
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-blue-500" />
              <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
              {currentSheetContext && (
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {currentSheetContext.tabName}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setAiPanelMaximized(!aiPanelMaximized)}
                className="p-1 hover:bg-gray-200 rounded"
                title={aiPanelMaximized ? 'Minimize' : 'Maximize'}
              >
                {aiPanelMaximized ? (
                  <Minimize2 className="h-4 w-4 text-gray-600" />
                ) : (
                  <Maximize2 className="h-4 w-4 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => setAiPanelOpen(false)}
                className="p-1 hover:bg-gray-200 rounded"
                title="Close"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* AI Chat Component */}
          <div className="h-full">
            <AIChatPanel
              sheetContext={currentSheetContext}
              onActionGenerated={handleAiActionGenerated}
              onSheetContextChange={(action) => {
                if (action === 'connect') {
                  // Navigate to connect spreadsheet page
                  window.location.href = '/connect-spreadsheet';
                }
              }}
              disabled={!servicesInitialized}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {configPanelOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
              <button
                onClick={() => setConfigPanelOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <AppsScriptConfig
                onConfigChange={(config) => {
                  console.log('Configuration updated:', config);
                  // Reinitialize services with new config
                  initializeServices();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-48"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            transform: 'translate(-50%, 0)'
          }}
        >
          <ContextMenu
            data={contextMenu.data}
            onAction={handleContextMenuAction}
          />
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-30">
        {getQuickActionsForPage().map((action, index) => (
          <FloatingActionButton
            key={index}
            icon={action.icon}
            label={action.label}
            onClick={action.action}
            className={action.color}
          />
        ))}
      </div>

      {/* Service Status Indicator */}
      {!servicesInitialized && (
        <div className="fixed bottom-6 left-6 bg-yellow-100 border border-yellow-300 rounded-lg p-3 shadow-lg z-30">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
            <span className="text-sm text-yellow-800">Initializing services...</span>
            <button
              onClick={() => setConfigPanelOpen(true)}
              className="text-xs text-yellow-600 hover:text-yellow-800 underline"
            >
              Configure
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;