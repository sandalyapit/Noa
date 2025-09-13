import React, { useState, useRef, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { Send, Bot, User, Loader2, RefreshCw } from 'lucide-react';
import geminiService from '../services/geminiService';

/**
 * AI Assistant Chat Interface
 * Provides conversational AI assistance for spreadsheet operations
 */
const AIAssistantChat = ({ 
  sheetContext = null, 
  onActionGenerated = null,
  onActionExecuted = null,
  appsScriptService = null,
  disabled = false,
  className = ''
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages?.length === 0) {
      setMessages([{
        id: 1,
        role: 'assistant',
        content: `Hello! I'm your AI spreadsheet assistant. I can help you with:

• Analyzing spreadsheet data and schemas
• Converting natural language to spreadsheet actions
• Suggesting data transformations
• Providing insights about your data

${sheetContext ? `Currently working with: ${sheetContext?.tabName}` : 'Connect a spreadsheet to get started!'}

How can I help you today?`,
        timestamp: new Date()
      }]);
    }
  }, [sheetContext]);

  const handleSend = async () => {
    const message = inputValue?.trim();
    if (!message || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Try to parse as an instruction first
      const parseResult = await geminiService?.parseUserInstruction(message, sheetContext);
      
      if (parseResult?.type === 'action') {
        // If it's an action, show the action and ask for confirmation
        const actionMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `I can help you with that! Here's what I understand:

**Action**: ${parseResult?.arguments?.action}
**Details**: ${JSON.stringify(parseResult?.arguments, null, 2)}

Would you like me to execute this action? (You can also modify the details if needed)`,
          timestamp: new Date(),
          action: parseResult?.arguments,
          showActionButtons: true
        };
        
        setMessages(prev => [...prev, actionMessage]);
        
        // Notify parent about generated action
        onActionGenerated?.(parseResult?.arguments);
        
      } else {
        // Regular chat response
        const { response, updatedHistory } = await geminiService?.chatWithHistory(
          message, 
          chatHistory
        );
        
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setChatHistory(updatedHistory);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `I apologize, but I encountered an error processing your request: ${error?.message}

Please try rephrasing your question or check your internet connection.`,
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
    geminiService?.clearChatHistory();
  };

  const renderMessage = (message) => {
    const isUser = message?.role === 'user';
    
    return (
      <div
        key={message?.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser 
                ? 'bg-blue-500 text-white' 
                : message?.isError 
                  ? 'bg-red-500 text-white' :'bg-gray-200 text-gray-600'
            }`}>
              {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
          </div>
          
          {/* Message Content */}
          <div
            className={`px-4 py-2 rounded-lg ${
              isUser
                ? 'bg-blue-500 text-white'
                : message?.isError
                  ? 'bg-red-50 border border-red-200 text-red-800' :'bg-gray-100 text-gray-800'
            }`}
          >
            <div className="whitespace-pre-wrap text-sm">
              {message?.content}
            </div>
            
            {/* Action Buttons */}
            {message?.showActionButtons && message?.action && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => onActionGenerated?.(message?.action)}
                  disabled={!sheetContext}
                >
                  Execute Action
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const actionJson = JSON.stringify(message?.action, null, 2);
                    navigator.clipboard?.writeText(actionJson);
                  }}
                >
                  Copy Action
                </Button>
              </div>
            )}
            
            <div className="text-xs opacity-75 mt-1">
              {message?.timestamp?.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-blue-500" />
          <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
        </div>
        
        <Button
          size="sm"
          variant="outline"
          onClick={clearChat}
          disabled={disabled || isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map(renderMessage)}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
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
      {/* Input */}
      <div className="border-t bg-white p-4">
        {sheetContext && (
          <div className="mb-2 text-xs text-gray-500">
            Connected to: {sheetContext?.tabName} ({sheetContext?.spreadsheetId})
          </div>
        )}
        
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e?.target?.value)}
            onKeyPress={handleKeyPress}
            placeholder={sheetContext 
              ? "Ask me to analyze data, add rows, update cells..." :"Connect a spreadsheet first, then ask me anything!"
            }
            disabled={disabled || isLoading}
            className="flex-1"
            maxLength={1000}
          />
          
          <Button
            onClick={handleSend}
            disabled={disabled || isLoading || !inputValue?.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantChat;