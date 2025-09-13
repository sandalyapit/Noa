import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeData, extractStructuredData, validateWithSchema, fixCommonErrors } from '../../services/hiddenParserImplementation'

describe('Hidden Parser Implementation', () => {
  describe('normalizeData', () => {
    it('should normalize valid JSON input', () => {
      const input = {
        raw: '{"action": "addRow", "data": {"Product": "iPhone", "Revenue": 1000}}'
      }

      const result = normalizeData(input)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        action: 'addRow',
        data: {
          Product: 'iPhone',
          Revenue: 1000
        }
      })
      expect(result.wasNormalized).toBe(false)
    })

    it('should normalize malformed JSON', () => {
      const input = {
        raw: '{"action": "addRow", "data": {"Product": "iPhone",}}'
      }

      const result = normalizeData(input)

      expect(result.success).toBe(true)
      expect(result.data.action).toBe('addRow')
      expect(result.data.data.Product).toBe('iPhone')
      expect(result.wasNormalized).toBe(true)
    })

    it('should extract from natural language', () => {
      const input = {
        raw: 'Add a new row with Product: iPhone 15, Revenue: $1,200, Quantity: 2',
        context: {
          expectedAction: 'addRow',
          headers: ['Product', 'Revenue', 'Quantity']
        }
      }

      const result = normalizeData(input)

      expect(result.success).toBe(true)
      expect(result.data.action).toBe('addRow')
      expect(result.data.data.Product).toBe('iPhone 15')
      expect(result.data.data.Revenue).toBe(1200)
      expect(result.data.data.Quantity).toBe(2)
    })

    it('should handle update cell instructions', () => {
      const input = {
        raw: 'Update cell B5 to "New Product Name"',
        context: {
          expectedAction: 'updateCell'
        }
      }

      const result = normalizeData(input)

      expect(result.success).toBe(true)
      expect(result.data.action).toBe('updateCell')
      expect(result.data.range).toBe('B5')
      expect(result.data.data.value).toBe('New Product Name')
    })

    it('should validate against schema when provided', () => {
      const input = {
        raw: '{"action": "addRow", "data": {"Product": "iPhone", "InvalidColumn": "test"}}',
        context: {
          headers: ['Product', 'Revenue', 'Quantity']
        }
      }

      const result = normalizeData(input)

      expect(result.success).toBe(true)
      expect(result.data.data).not.toHaveProperty('InvalidColumn')
      expect(result.warnings).toContain('Removed unknown column: InvalidColumn')
    })

    it('should return error for unparseable input', () => {
      const input = {
        raw: 'This is completely random text with no structure'
      }

      const result = normalizeData(input)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unable to extract structured data')
    })
  })

  describe('extractStructuredData', () => {
    it('should extract addRow data from natural language', () => {
      const text = 'Add Product: iPhone 15, Revenue: $1,299, Quantity: 1, Region: US'
      const context = {
        expectedAction: 'addRow',
        headers: ['Product', 'Revenue', 'Quantity', 'Region']
      }

      const result = extractStructuredData(text, context)

      expect(result.action).toBe('addRow')
      expect(result.data.Product).toBe('iPhone 15')
      expect(result.data.Revenue).toBe(1299)
      expect(result.data.Quantity).toBe(1)
      expect(result.data.Region).toBe('US')
    })

    it('should extract updateCell data', () => {
      const text = 'Change cell C3 to value "Updated Product"'
      const context = { expectedAction: 'updateCell' }

      const result = extractStructuredData(text, context)

      expect(result.action).toBe('updateCell')
      expect(result.range).toBe('C3')
      expect(result.data.value).toBe('Updated Product')
    })

    it('should extract readRange data', () => {
      const text = 'Show me data from A1 to D10'
      const context = { expectedAction: 'readRange' }

      const result = extractStructuredData(text, context)

      expect(result.action).toBe('readRange')
      expect(result.range).toBe('A1:D10')
    })

    it('should handle currency formatting', () => {
      const text = 'Revenue: $1,234.56'
      const context = { headers: ['Revenue'] }

      const result = extractStructuredData(text, context)

      expect(result.data.Revenue).toBe(1234.56)
    })

    it('should handle percentage formatting', () => {
      const text = 'Growth: 15.5%'
      const context = { headers: ['Growth'] }

      const result = extractStructuredData(text, context)

      expect(result.data.Growth).toBe(0.155)
    })

    it('should handle date formatting', () => {
      const text = 'Date: 2024-01-15'
      const context = { headers: ['Date'] }

      const result = extractStructuredData(text, context)

      expect(result.data.Date).toBe('2024-01-15')
    })

    it('should return null for unrecognizable text', () => {
      const text = 'Hello, how are you today?'
      const context = {}

      const result = extractStructuredData(text, context)

      expect(result).toBeNull()
    })
  })

  describe('validateWithSchema', () => {
    it('should validate correct addRow data', () => {
      const data = {
        action: 'addRow',
        data: {
          Product: 'iPhone',
          Revenue: 1000,
          Quantity: 1
        }
      }

      const result = validateWithSchema(data)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate correct updateCell data', () => {
      const data = {
        action: 'updateCell',
        range: 'B5',
        data: {
          value: 'New Value'
        }
      }

      const result = validateWithSchema(data)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid action', () => {
      const data = {
        action: 'deleteSheet',
        data: {}
      }

      const result = validateWithSchema(data)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid action: deleteSheet')
    })

    it('should reject missing required fields', () => {
      const data = {
        action: 'updateCell'
        // missing range and data
      }

      const result = validateWithSchema(data)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject invalid range format', () => {
      const data = {
        action: 'updateCell',
        range: 'invalid-range',
        data: { value: 'test' }
      }

      const result = validateWithSchema(data)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid range format: invalid-range')
    })
  })

  describe('fixCommonErrors', () => {
    it('should fix trailing commas', () => {
      const json = '{"action": "addRow", "data": {"Product": "iPhone",}}'
      const fixed = fixCommonErrors(json)
      
      expect(() => JSON.parse(fixed)).not.toThrow()
      const parsed = JSON.parse(fixed)
      expect(parsed.data.Product).toBe('iPhone')
    })

    it('should fix missing quotes on keys', () => {
      const json = '{action: "addRow", data: {Product: "iPhone"}}'
      const fixed = fixCommonErrors(json)
      
      expect(() => JSON.parse(fixed)).not.toThrow()
      const parsed = JSON.parse(fixed)
      expect(parsed.action).toBe('addRow')
    })

    it('should fix single quotes', () => {
      const json = "{'action': 'addRow', 'data': {'Product': 'iPhone'}}"
      const fixed = fixCommonErrors(json)
      
      expect(() => JSON.parse(fixed)).not.toThrow()
      const parsed = JSON.parse(fixed)
      expect(parsed.action).toBe('addRow')
    })

    it('should remove comments', () => {
      const json = `{
        "action": "addRow", // This is the action
        "data": {
          "Product": "iPhone" /* Product name */
        }
      }`
      const fixed = fixCommonErrors(json)
      
      expect(() => JSON.parse(fixed)).not.toThrow()
      const parsed = JSON.parse(fixed)
      expect(parsed.action).toBe('addRow')
    })

    it('should handle multiple issues at once', () => {
      const json = `{
        action: 'addRow', // Action type
        data: {
          Product: "iPhone",
          Revenue: 1000,
        } /* End of data */
      }`
      const fixed = fixCommonErrors(json)
      
      expect(() => JSON.parse(fixed)).not.toThrow()
      const parsed = JSON.parse(fixed)
      expect(parsed.action).toBe('addRow')
      expect(parsed.data.Product).toBe('iPhone')
      expect(parsed.data.Revenue).toBe(1000)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complex malformed LLM output', () => {
      const input = {
        raw: `
          I'll help you add that row! Here's what I'll do:
          
          Action: addRow
          Data:
          - Product: "iPhone 15 Pro Max"
          - Revenue: $1,299.99
          - Quantity: 2 units
          - Region: "North America"
          - Category: "Smartphone" // This column doesn't exist
          
          This will add the new row to your spreadsheet.
        `,
        context: {
          expectedAction: 'addRow',
          headers: ['Product', 'Revenue', 'Quantity', 'Region']
        }
      }

      const result = normalizeData(input)

      expect(result.success).toBe(true)
      expect(result.data.action).toBe('addRow')
      expect(result.data.data.Product).toBe('iPhone 15 Pro Max')
      expect(result.data.data.Revenue).toBe(1299.99)
      expect(result.data.data.Quantity).toBe(2)
      expect(result.data.data.Region).toBe('North America')
      expect(result.data.data).not.toHaveProperty('Category')
      expect(result.warnings).toContain('Removed unknown column: Category')
    })

    it('should handle mixed format with JSON and natural language', () => {
      const input = {
        raw: `
          Sure! I'll update that cell for you.
          
          {
            "action": "updateCell",
            "range": "B5",
            "data": {
              "value": "Updated Product Name"
            }
          }
          
          This will change the value in cell B5.
        `
      }

      const result = normalizeData(input)

      expect(result.success).toBe(true)
      expect(result.data.action).toBe('updateCell')
      expect(result.data.range).toBe('B5')
      expect(result.data.data.value).toBe('Updated Product Name')
    })

    it('should prevent hallucinations by filtering unknown columns', () => {
      const input = {
        raw: '{"action": "addRow", "data": {"Product": "iPhone", "HallucinatedColumn": "fake", "AnotherFake": "data"}}',
        context: {
          headers: ['Product', 'Revenue']
        }
      }

      const result = normalizeData(input)

      expect(result.success).toBe(true)
      expect(result.data.data).toEqual({ Product: 'iPhone' })
      expect(result.warnings).toContain('Removed unknown column: HallucinatedColumn')
      expect(result.warnings).toContain('Removed unknown column: AnotherFake')
    })
  })
})