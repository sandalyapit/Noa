import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AppsScriptService from '../../services/appsScriptService'

describe('AppsScriptService', () => {
  let service
  const mockUrl = 'https://script.google.com/macros/s/test-script-id/exec'
  const mockToken = 'test-api-token'

  beforeEach(() => {
    service = new AppsScriptService(mockUrl, mockToken)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with URL and token', () => {
      expect(service.url).toBe(mockUrl)
      expect(service.token).toBe(mockToken)
    })

    it('should throw error if URL is missing', () => {
      expect(() => new AppsScriptService()).toThrow('Apps Script URL is required')
    })
  })

  describe('listTabs', () => {
    it('should successfully list tabs', async () => {
      const mockResponse = {
        success: true,
        sheets: [
          { name: 'Sheet1', gid: 0, rows: 100, cols: 10 },
          { name: 'Sheet2', gid: 1, rows: 50, cols: 5 }
        ]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.listTabs('test-spreadsheet-id')

      expect(global.fetch).toHaveBeenCalledWith(mockUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: mockToken,
          action: 'listTabs',
          spreadsheetId: 'test-spreadsheet-id'
        })
      })

      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Spreadsheet not found'
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse
      })

      const result = await service.listTabs('invalid-id')
      expect(result).toEqual(mockErrorResponse)
    })

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await service.listTabs('test-id')
      expect(result).toEqual({
        success: false,
        error: 'Network error'
      })
    })
  })

  describe('fetchTabData', () => {
    it('should fetch tab data with schema', async () => {
      const mockResponse = {
        success: true,
        data: {
          sheetName: 'Sales Data',
          dimensions: { rows: 100, cols: 5, sampledRows: 50 },
          headers: ['Date', 'Product', 'Revenue', 'Quantity', 'Region'],
          headerRowIndex: 0,
          schema: [
            {
              name: 'Date',
              index: 0,
              letter: 'A',
              dataType: { type: 'date', confidence: 0.9 },
              stats: { nonEmpty: 95, sampleValues: ['2024-01-01', '2024-01-02'] },
              inputType: 'date'
            },
            {
              name: 'Product',
              index: 1,
              letter: 'B',
              dataType: { type: 'text', confidence: 1.0 },
              stats: { nonEmpty: 100, sampleValues: ['iPhone', 'iPad'] },
              inputType: 'text'
            }
          ],
          sampleValues: [
            ['Date', 'Product', 'Revenue', 'Quantity', 'Region'],
            ['2024-01-01', 'iPhone', 1000, 10, 'US'],
            ['2024-01-02', 'iPad', 800, 5, 'EU']
          ]
        }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.fetchTabData('test-id', 'Sales Data', { sampleMaxRows: 50 })

      expect(global.fetch).toHaveBeenCalledWith(mockUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: mockToken,
          action: 'fetchTabData',
          spreadsheetId: 'test-id',
          tabName: 'Sales Data',
          options: { sampleMaxRows: 50 }
        })
      })

      expect(result).toEqual(mockResponse)
    })
  })

  describe('addRow', () => {
    it('should perform dry run successfully', async () => {
      const mockResponse = {
        success: true,
        dryRun: true,
        preview: ['2024-01-03', 'MacBook', 2000, 2, 'US']
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const rowData = {
        Date: '2024-01-03',
        Product: 'MacBook',
        Revenue: 2000,
        Quantity: 2,
        Region: 'US'
      }

      const result = await service.addRow('test-id', 'Sales Data', rowData, {
        dryRun: true,
        author: 'test@example.com'
      })

      expect(result).toEqual(mockResponse)
    })

    it('should perform actual write operation', async () => {
      const mockResponse = {
        success: true,
        result: { rowIndex: 101, data: ['2024-01-03', 'MacBook', 2000, 2, 'US'] }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const rowData = {
        Date: '2024-01-03',
        Product: 'MacBook',
        Revenue: 2000,
        Quantity: 2,
        Region: 'US'
      }

      const result = await service.addRow('test-id', 'Sales Data', rowData, {
        dryRun: false,
        author: 'test@example.com'
      })

      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateCell', () => {
    it('should update cell with dry run', async () => {
      const mockResponse = {
        success: true,
        dryRun: true,
        preview: { range: 'B5', oldValue: 'iPhone', newValue: 'iPhone 15' }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.updateCell('test-id', 'Sales Data', 'B5', {
        value: 'iPhone 15'
      }, { dryRun: true, author: 'test@example.com' })

      expect(result).toEqual(mockResponse)
    })

    it('should sanitize formula injection attempts', async () => {
      const mockResponse = {
        success: true,
        result: { range: 'B5', newValue: "'=SUM(A1:A10)" }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.updateCell('test-id', 'Sales Data', 'B5', {
        value: '=SUM(A1:A10)'
      }, { dryRun: false, author: 'test@example.com' })

      expect(result).toEqual(mockResponse)
    })
  })

  describe('readRange', () => {
    it('should read range data', async () => {
      const mockResponse = {
        success: true,
        data: {
          range: 'A1:C3',
          values: [
            ['Date', 'Product', 'Revenue'],
            ['2024-01-01', 'iPhone', 1000],
            ['2024-01-02', 'iPad', 800]
          ]
        }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.readRange('test-id', 'Sales Data', 'A1:C3')

      expect(global.fetch).toHaveBeenCalledWith(mockUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: mockToken,
          action: 'readRange',
          spreadsheetId: 'test-id',
          tabName: 'Sales Data',
          range: 'A1:C3'
        })
      })

      expect(result).toEqual(mockResponse)
    })
  })

  describe('validation', () => {
    it('should validate spreadsheet ID format', () => {
      expect(() => service.listTabs('')).toThrow('Invalid spreadsheet ID')
      expect(() => service.listTabs('too-short')).toThrow('Invalid spreadsheet ID')
    })

    it('should validate range format', () => {
      expect(() => service.readRange('valid-id', 'Sheet1', 'invalid-range')).toThrow('Invalid range format')
    })

    it('should validate tab name', () => {
      expect(() => service.fetchTabData('valid-id', '')).toThrow('Tab name is required')
    })
  })
})