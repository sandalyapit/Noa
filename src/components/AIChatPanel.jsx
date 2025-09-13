import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  RefreshCw, 
  Zap, 
  FileText, 
  Database,
  TrendingUp,
  Lightbulb,
  Code,
  Play,
  Pause,
  Square
} from 'lucide-react';
import serviceManager from '../services/serviceManager';

/**
 * Enhanced AI Chat Panel Component
 * Provides conversational AI assistance with spreadsheet context awareness
 */
const AIChatPanel = ({ 
  sheetContext = null, 
  onActionGenerated = null,
  onSheetContextChange = null,
  disabled = false,
  className = ''
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const streamingRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  useEffect(() => {
    initializeChat();
    generateQuickActions();
    generateSuggestions();
  }, [sheetContext]);

  const initializeChat = () => {
    if (messages?.length === 0) {
      const welcomeMessage = {
        id: 1,
        role: 'assistant',
        content: getWelcomeMessage(),
        timestamp: new Date(),
        type: 'welcome'
      };
      setMessages([welcomeMessage]);
    }
  };

  const getWelcomeMessage = () => {
    if (sheetContext) {
      return `Hello! I'm your AI spreadsheet assistant. I can see you're working with **${sheetContext.tabName}**.

I can help you with:
• 📊 **Data Analysis** - Analyze patterns and insights
• ✏️ **Data Manipulation** - Add, update, or modify data
• 🔍 **Smart Queries** - Find specific information
• 📈 **Visualizations** - Create charts and reports
• 🤖 **Automation** - Set up automated workflows

**Current Context:**
- Spreadsheet: ${sheetContext.spreadsheetId}
- Tab: ${sheetContext.tabName}
- Rows: ${sheetContext.rows || 'Unknown'}
- Columns: ${sheetContext.cols || 'Unknown'}

What would you like to do today?`;
    }

    return `Hello! I'm your AI spreadsheet assistant. 

I can help you with:
• 🔗 **Connect Spreadsheets** - Link your Google Sheets
• 📊 **Data Analysis** - Analyze patterns and insights  
• ✏️ **Data Operations** - Add, update, or modify data
• 🔍 **Smart Queries** - Find and filter information
• 📈 **Insights** - Generate reports and visualizations

Connect a spreadsheet to unlock my full potential! How can I help you get started?`;
  };

  const generateQuickActions = () => {
    if (!sheetContext) {
      setQuickActions([
        { icon: Database, label: 'Connect Sheet', action: 'connect' },
        { icon: Lightbulb, label: 'Get Started', action: 'help' }
      ]);
      return;
    }

    setQuickActions([
      { icon: TrendingUp, label: 'Analyze Data', action: 'analyze' },
      { icon: FileText, label: 'Add Row', action: 'add-row' },
      { icon: Code, label: 'Create Formula', action: 'formula' },
      { icon: Database, label: 'Export Data', action: 'export' }
    ]);
  };

  const generateSuggestions = () => {
    if (!sheetContext) {
      setSuggestions([
        "How do I connect my Google Sheets?",
        "What can you help me with?",
        "Show me the features available"
      ]);
      return;
    }

    setSuggestions([
      `Analyze the data in ${sheetContext.tabName}`,
      "Add a new row with sample data",
      "Create a summary of this spreadsheet",
      "Find duplicate entries",
      "Generate a chart from this data"
    ]);
  };

  const handleSend = async (message = inputValue) => {
    const messageText = message?.trim();
    if (!messageText || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Process instruction through service manager
      const result = await serviceManager.processUserInstruction(messageText, sheetContext);
      
      if (result.type === 'action') {
        // Action generated
        const actionMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `I can help you with that! Here's what I understand:

**Action**: ${result.parsedAction?.action}
**Target**: ${result.parsedAction?.tabName || sheetContext?.tabName}

${result.executionResult ? 
  result.executionResult.success ? 
    '✅ **Action completed successfully!**' : 
    `❌ **Action failed**: ${result.executionResult.error}` :
  '⏳ **Ready to execute** - Click the button below to proceed'
}`,
          timestamp: new Date(),
          action: result.normalizedAction || result.parsedAction,
          executionResult: result.executionResult,
          showActionButtons: !result.executionResult
        };
        
        setMessages(prev => [...prev, actionMessage]);
        onActionGenerated?.(result.normalizedAction || result.parsedAction);
        
      } else if (result.type === 'text') {
        // Regular response
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.content,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
      } else {
        // Error or unknown
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.content || 'I encountered an issue processing your request. Please try again.',
          timestamp: new Date(),
          isError: true
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error?.message}

Please check your connection and try again.`,
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    switch (action) {
      case 'analyze':
        handleSend(`Analyze the data in ${sheetContext?.tabName} and provide insights`);
        break;
      case 'add-row':
        handleSend('Add a new row with sample data');
        break;
      case 'formula':
        handleSend('Help me create a formula for calculations');
        break;
      case 'export':
        handleSend('Export this spreadsheet data');
        break;
      case 'connect':
        onSheetContextChange?.('connect');
        break;
      case 'help':
        handleSend('What can you help me with?');
        break;
      default:
        console.log('Unknown quick action:', action);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e?.key === 'Enter' && !e?.shiftKey) {
      e?.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setChatHistory([]);
    initializeChat();
  };

  const renderMessage = (message) => {
    const isUser = message?.role === 'user';
    
    return (
      <div
        key={message?.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser 
                ? 'bg-blue-500 text-white' 
                : message?.isError 
                  ? 'bg-red-500 text-white' 
                  : message?.type === 'welcome'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
            }`}>
              {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
          </div>
          
          {/* Message Content */}
          <div
            className={`px-4 py-3 rounded-lg ${
              isUser
                ? 'bg-blue-500 text-white'
                : message?.isError
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : message?.type === 'welcome'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-gray-100 text-gray-800'
            }`}
          >
            <div className="whitespace-pre-wrap text-sm markdown-content">
              {message?.content}
            </div>
            
            {/* Action Buttons */}
            {message?.showActionButtons && message?.action && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                <button
                  onClick={() => onActionGenerated?.(message?.action)}
                  disabled={!sheetContext}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:bg-gray-300 flex items-center space-x-1"
                >
                  <Play className="h-3 w-3" />
                  <span>Execute</span>
                </button>
                <button
                  onClick={() => {
                    const actionJson = JSON.stringify(message?.action, null, 2);
                    navigator.clipboard?.writeText(actionJson);
                  }}
                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 flex items-center space-x-1"
                >
                  <Code className="h-3 w-3" />
                  <span>Copy</span>
                </button>
              </div>
            )}
            
            <div className="text-xs opacity-75 mt-2">
              {message?.timestamp?.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.action)}
                  disabled={disabled}
                  className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  <Icon className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map(renderMessage)}
        
        {/* Streaming message */}
        {isStreaming && currentStreamingMessage && (
          <div className="flex justify-start mb-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-[85%]">
                <div className="whitespace-pre-wrap text-sm text-gray-800">
                  {currentStreamingMessage}
                  <span className="animate-pulse">|</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading indicator */}
        {isLoading && !isStreaming && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && messages.length <= 1 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">Suggestions:</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={disabled}
                className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 text-gray-600"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white p-4">
        {sheetContext && (
          <div className="mb-2 text-xs text-gray-500 flex items-center space-x-2">
            <Database className="h-3 w-3" />
            <span>Connected to: {sheetContext?.tabName}</span>
          </div>
        )}
        
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e?.target?.value)}
              onKeyPress={handleKeyPress}
              placeholder={sheetContext 
                ? "Ask me to analyze data, add rows, create formulas..." 
                : "Connect a spreadsheet first, then ask me anything!"
              }
              disabled={disabled || isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={1}
              maxLength={2000}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <div className="absolute bottom-1 right-1 text-xs text-gray-400">
              {inputValue.length}/2000
            </div>
          </div>
          
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => handleSend()}
              disabled={disabled || isLoading || !inputValue?.trim()}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </button>
            
            <button
              onClick={clearChat}
              disabled={disabled || isLoading}
              className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              title="Clear chat"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;