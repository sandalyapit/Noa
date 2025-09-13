import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import GeminiService from '../../services/geminiService.js'
import { HiddenParserService } from '../../services/hiddenParserService'
import { AppsScriptService } from '../../services/appsScriptService'

// Integration test for the dual AI model approach
describe('Dual AI Model Integration', () => {
  let geminiService
  let hiddenParserService
  let appsScriptService

  const mockContext = {
    spreadsheetId: 'test-spreadsheet-id',
    tabName: 'Sales Data',
    headers: ['Product', 'Revenue', 'Quantity', 'Region'],
    sampleData: [
      ['iPhone', 1000, 2, 'US'],
      ['iPad', 800, 1, 'EU']
    ]
  }

  beforeEach(() => {
    geminiService = new GeminiService('test-api-key')
    hiddenParserService = new HiddenParserService('https://test-parser.vercel.app/api/normalize')
    appsScriptService = new AppsScriptService('https://script.google.com/test', 'test-token')

    // Mock the underlying services
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Main AI Model Success Path', () => {
    it('should process user input successfully with main AI model', async () => {
      // Mock successful main AI response
      const mockGeminiResponse = {
        action: 'addRow',
        data: {
          Product: 'iPhone 15',
          Revenue: 1200,
          Quantity: 1,
          Region: 'US'
        },
        confidence: 0.9
      }

      geminiService.parseUserInstruction = vi.fn().mockResolvedValue(mockGeminiResponse)
      appsScriptService.addRow = vi.fn().mockResolvedValue({
        success: true,
        dryRun: true,
        preview: ['iPhone 15', 1200, 1, 'US']
      })

      // Simulate the complete flow
      const userInput = 'Add iPhone 15 with revenue 1200, quantity 1, region US'
      
      // Step 1: Main AI processes the input
      const aiResult = await geminiService.parseUserInstruction(userInput, mockContext)
      
      expect(aiResult.action).toBe('addRow')
      expect(aiResult.confidence).toBe(0.9)
      
      // Step 2: Execute the action (dry run first)
      const dryRunResult = await appsScriptService.addRow(
        mockContext.spreadsheetId,
        mockContext.tabName,
        aiResult.data,
        { dryRun: true, author: 'test@example.com' }
      )
      
      expect(dryRunResult.success).toBe(true)
      expect(dryRunResult.preview).toEqual(['iPhone 15', 1200, 1, 'US'])
      
      // Hidden parser should not be called in success case
      expect(hiddenParserService.normalizeOutput).not.toHaveBeenCalled()
    })
  })

  describe('Hidden Parser Fallback Path', () => {
    it('should use hidden parser when main AI fails', async () => {
      // Mock main AI failure
      const malformedResponse = {
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: 'Add Product: iPhone 15, Revenue: $1,200, Quantity: 1 unit'
      }

      geminiService.parseUserInstruction = vi.fn().mockResolvedValue(malformedResponse)

      // Mock hidden parser success
      const normalizedResponse = {
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

      hiddenParserService.normalizeOutput = vi.fn().mockResolvedValue(normalizedResponse)
      appsScriptService.addRow = vi.fn().mockResolvedValue({
        success: true,
        dryRun: true,
        preview: ['iPhone 15', 1200, 1, '']
      })

      // Simulate the complete fallback flow
      const userInput = 'Add Product: iPhone 15, Revenue: $1,200, Quantity: 1 unit'
      
      // Step 1: Main AI fails
      const aiResult = await geminiService.parseUserInstruction(userInput, mockContext)
      expect(aiResult.success).toBe(false)
      
      // Step 2: Fallback to hidden parser
      const parserResult = await hiddenParserService.normalizeOutput(
        aiResult.rawResponse,
        {
          expectedAction: 'addRow',
          headers: mockContext.headers
        }
      )
      
      expect(parserResult.success).toBe(true)
      expect(parserResult.normalized.action).toBe('addRow')
      
      // Step 3: Execute the normalized action
      const dryRunResult = await appsScriptService.addRow(
        mockContext.spreadsheetId,
        mockContext.tabName,
        parserResult.normalized.data,
        { dryRun: true, author: 'test@example.com' }
      )
      
      expect(dryRunResult.success).toBe(true)
    })
  })

  describe('Hallucination Prevention', () => {
    it('should prevent hallucinations by filtering unknown columns', async () => {
      // Mock main AI with hallucinated columns
      const hallucinatedResponse = {
        action: 'addRow',
        data: {
          Product: 'iPhone 15',
          Revenue: 1200,
          Quantity: 1,
          Region: 'US',
          // These columns don't exist in the schema
          FakeColumn: 'hallucinated value',
          AnotherFake: 'more hallucination'
        }
      }

      geminiService.parseUserInstruction = vi.fn().mockResolvedValue(hallucinatedResponse)

      // Mock hidden parser to clean up hallucinations
      const cleanedResponse = {
        success: true,
        normalized: {
          action: 'addRow',
          data: {
            Product: 'iPhone 15',
            Revenue: 1200,
            Quantity: 1,
            Region: 'US'
          }
        },
        warnings: [
          'Removed unknown column: FakeColumn',
          'Removed unknown column: AnotherFake'
        ]
      }

      hiddenParserService.validateAndNormalize = vi.fn().mockResolvedValue(cleanedResponse)

      // Simulate validation flow
      const userInput = 'Add iPhone 15 with all the details'
      
      // Step 1: Main AI returns response with hallucinations
      const aiResult = await geminiService.parseUserInstruction(userInput, mockContext)
      
      // Step 2: Validate and clean up with hidden parser
      const validatedResult = await hiddenParserService.validateAndNormalize(
        JSON.stringify(aiResult),
        { headers: mockContext.headers }
      )
      
      expect(validatedResult.success).toBe(true)
      expect(validatedResult.normalized.data).not.toHaveProperty('FakeColumn')
      expect(validatedResult.normalized.data).not.toHaveProperty('AnotherFake')
      expect(validatedResult.warnings).toContain('Removed unknown column: FakeColumn')
    })
  })

  describe('Complex Malformed Input Handling', () => {
    it('should handle complex malformed LLM output', async () => {
      // Mock main AI with complex malformed response
      const malformedResponse = {
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: `
          I'll help you add that row! Here's what I'll do:
          
          Action: addRow
          Data:
          - Product: "iPhone 15 Pro Max"
          - Revenue: $1,299.99
          - Quantity: 2 units
          - Region: "North America"
          
          This will add the new row to your Sales Data spreadsheet.
        `
      }

      geminiService.parseUserInstruction = vi.fn().mockResolvedValue(malformedResponse)

      // Mock hidden parser to extract structured data
      const extractedResponse = {
        success: true,
        normalized: {
          action: 'addRow',
          data: {
            Product: 'iPhone 15 Pro Max',
            Revenue: 1299.99,
            Quantity: 2,
            Region: 'US' // Normalized from "North America"
          }
        }
      }

      hiddenParserService.normalizeOutput = vi.fn().mockResolvedValue(extractedResponse)
      appsScriptService.addRow = vi.fn().mockResolvedValue({
        success: true,
        dryRun: true,
        preview: ['iPhone 15 Pro Max', 1299.99, 2, 'US']
      })

      // Simulate the complete flow
      const userInput = 'Add iPhone 15 Pro Max with revenue $1,299.99, quantity 2, region North America'
      
      // Step 1: Main AI fails to parse
      const aiResult = await geminiService.parseUserInstruction(userInput, mockContext)
      expect(aiResult.success).toBe(false)
      
      // Step 2: Hidden parser extracts structured data
      const parserResult = await hiddenParserService.normalizeOutput(
        aiResult.rawResponse,
        {
          expectedAction: 'addRow',
          headers: mockContext.headers
        }
      )
      
      expect(parserResult.success).toBe(true)
      expect(parserResult.normalized.data.Product).toBe('iPhone 15 Pro Max')
      expect(parserResult.normalized.data.Revenue).toBe(1299.99)
      expect(parserResult.normalized.data.Region).toBe('US')
      
      // Step 3: Execute the action
      const result = await appsScriptService.addRow(
        mockContext.spreadsheetId,
        mockContext.tabName,
        parserResult.normalized.data,
        { dryRun: true, author: 'test@example.com' }
      )
      
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle both AI models failing gracefully', async () => {
      // Mock both AI models failing
      geminiService.parseUserInstruction = vi.fn().mockResolvedValue({
        success: false,
        error: 'Main AI failed',
        rawResponse: 'unclear input'
      })

      hiddenParserService.normalizeOutput = vi.fn().mockResolvedValue({
        success: false,
        error: 'Unable to extract structured data from input'
      })

      // Simulate complete failure scenario
      const userInput = 'unclear and ambiguous input'
      
      // Step 1: Main AI fails
      const aiResult = await geminiService.parseUserInstruction(userInput, mockContext)
      expect(aiResult.success).toBe(false)
      
      // Step 2: Hidden parser also fails
      const parserResult = await hiddenParserService.normalizeOutput(
        aiResult.rawResponse,
        { headers: mockContext.headers }
      )
      
      expect(parserResult.success).toBe(false)
      
      // The system should gracefully handle this scenario
      // and provide meaningful feedback to the user
    })
  })

  describe('Performance and Efficiency', () => {
    it('should prefer main AI model for efficiency', async () => {
      // Mock successful main AI response
      geminiService.parseUserInstruction = vi.fn().mockResolvedValue({
        action: 'updateCell',
        range: 'B5',
        data: { value: 'Updated Value' },
        confidence: 0.95
      })

      const userInput = 'Update cell B5 to "Updated Value"'
      
      // Process with main AI
      const result = await geminiService.parseUserInstruction(userInput, mockContext)
      
      expect(result.action).toBe('updateCell')
      expect(result.confidence).toBe(0.95)
      
      // Hidden parser should not be called when main AI succeeds
      expect(hiddenParserService.normalizeOutput).not.toHaveBeenCalled()
    })
  })

  describe('Data Type Validation and Conversion', () => {
    it('should handle data type conversion in hidden parser', async () => {
      // Mock main AI with string numbers and currency
      const responseWithStringData = {
        success: false,
        rawResponse: 'Revenue: "$1,234.56", Quantity: "5 units"'
      }

      geminiService.parseUserInstruction = vi.fn().mockResolvedValue(responseWithStringData)

      // Mock hidden parser converting strings to proper types
      hiddenParserService.normalizeOutput = vi.fn().mockResolvedValue({
        success: true,
        normalized: {
          action: 'addRow',
          data: {
            Revenue: 1234.56, // Converted from "$1,234.56"
            Quantity: 5 // Converted from "5 units"
          }
        }
      })

      const userInput = 'Add revenue $1,234.56 and quantity 5 units'
      
      // Step 1: Main AI fails
      const aiResult = await geminiService.parseUserInstruction(userInput, mockContext)
      
      // Step 2: Hidden parser normalizes and converts data types
      const parserResult = await hiddenParserService.normalizeOutput(
        aiResult.rawResponse,
        { headers: ['Revenue', 'Quantity'] }
      )
      
      expect(parserResult.normalized.data.Revenue).toBe(1234.56)
      expect(parserResult.normalized.data.Quantity).toBe(5)
      expect(typeof parserResult.normalized.data.Revenue).toBe('number')
      expect(typeof parserResult.normalized.data.Quantity).toBe('number')
    })
  })
})