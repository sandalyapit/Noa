import React from 'react';
import AIAssistantChat from '../../../components/AIAssistantChat';
import AppsScriptService from '../../../services/appsScriptService';

/**
 * AI Assistant Section for Connect Spreadsheet Page
 * Integrates AI chat with spreadsheet operations
 */
const AIAssistantSection = ({ 
  selectedSheet = null, 
  appsScriptUrl = null,
  onOperationComplete = null,
  disabled = false 
}) => {
  const service = appsScriptUrl ? new AppsScriptService(appsScriptUrl) : null;

  const handleActionGenerated = async (action) => {
    if (!service || !selectedSheet || !action) {
      console.error('Missing required dependencies for action execution');
      return;
    }

    try {
      let response;
      
      switch (action?.action) {
        case 'updateCell':
          response = await service?.updateCell(
            action?.spreadsheetId || selectedSheet?.spreadsheetId,
            action?.tabName || selectedSheet?.tabName,
            action?.range,
            action?.data?.value,
            action?.options
          );
          break;
          
        case 'addRow':
          response = await service?.addRow(
            action?.spreadsheetId || selectedSheet?.spreadsheetId,
            action?.tabName || selectedSheet?.tabName,
            action?.data,
            action?.options
          );
          break;
          
        case 'readRange':
          response = await service?.readRange(
            action?.spreadsheetId || selectedSheet?.spreadsheetId,
            action?.tabName || selectedSheet?.tabName,
            action?.range
          );
          break;
          
        case 'fetchTabData':
          response = await service?.fetchTabData(
            action?.spreadsheetId || selectedSheet?.spreadsheetId,
            action?.tabName || selectedSheet?.tabName,
            action?.options
          );
          break;
          
        default:
          console.error('Unsupported action type:', action?.action);
          return;
      }

      if (response?.success) {
        onOperationComplete?.({
          type: 'success',
          action: action?.action,
          result: response,
          message: `Successfully executed ${action?.action}`
        });
      } else {
        onOperationComplete?.({
          type: 'error',
          action: action?.action,
          result: response,
          message: `Failed to execute ${action?.action}: ${response?.error || 'Unknown error'}`
        });
      }
      
    } catch (error) {
      console.error('Action execution error:', error);
      onOperationComplete?.({
        type: 'error',
        action: action?.action,
        error,
        message: `Error executing ${action?.action}: ${error?.message}`
      });
    }
  };

  return (
    <div className="h-full">
      <AIAssistantChat
        sheetContext={selectedSheet}
        onActionGenerated={handleActionGenerated}
        disabled={disabled}
        className="h-full"
      />
    </div>
  );
};

export default AIAssistantSection;