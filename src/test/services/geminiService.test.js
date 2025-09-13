import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import GeminiService from '../../services/geminiService'

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn(),
      startChat: vi.fn().mockReturnValue({
        sendMessage: vi.fn()
      })
    })
  }))
}))

describe('GeminiService', () => {
  let service
  let mockModel

  beforeEach(() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    const mockGenAI = new GoogleGenerativeAI()
    mockModel = mockGenAI.getGenerativeModel()
    
    service = new GeminiService('test-api-key')
    service.genAI = mockGenAI
    service.model = mockModel
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(service.apiKey).toBe('test-api-key')
    })

    it('should throw error if API key is missing', () => {
      expect(() => new GeminiService()).toThrow('Gemini API key is required')
    })
  })

  describe('parseUserInstruction', () => {
    it('should parse simple add row instruction', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            action: 'addRow',
            data: {
              Product: 'iPhone 15',
              Revenue: 1200,
              Quantity: 1,
              Region: 'US'
            },
            confidence: 0.9
          })
        }
      }

      mockModel.generateContent.mockResolvedValueOnce(mockResponse)

      const context = {
        spreadsheetId: 'test-id',
        tabName: 'Sales Data',
        headers: ['Product', 'Revenue', 'Quantity', 'Region'],
        sampleData: [
          ['iPhone 14', 1000, 2, 'US'],
          ['iPad Pro', 800, 1, 'EU']
        ]
      }

      const result = await service.parseUserInstruction(
        'Add a new row with iPhone 15, revenue 1200, quantity 1, region US',
        context
      )

      expect(result).toEqual({
        action: 'addRow',
        data: {
          Product: 'iPhone 15',
          Revenue: 1200,
          Quantity: 1,
          Region: 'US'
        },
        confidence: 0.9
      })
    })

    it('should parse update cell instruction', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            action: 'updateCell',
            range: 'B2',
            data: { value: 'iPhone 15 Pro' },
            confidence: 0.85
          })
        }
      }

      mockModel.generateContent.mockResolvedValueOnce(mockResponse)

      const context = {
        spreadsheetId: 'test-id',
        tabName: 'Sales Data',
        headers: ['Product', 'Revenue', 'Quantity', 'Region'],
        sampleData: [
          ['iPhone 14', 1000, 2, 'US'],
          ['iPad Pro', 800, 1, 'EU']
        ]
      }

      const result = await service.parseUserInstruction(
        'Change the product in row 2 to iPhone 15 Pro',
        context
      )

      expect(result).toEqual({
        action: 'updateCell',
        range: 'B2',
        data: { value: 'iPhone 15 Pro' },
        confidence: 0.85
      })
    })

    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        response: {
          text: () => 'This is not valid JSON'
        }
      }

      mockModel.generateContent.mockResolvedValueOnce(mockResponse)

      const context = {
        spreadsheetId: 'test-id',
        tabName: 'Sales Data',
        headers: ['Product', 'Revenue'],
        sampleData: []
      }

      const result = await service.parseUserInstruction('Add a row', context)

      expect(result).toEqual({
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: 'This is not valid JSON'
      })
    })

    it('should handle API errors', async () => {
      mockModel.generateContent.mockRejectedValueOnce(new Error('API quota exceeded'))

      const context = {
        spreadsheetId: 'test-id',
        tabName: 'Sales Data',
        headers: ['Product'],
        sampleData: []
      }

      const result = await service.parseUserInstruction('Add a row', context)

      expect(result).toEqual({
        success: false,
        error: 'API quota exceeded'
      })
    })

    it('should include context in prompt', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({ action: 'addRow', data: {} })
        }
      }

      mockModel.generateContent.mockResolvedValueOnce(mockResponse)

      const context = {
        spreadsheetId: 'test-id',
        tabName: 'Sales Data',
        headers: ['Product', 'Revenue'],
        sampleData: [['iPhone', 1000]]
      }

      await service.parseUserInstruction('Add a new product', context)

      const callArgs = mockModel.generateContent.mock.calls[0][0]
      expect(callArgs).toContain('Sales Data')
      expect(callArgs).toContain('Product')
      expect(callArgs).toContain('Revenue')
      expect(callArgs).toContain('iPhone')
    })
  })

  describe('generateSuggestions', () => {
    it('should generate contextual suggestions', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            suggestions: [
              'Add a new sales record',
              'Update the revenue for iPhone',
              'Calculate total revenue',
              'Filter data by region'
            ]
          })
        }
      }

      mockModel.generateContent.mockResolvedValueOnce(mockResponse)

      const context = {
        spreadsheetId: 'test-id',
        tabName: 'Sales Data',
        headers: ['Product', 'Revenue', 'Region'],
        sampleData: [
          ['iPhone', 1000, 'US'],
          ['iPad', 800, 'EU']
        ]
      }

      const result = await service.generateSuggestions(context)

      expect(result).toEqual({
        suggestions: [
          'Add a new sales record',
          'Update the revenue for iPhone',
          'Calculate total revenue',
          'Filter data by region'
        ]
      })
    })

    it('should handle empty context gracefully', async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            suggestions: [
              'Connect a spreadsheet to get started',
              'Upload data to analyze',
              'Create a new spreadsheet'
            ]
          })
        }
      }

      mockModel.generateContent.mockResolvedValueOnce(mockResponse)

      const result = await service.generateSuggestions({})

      expect(result.suggestions).toHaveLength(3)
    })
  })

  describe('startChat', () => {
    it('should initialize chat session with context', async () => {
      const mockChat = {
        sendMessage: vi.fn().mockResolvedValue({
          response: {
            text: () => 'Hello! I can help you with your spreadsheet.'
          }
        })
      }

      mockModel.startChat.mockReturnValue(mockChat)

      const context = {
        spreadsheetId: 'test-id',
        tabName: 'Sales Data',
        headers: ['Product', 'Revenue']
      }

      const chat = service.startChat(context)
      const response = await chat.sendMessage('Hello')

      expect(mockModel.startChat).toHaveBeenCalledWith({
        history: [],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      })

      expect(response.response.text()).toBe('Hello! I can help you with your spreadsheet.')
    })
  })

  describe('validateAction', () => {
    it('should validate addRow action', () => {
      const action = {
        action: 'addRow',
        data: {
          Product: 'iPhone',
          Revenue: 1000
        }
      }

      const headers = ['Product', 'Revenue', 'Quantity']
      const result = service.validateAction(action, headers)

      expect(result.valid).toBe(true)
      expect(result.warnings).toContain('Missing data for column: Quantity')
    })

    it('should validate updateCell action', () => {
      const action = {
        action: 'updateCell',
        range: 'B5',
        data: { value: 'New Value' }
      }

      const result = service.validateAction(action, ['Product', 'Revenue'])

      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('should reject invalid actions', () => {
      const action = {
        action: 'deleteSheet'
      }

      const result = service.validateAction(action, ['Product'])

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Unsupported action: deleteSheet')
    })

    it('should validate range format', () => {
      const action = {
        action: 'updateCell',
        range: 'invalid-range',
        data: { value: 'test' }
      }

      const result = service.validateAction(action, ['Product'])

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid range format: invalid-range')
    })
  })
})