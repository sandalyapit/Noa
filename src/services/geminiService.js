import genAI from './geminiClient';

/**
 * Gemini AI Service for Smart Spreadsheet Assistant
 * Handles AI-powered analysis and text generation
 */
class GeminiService {
  constructor() {
    this.model = genAI?.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });

    this.chatHistory = [];
  }

  /**
   * Generates text based on user input
   * @param {string} prompt - The user's input prompt
   * @returns {Promise<string>} The generated text
   */
  async generateText(prompt) {
    try {
      const result = await this.model?.generateContent(prompt);
      const response = await result?.response;
      return response?.text();
    } catch (error) {
      console.error('Error in text generation:', error);
      throw new Error('Failed to generate text response');
    }
  }

  /**
   * Streams text responses in real-time
   * @param {string} prompt - The user's input prompt
   * @param {Function} onChunk - Callback to handle each streamed chunk
   */
  async streamText(prompt, onChunk) {
    try {
      const result = await this.model?.generateContentStream(prompt);

      for await (const chunk of result?.stream) {
        const text = chunk?.text();
        if (text && onChunk) {
          onChunk(text);
        }
      }
    } catch (error) {
      console.error('Error in streaming text generation:', error);
      throw new Error('Failed to stream text response');
    }
  }

  /**
   * Analyzes spreadsheet schema and suggests improvements
   * @param {Object} sheetData - The sheet data with schema
   * @returns {Promise<string>} Analysis and suggestions
   */
  async analyzeSpreadsheetSchema(sheetData) {
    const prompt = `
Analyze this Google Sheets data structure and provide insights:

Spreadsheet: ${sheetData?.sheetName}
Dimensions: ${sheetData?.dimensions?.rows} rows × ${sheetData?.dimensions?.cols} columns
Headers: ${sheetData?.headers?.join(', ')}

Schema Analysis:
${sheetData?.schema?.map(col => 
  `- ${col?.name} (${col?.dataType?.type}, ${col?.stats?.nonEmpty} non-empty values)`
)?.join('\n')}

Sample Data (first few rows):
${sheetData?.sampleValues?.slice(0, 3)?.map(row => row?.join(' | '))?.join('\n')}

Please provide:
1. Data quality assessment
2. Potential data issues or inconsistencies
3. Suggestions for data organization improvements
4. Recommended data validation rules
5. Insights about the data patterns

Keep the response practical and actionable.
`;

    return this.generateText(prompt);
  }

  /**
   * Converts natural language instructions to Apps Script actions
   * @param {string} userInstruction - User's natural language instruction
   * @param {Object} sheetContext - Current sheet context
   * @returns {Promise<Object>} Structured action or text response
   */
  async parseUserInstruction(userInstruction, sheetContext = {}) {
    const tools = [{
      functionDeclarations: [{
        name: 'create_spreadsheet_action',
        description: 'Create a structured action for spreadsheet manipulation',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['updateCell', 'addRow', 'readRange', 'fetchTabData'],
              description: 'The spreadsheet action to perform'
            },
            spreadsheetId: {
              type: 'string',
              description: 'The spreadsheet ID'
            },
            tabName: {
              type: 'string',
              description: 'The tab name'
            },
            range: {
              type: 'string',
              description: 'A1 notation range (for updateCell/readRange)'
            },
            data: {
              type: 'object',
              description: 'Data payload for the action'
            },
            options: {
              type: 'object',
              description: 'Additional options like dryRun'
            }
          },
          required: ['action']
        }
      }]
    }];

    const contextInfo = sheetContext?.spreadsheetId 
      ? `Current spreadsheet: ${sheetContext?.spreadsheetId}, tab: ${sheetContext?.tabName}
Available headers: ${sheetContext?.headers?.join(', ')}`
      : 'No spreadsheet context available';

    const prompt = `
You are a spreadsheet assistant. Convert this user instruction into a structured action:

User instruction: "${userInstruction}"

Context: ${contextInfo}

Instructions:
- If the user wants to read data, use readRange or fetchTabData
- If the user wants to add data, use addRow with appropriate data structure
- If the user wants to update specific cells, use updateCell with A1 notation
- For complex requests, break them down or ask for clarification
- Always suggest using dryRun: true for destructive operations first

If you cannot create a specific action, provide helpful guidance instead.
`;

    try {
      const model = genAI?.getGenerativeModel({
        model: 'gemini-1.5-pro',
        tools
      });

      const result = await model?.generateContent(prompt);
      const response = await result?.response;
      const content = response?.candidates?.[0]?.content;

      if (content?.parts?.[0]?.functionCall) {
        const { name, args } = content?.parts?.[0]?.functionCall;
        return { 
          type: 'action',
          functionName: name, 
          arguments: args 
        };
      }

      return { 
        type: 'text',
        content: content?.parts?.[0]?.text || 'Could not process the instruction'
      };
    } catch (error) {
      console.error('Error parsing user instruction:', error);
      return {
        type: 'text',
        content: 'Sorry, I couldn\'t understand that instruction. Please try rephrasing it.'
      };
    }
  }

  /**
   * Manages a chat session with history
   * @param {string} prompt - The user's input prompt
   * @param {Array} history - The chat history
   * @returns {Promise<{response: string, updatedHistory: Array}>} Response and updated history
   */
  async chatWithHistory(prompt, history = []) {
    try {
      const chat = this.model?.startChat({ history });
      const result = await chat?.sendMessage(prompt);
      const response = await result?.response;
      const text = response?.text();

      const updatedHistory = [
        ...history,
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'model', parts: [{ text }] }
      ];

      return { response: text, updatedHistory };
    } catch (error) {
      console.error('Error in chat session:', error);
      throw new Error('Failed to process chat message');
    }
  }

  /**
   * Generates data transformation suggestions
   * @param {Object} sourceData - Source spreadsheet data
   * @param {string} targetDescription - Description of desired transformation
   * @returns {Promise<string>} Transformation suggestions
   */
  async suggestDataTransformation(sourceData, targetDescription) {
    const prompt = `
I have this spreadsheet data:
Headers: ${sourceData?.headers?.join(', ')}
Sample data: ${sourceData?.sampleValues?.slice(0, 5)?.map(row => row?.join(' | '))?.join('\n')}

I want to: ${targetDescription}

Please suggest:
1. Step-by-step transformation process
2. Any data cleaning needed
3. Potential issues to watch out for
4. Alternative approaches if applicable

Provide practical, actionable advice.
`;

    return this.generateText(prompt);
  }

  /**
   * Validates and cleans text input for spreadsheet safety
   * @param {string} text - Input text to clean
   * @returns {string} Cleaned text safe for spreadsheet
   */
  sanitizeForSpreadsheet(text) {
    if (!text) return '';
    
    // Convert to string and trim
    let cleaned = String(text)?.trim();
    
    // Prevent formula injection by escaping leading special characters
    if (/^[=+\-@]/?.test(cleaned)) {
      cleaned = "'" + cleaned;
    }
    
    // Limit length to prevent extremely long entries
    if (cleaned?.length > 1000) {
      cleaned = cleaned?.substring(0, 997) + '...';
    }
    
    return cleaned;
  }

  /**
   * Resets chat history
   */
  clearChatHistory() {
    this.chatHistory = [];
  }

  /**
   * Gets current chat history
   * @returns {Array} Current chat history
   */
  getChatHistory() {
    return [...this.chatHistory];
  }
}

// Create singleton instance
const geminiService = new GeminiService();

export default geminiService;