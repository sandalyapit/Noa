import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the Google Generative AI at the package level
const mockModel = {
  generateContent: vi.fn(),
  generateContentStream: vi.fn(),
  startChat: vi.fn()
}

const mockGenAI = {
  getGenerativeModel: vi.fn(() => mockModel)
}

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => mockGenAI)
}))

// Mock the geminiClient to return our mocked genAI
vi.mock('../../services/geminiClient.js', () => ({
  default: mockGenAI
}))

describe('GeminiService', () => {
  let geminiService

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()
    
    // Re-import the service after mocking
    const { default: GeminiServiceModule } = await import('../../services/geminiService.js')
    geminiService = GeminiServiceModule
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor initializes properly', () => {
    it('should initialize service with model and empty chat history', () => {
      expect(geminiService.model).toBeDefined()
      expect(geminiService.chatHistory).toEqual([])
      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        }
      })
    })

    it('should be a singleton instance', () => {
      // The service should be instantiated as singleton
      expect(geminiService.constructor.name).toBe('GeminiService')
      expect(Array.isArray(geminiService.chatHistory)).toBe(true)
    })
  })

  describe('Generate text successfully', () => {
    it('should generate text from prompt', async () => {
      const mockResponse = {
        response: {
          text: () => 'Generated text response'
        }
      }

      mockModel.generateContent.mockResolvedValue(mockResponse)

      const result = await geminiService.generateText('Test prompt')

      expect(mockModel.generateContent).toHaveBeenCalledWith('Test prompt')
      expect(result).toBe('Generated text response')
    })

    it('should handle undefined response gracefully', async () => {
      const mockResponse = {
        response: {
          text: () => undefined
        }
      }

      mockModel.generateContent.mockResolvedValue(mockResponse)

      const result = await geminiService.generateText('Test prompt')

      expect(result).toBeUndefined()
    })
  })

  describe('Stream text with callback', () => {
    it('should stream text with callback function', async () => {
      const mockChunks = [
        { text: () => 'Hello ' },
        { text: () => 'world!' },
        { text: () => null }, // Should be ignored
      ]

      // Create proper async iterator
      const createAsyncIterator = (items) => ({
        [Symbol.asyncIterator]: async function* () {
          for (const item of items) {
            yield item
          }
        }
      })

      const mockStream = {
        stream: createAsyncIterator(mockChunks)
      }

      mockModel.generateContentStream.mockResolvedValue(mockStream)

      const onChunkCallback = vi.fn()
      await geminiService.streamText('Test prompt', onChunkCallback)

      expect(mockModel.generateContentStream).toHaveBeenCalledWith('Test prompt')
      expect(onChunkCallback).toHaveBeenCalledWith('Hello ')
      expect(onChunkCallback).toHaveBeenCalledWith('world!')
      expect(onChunkCallback).toHaveBeenCalledTimes(2) // null chunk should be ignored
    })

    it('should handle missing callback gracefully', async () => {
      const mockChunks = [
        { text: () => 'Hello ' }
      ]

      // Create proper async iterator
      const createAsyncIterator = (items) => ({
        [Symbol.asyncIterator]: async function* () {
          for (const item of items) {
            yield item
          }
        }
      })

      const mockStream = {
        stream: createAsyncIterator(mockChunks)
      }

      mockModel.generateContentStream.mockResolvedValue(mockStream)

      // Should not throw when callback is missing
      await expect(geminiService.streamText('Test prompt')).resolves.toBeUndefined()
    })
  })

  describe('Parse user instruction with tools', () => {
    it('should parse instruction and return function call result', async () => {
      const mockResponse = {
        response: {
          candidates: [{
            content: {
              parts: [{
                functionCall: {
                  name: 'create_spreadsheet_action',
                  args: {
                    action: 'addRow',
                    spreadsheetId: 'test-id',
                    tabName: 'Sheet1',
                    data: { name: 'Test', value: 123 }
                  }
                }
              }]
            }
          }]
        }
      }

      mockModel.generateContent.mockResolvedValue(mockResponse)

      const sheetContext = {
        spreadsheetId: 'test-id',
        tabName: 'Sheet1',
        headers: ['name', 'value']
      }

      const result = await geminiService.parseUserInstruction(
        'Add a new row with name Test and value 123',
        sheetContext
      )

      expect(result).toEqual({
        type: 'action',
        functionName: 'create_spreadsheet_action',
        arguments: {
          action: 'addRow',
          spreadsheetId: 'test-id',
          tabName: 'Sheet1',
          data: { name: 'Test', value: 123 }
        }
      })

      // Verify correct model was used (should be called twice: once in constructor, once in parseUserInstruction)
      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-pro',
        tools: expect.any(Array)
      })
    })

    it('should return text response when no function call', async () => {
      const mockResponse = {
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'I need more information to help you with that request.'
              }]
            }
          }]
        }
      }

      mockModel.generateContent.mockResolvedValue(mockResponse)

      const result = await geminiService.parseUserInstruction('Unclear request')

      expect(result).toEqual({
        type: 'text',
        content: 'I need more information to help you with that request.'
      })
    })

    it('should handle empty content gracefully', async () => {
      const mockResponse = {
        response: {
          candidates: [{
            content: {
              parts: [{}]
            }
          }]
        }
      }

      mockModel.generateContent.mockResolvedValue(mockResponse)

      const result = await geminiService.parseUserInstruction('Test')

      expect(result).toEqual({
        type: 'text',
        content: 'Could not process the instruction'
      })
    })
  })

  describe('Handle API errors gracefully', () => {
    it('should handle generateText API errors', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('API quota exceeded'))

      await expect(geminiService.generateText('Test'))
        .rejects
        .toThrow('Failed to generate text response')
    })

    it('should handle streamText API errors', async () => {
      mockModel.generateContentStream.mockRejectedValue(new Error('Network error'))

      await expect(geminiService.streamText('Test', vi.fn()))
        .rejects
        .toThrow('Failed to stream text response')
    })

    it('should handle parseUserInstruction API errors', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('API error'))

      const result = await geminiService.parseUserInstruction('Test')

      expect(result).toEqual({
        type: 'text',
        content: 'Sorry, I couldn\'t understand that instruction. Please try rephrasing it.'
      })
    })

    it('should handle chatWithHistory API errors', async () => {
      const mockChat = {
        sendMessage: vi.fn().mockRejectedValue(new Error('Chat error'))
      }

      mockModel.startChat.mockReturnValue(mockChat)

      await expect(geminiService.chatWithHistory('Test'))
        .rejects
        .toThrow('Failed to process chat message')
    })
  })

  describe('Sanitize spreadsheet input', () => {
    it('should return empty string for null/undefined input', () => {
      expect(geminiService.sanitizeForSpreadsheet(null)).toBe('')
      expect(geminiService.sanitizeForSpreadsheet(undefined)).toBe('')
      expect(geminiService.sanitizeForSpreadsheet('')).toBe('')
    })

    it('should escape formula injection characters', () => {
      expect(geminiService.sanitizeForSpreadsheet('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
      expect(geminiService.sanitizeForSpreadsheet('+123')).toBe("'+123")
      expect(geminiService.sanitizeForSpreadsheet('-456')).toBe("'-456")
      expect(geminiService.sanitizeForSpreadsheet('@mention')).toBe("'@mention")
    })

    it('should trim whitespace', () => {
      expect(geminiService.sanitizeForSpreadsheet('  hello world  ')).toBe('hello world')
    })

    it('should limit length to 1000 characters', () => {
      const longText = 'A'.repeat(1500)
      const result = geminiService.sanitizeForSpreadsheet(longText)
      
      expect(result).toHaveLength(1000)
      expect(result).toBe('A'.repeat(997) + '...')
    })

    it('should handle normal text unchanged', () => {
      expect(geminiService.sanitizeForSpreadsheet('Normal text')).toBe('Normal text')
      expect(geminiService.sanitizeForSpreadsheet('123')).toBe('123')
    })
  })

  describe('Chat with history works', () => {
    it('should maintain chat history and return response', async () => {
      const mockChat = {
        sendMessage: vi.fn().mockResolvedValue({
          response: {
            text: () => 'Hello! How can I help you?'
          }
        })
      }

      mockModel.startChat.mockReturnValue(mockChat)

      const initialHistory = [
        { role: 'user', parts: [{ text: 'Previous message' }] }
      ]

      const result = await geminiService.chatWithHistory('Hello', initialHistory)

      expect(mockModel.startChat).toHaveBeenCalledWith({ history: initialHistory })
      expect(mockChat.sendMessage).toHaveBeenCalledWith('Hello')
      expect(result).toEqual({
        response: 'Hello! How can I help you?',
        updatedHistory: [
          { role: 'user', parts: [{ text: 'Previous message' }] },
          { role: 'user', parts: [{ text: 'Hello' }] },
          { role: 'model', parts: [{ text: 'Hello! How can I help you?' }] }
        ]
      })
    })

    it('should work with empty history', async () => {
      const mockChat = {
        sendMessage: vi.fn().mockResolvedValue({
          response: {
            text: () => 'Welcome!'
          }
        })
      }

      mockModel.startChat.mockReturnValue(mockChat)

      const result = await geminiService.chatWithHistory('First message')

      expect(mockModel.startChat).toHaveBeenCalledWith({ history: [] })
      expect(result.updatedHistory).toHaveLength(2)
    })
  })

  describe('Additional utility methods', () => {
    it('should analyze spreadsheet schema', async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => 'Schema analysis results'
        }
      })

      const sheetData = {
        sheetName: 'Test Sheet',
        dimensions: { rows: 10, cols: 3 },
        headers: ['Name', 'Age', 'City'],
        schema: [
          { name: 'Name', dataType: { type: 'string' }, stats: { nonEmpty: 8 } }
        ],
        sampleValues: [['John', '25', 'NYC'], ['Jane', '30', 'LA']]
      }

      const result = await geminiService.analyzeSpreadsheetSchema(sheetData)

      expect(result).toBe('Schema analysis results')
      
      const callArgs = mockModel.generateContent.mock.calls[0][0]
      expect(callArgs).toContain('Test Sheet')
      expect(callArgs).toContain('10 rows × 3 columns')
      expect(callArgs).toContain('Name, Age, City')
    })

    it('should suggest data transformation', async () => {
      mockModel.generateContent.mockResolvedValue({
        response: {
          text: () => 'Transformation suggestions'
        }
      })

      const sourceData = {
        headers: ['Name', 'Sales'],
        sampleValues: [['John', '1000'], ['Jane', '1500']]
      }

      const result = await geminiService.suggestDataTransformation(
        sourceData,
        'Convert sales to numbers and add tax column'
      )

      expect(result).toBe('Transformation suggestions')
      
      const callArgs = mockModel.generateContent.mock.calls[0][0]
      expect(callArgs).toContain('Name, Sales')
      expect(callArgs).toContain('Convert sales to numbers and add tax column')
    })

    it('should clear chat history', () => {
      geminiService.chatHistory = [
        { role: 'user', parts: [{ text: 'test' }] }
      ]

      geminiService.clearChatHistory()

      expect(geminiService.chatHistory).toEqual([])
    })

    it('should get chat history copy', () => {
      const testHistory = [
        { role: 'user', parts: [{ text: 'test' }] }
      ]
      
      geminiService.chatHistory = testHistory

      const history = geminiService.getChatHistory()

      expect(history).toEqual(testHistory)
      expect(history).not.toBe(testHistory) // Should be a copy
    })
  })
})