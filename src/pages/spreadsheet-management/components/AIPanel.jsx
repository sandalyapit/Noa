import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import { Bot, Sparkles, MessageCircle, RefreshCw } from 'lucide-react';
import AIAssistantChat from '../../../components/AIAssistantChat';
import AITransformationPanel from '../../dashboard/components/AITransformationPanel';

/**
 * AI Panel for Spreadsheet Management
 * Provides AI-powered assistance and transformation capabilities
 */
const AIPanel = ({ 
  selectedSpreadsheet = null, 
  appsScriptUrl = null,
  onActionExecuted = null 
}) => {
  const [activeAIMode, setActiveAIMode] = useState('chat'); // chat, transform

  const handleTransformationSuggestion = (suggestions) => {
    // Handle transformation suggestions
    onActionExecuted?.({
      type: 'ai_suggestion',
      data: suggestions,
      timestamp: new Date()
    });
  };

  const handleActionGenerated = (action) => {
    // Handle AI-generated actions
    onActionExecuted?.({
      type: 'ai_action',
      action,
      timestamp: new Date()
    });
  };

  if (!selectedSpreadsheet) {
    return (
      <div className="p-6 text-center">
        <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">AI Assistant Ready</h3>
        <p className="text-gray-600">
          Select a spreadsheet to get AI-powered assistance with your data
        </p>
      </div>
    );
  }

  const renderModeToggle = () => (
    <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
      <button
        onClick={() => setActiveAIMode('chat')}
        className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-colors ${
          activeAIMode === 'chat' ?'bg-white text-gray-900 shadow-sm' :'text-gray-600 hover:text-gray-900'
        }`}
      >
        <MessageCircle className="h-4 w-4 inline mr-2" />
        Chat Assistant
      </button>
      <button
        onClick={() => setActiveAIMode('transform')}
        className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-colors ${
          activeAIMode === 'transform'
            ? 'bg-white text-gray-900 shadow-sm' :'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Sparkles className="h-4 w-4 inline mr-2" />
        Data Transform
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeAIMode) {
      case 'transform':
        return (
          <AITransformationPanel
            sourceData={selectedSpreadsheet}
            onTransformationSuggestion={handleTransformationSuggestion}
            className="h-full"
          />
        );
        
      default: // chat
        return (
          <AIAssistantChat
            sheetContext={selectedSpreadsheet}
            onActionGenerated={handleActionGenerated}
            className="h-full"
          />
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-medium text-gray-900">AI Assistant</h3>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location?.reload()}
            title="Refresh AI session"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {renderModeToggle()}
        
        <div className="text-xs text-gray-500">
          Working with: {selectedSpreadsheet?.tabName}
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};

export default AIPanel;