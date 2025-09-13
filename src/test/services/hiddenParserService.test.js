import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import HiddenParserService from '../../services/hiddenParserService'

describe('HiddenParserService', () => {
  let service
  const mockUrl = 'https://test-parser.vercel.app/api/normalize'

  beforeEach(() => {
    service = new HiddenParserService(mockUrl)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with URL', () => {
      expect(service.url).toBe(mockUrl)
    })

    it('should use default URL if none provided', () => {
      const defaultService = new HiddenParserService()
      expect(defaultService.url).toBe('https://your-parser.vercel.app/api/normalize')
    })
  })

  describe('normalizeOutput', () => {
    it('should normalize malformed LLM output', async () => {
      const malformedOutput = `
        I want to add a row with:
        - Product: iPhone 15
        - Revenue: $1,200
        - Quantity: 1 unit
        - Region: United States
      `

      const mockResponse = {
        success: true,
        normalized: {
          action: 'addRow',
          data: {
            Product: 'iPhone 15',
            Revenue: 1200,
            Quantity: 1,
            Region: 'US'
          },
          confidence: 0.85
        }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.normalizeOutput(malformedOutput, {
        expectedAction: 'addRow',
        headers: ['Product', 'Revenue', 'Quantity', 'Region']
      })

      expect(global.fetch).toHaveBeenCalledWith(mockUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: malformedOutput,
          context: {
            expectedAction: 'addRow',
            headers: ['Product', 'Revenue', 'Quantity', 'Region']
          }
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle JSON-like but invalid output', async () => {
      const malformedJson = `{
        "action": "addRow",
        "data": {
          "Product": "iPhone 15",
          "Revenue": "$1,200", // This has a comment which makes it invalid JSON
          "Quantity": 1,
        } // trailing comma
      }`

      const mockResponse = {
        success: true,
        normalized: {
          action: 'addRow',
          data: {
            Product: 'iPhone 15',
            Revenue: 1200,
            Quantity: 1
          }
        }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.normalizeOutput(malformedJson)

      expect(result).toEqual(mockResponse)
    })

    it('should handle parser service errors', async () => {
      const malformedOutput = 'Some random text'

      const mockErrorResponse = {
        success: false,
        error: 'Unable to extract structured data',
        details: 'No recognizable action pattern found'
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse
      })

      const result = await service.normalizeOutput(malformedOutput)

      expect(result).toEqual(mockErrorResponse)
    })

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network timeout'))

      const result = await service.normalizeOutput('test input')

      expect(result).toEqual({
        success: false,
        error: 'Network timeout'
      })
    })

    it('should handle HTTP errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const result = await service.normalizeOutput('test input')

      expect(result).toEqual({
        success: false,
        error: 'HTTP 500: Internal Server Error'
      })
    })
  })

  describe('validateAndNormalize', () => {
    it('should return valid JSON as-is', async () => {
      const validJson = {
        action: 'addRow',
        data: {
          Product: 'iPhone',
          Revenue: 1000
        }
      }

      const result = await service.validateAndNormalize(JSON.stringify(validJson))

      expect(result).toEqual({
        success: true,
        data: validJson,
        wasNormalized: false
      })
    })

    it('should normalize invalid JSON', async () => {
      const invalidJson = '{"action": "addRow", "data": {"Product": "iPhone",}}'

      const mockResponse = {
        success: true,
        normalized: {
          action: 'addRow',
          data: {
            Product: 'iPhone'
          }
        }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.validateAndNormalize(invalidJson)

      expect(result).toEqual({
        success: true,
        data: mockResponse.normalized,
        wasNormalized: true
      })
    })

    it('should handle normalization failures', async () => {
      const invalidInput = 'completely random text'

      const mockResponse = {
        success: false,
        error: 'Unable to normalize'
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.validateAndNormalize(invalidInput)

      expect(result).toEqual({
        success: false,
        error: 'Unable to normalize',
        wasNormalized: true
      })
    })
  })

  describe('isValidJson', () => {
    it('should identify valid JSON', () => {
      const validJson = '{"action": "addRow", "data": {}}'
      expect(service.isValidJson(validJson)).toBe(true)
    })

    it('should identify invalid JSON', () => {
      const invalidJson = '{"action": "addRow", "data": {,}}'
      expect(service.isValidJson(invalidJson)).toBe(false)
    })

    it('should handle non-string input', () => {
      expect(service.isValidJson(null)).toBe(false)
      expect(service.isValidJson(undefined)).toBe(false)
      expect(service.isValidJson(123)).toBe(false)
    })
  })

  describe('extractActionFromText', () => {
    it('should extract action from natural language', () => {
      const text = 'I want to add a new row with product iPhone and revenue 1000'
      const action = service.extractActionFromText(text)
      expect(action).toBe('addRow')
    })

    it('should extract update action', () => {
      const text = 'Please update cell B5 to have value "New Product"'
      const action = service.extractActionFromText(text)
      expect(action).toBe('updateCell')
    })

    it('should extract read action', () => {
      const text = 'Show me the data in range A1:C10'
      const action = service.extractActionFromText(text)
      expect(action).toBe('readRange')
    })

    it('should return null for unclear text', () => {
      const text = 'Hello, how are you?'
      const action = service.extractActionFromText(text)
      expect(action).toBeNull()
    })
  })

  describe('integration with dual AI model approach', () => {
    it('should work as fallback for main AI model', async () => {
      // Simulate main AI model producing malformed output
      const mainAiOutput = `
        Sure! I'll add that row for you.
        
        Action: addRow
        Product: iPhone 15 Pro
        Revenue: $1,299.99
        Quantity: 2 units
        Region: North America
      `

      const mockNormalizedResponse = {
        success: true,
        normalized: {
          action: 'addRow',
          data: {
            Product: 'iPhone 15 Pro',
            Revenue: 1299.99,
            Quantity: 2,
            Region: 'US'
          },
          confidence: 0.9
        }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNormalizedResponse
      })

      const result = await service.normalizeOutput(mainAiOutput, {
        expectedAction: 'addRow',
        headers: ['Product', 'Revenue', 'Quantity', 'Region']
      })

      expect(result.success).toBe(true)
      expect(result.normalized.action).toBe('addRow')
      expect(result.normalized.data.Product).toBe('iPhone 15 Pro')
      expect(result.normalized.data.Revenue).toBe(1299.99)
    })

    it('should prevent hallucinations by validating against schema', async () => {
      const hallucinatedOutput = `{
        "action": "addRow",
        "data": {
          "Product": "iPhone 15",
          "Revenue": 1200,
          "NonExistentColumn": "hallucinated value",
          "AnotherFakeColumn": "more hallucination"
        }
      }`

      const mockResponse = {
        success: true,
        normalized: {
          action: 'addRow',
          data: {
            Product: 'iPhone 15',
            Revenue: 1200
          }
        },
        warnings: [
          'Removed unknown column: NonExistentColumn',
          'Removed unknown column: AnotherFakeColumn'
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.normalizeOutput(hallucinatedOutput, {
        headers: ['Product', 'Revenue', 'Quantity', 'Region']
      })

      expect(result.success).toBe(true)
      expect(result.normalized.data).not.toHaveProperty('NonExistentColumn')
      expect(result.normalized.data).not.toHaveProperty('AnotherFakeColumn')
      expect(result.warnings).toContain('Removed unknown column: NonExistentColumn')
    })
  })
})