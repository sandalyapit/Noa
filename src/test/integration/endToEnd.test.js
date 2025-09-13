import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../../App'

// Mock all services
vi.mock('../../services/appsScriptService')
vi.mock('../../services/geminiService')
vi.mock('../../services/hiddenParserService')

import { AppsScriptService } from '../../services/appsScriptService'
import { GeminiService } from '../../services/geminiService'
import { HiddenParserService } from '../../services/hiddenParserService'

describe('End-to-End Integration Tests', () => {
  let mockAppsScriptService
  let mockGeminiService
  let mockHiddenParserService

  beforeEach(() => {
    // Setup service mocks
    mockAppsScriptService = {
      listTabs: vi.fn(),
      fetchTabData: vi.fn(),
      addRow: vi.fn(),
      updateCell: vi.fn(),
      readRange: vi.fn()
    }

    mockGeminiService = {
      parseUserInstruction: vi.fn(),
      generateSuggestions: vi.fn(),
      startChat: vi.fn()
    }

    mockHiddenParserService = {
      normalizeOutput: vi.fn(),
      validateAndNormalize: vi.fn()
    }

    AppsScriptService.mockImplementation(() => mockAppsScriptService)
    GeminiService.mockImplementation(() => mockGeminiService)
    HiddenParserService.mockImplementation(() => mockHiddenParserService)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete User Journey: URL to AI Action', () => {
    it('should complete full workflow from URL input to AI-driven sheet edit', async () => {
      const user = userEvent.setup()

      // Mock the complete data flow
      mockAppsScriptService.listTabs.mockResolvedValue({
        success: true,
        sheets: [
          { name: 'Sales Data', gid: 0, rows: 100, cols: 5 },
          { name: 'Config', gid: 1, rows: 10, cols: 3 }
        ]
      })

      mockAppsScriptService.fetchTabData.mockResolvedValue({
        success: true,
        data: {
          sheetName: 'Sales Data',
          dimensions: { rows: 100, cols: 5, sampledRows: 50 },
          headers: ['Date', 'Product', 'Revenue', 'Quantity', 'Region'],
          headerRowIndex: 0,
          schema: [
            {
              name: 'Product',
              index: 1,
              letter: 'B',
              dataType: { type: 'text', confidence: 1.0 },
              inputType: 'text'
            },
            {
              name: 'Revenue',
              index: 2,
              letter: 'C',
              dataType: { type: 'number', confidence: 0.95 },
              inputType: 'number'
            }
          ],
          sampleValues: [
            ['Date', 'Product', 'Revenue', 'Quantity', 'Region'],
            ['2024-01-01', 'iPhone', 1000, 10, 'US'],
            ['2024-01-02', 'iPad', 800, 5, 'EU']
          ]
        }
      })

      mockGeminiService.generateSuggestions.mockResolvedValue({
        suggestions: ['Add a new sales record', 'Update product information']
      })

      mockGeminiService.parseUserInstruction.mockResolvedValue({
        action: 'addRow',
        data: {
          Date: '2024-01-03',
          Product: 'iPhone 15',
          Revenue: 1200,
          Quantity: 1,
          Region: 'US'
        },
        confidence: 0.9
      })

      mockAppsScriptService.addRow
        .mockResolvedValueOnce({
          success: true,
          dryRun: true,
          preview: ['2024-01-03', 'iPhone 15', 1200, 1, 'US']
        })
        .mockResolvedValueOnce({
          success: true,
          result: { rowIndex: 101, data: ['2024-01-03', 'iPhone 15', 1200, 1, 'US'] }
        })

      render(<App />)

      // Step 1: Enter spreadsheet URL
      const urlInput = screen.getByPlaceholderText(/paste google sheets url/i)
      await user.type(urlInput, 'https://docs.google.com/spreadsheets/d/test-spreadsheet-id/edit')
      
      const syncButton = screen.getByRole('button', { name: /sync/i })
      await user.click(syncButton)

      // Step 2: Wait for tabs to load and select one
      await waitFor(() => {
        expect(screen.getByText('Sales Data')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Sales Data'))

      // Step 3: Wait for tab data to load
      await waitFor(() => {
        expect(screen.getByText('iPhone')).toBeInTheDocument()
        expect(screen.getByText('iPad')).toBeInTheDocument()
      })

      // Step 4: Use AI chat to add a new row
      const chatInput = screen.getByPlaceholderText(/ask me to help/i)
      await user.type(chatInput, 'Add iPhone 15 with revenue 1200, quantity 1, region US, date 2024-01-03')
      
      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      // Step 5: Wait for AI processing and dry run preview
      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
        expect(screen.getByText('iPhone 15')).toBeInTheDocument()
        expect(screen.getByText('1200')).toBeInTheDocument()
      })

      // Step 6: Confirm the action
      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      // Step 7: Verify successful execution
      await waitFor(() => {
        expect(screen.getByText(/successfully added/i)).toBeInTheDocument()
      })

      // Verify the complete call chain
      expect(mockAppsScriptService.listTabs).toHaveBeenCalledWith('test-spreadsheet-id')
      expect(mockAppsScriptService.fetchTabData).toHaveBeenCalledWith('test-spreadsheet-id', 'Sales Data', expect.any(Object))
      expect(mockGeminiService.parseUserInstruction).toHaveBeenCalled()
      expect(mockAppsScriptService.addRow).toHaveBeenCalledTimes(2) // Dry run + actual
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should recover from main AI failure using hidden parser', async () => {
      const user = userEvent.setup()

      // Setup initial data
      mockAppsScriptService.listTabs.mockResolvedValue({
        success: true,
        sheets: [{ name: 'Test Sheet', gid: 0, rows: 10, cols: 3 }]
      })

      mockAppsScriptService.fetchTabData.mockResolvedValue({
        success: true,
        data: {
          sheetName: 'Test Sheet',
          headers: ['Product', 'Revenue'],
          schema: [],
          sampleValues: []
        }
      })

      // Main AI fails
      mockGeminiService.parseUserInstruction.mockResolvedValue({
        success: false,
        error: 'Failed to parse AI response',
        rawResponse: 'Add Product: iPhone, Revenue: $1,000'
      })

      // Hidden parser succeeds
      mockHiddenParserService.normalizeOutput.mockResolvedValue({
        success: true,
        normalized: {
          action: 'addRow',
          data: {
            Product: 'iPhone',
            Revenue: 1000
          }
        }
      })

      mockAppsScriptService.addRow.mockResolvedValue({
        success: true,
        dryRun: true,
        preview: ['iPhone', 1000]
      })

      render(<App />)

      // Setup spreadsheet
      const urlInput = screen.getByPlaceholderText(/paste google sheets url/i)
      await user.type(urlInput, 'test-spreadsheet-id')
      await user.click(screen.getByRole('button', { name: /sync/i }))

      await waitFor(() => {
        expect(screen.getByText('Test Sheet')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Test Sheet'))

      // Use AI chat with malformed input
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me to help/i)).toBeInTheDocument()
      })

      const chatInput = screen.getByPlaceholderText(/ask me to help/i)
      await user.type(chatInput, 'Add Product: iPhone, Revenue: $1,000')
      await user.click(screen.getByRole('button', { name: /send/i }))

      // Should show that it's using the hidden parser
      await waitFor(() => {
        expect(screen.getByText(/normalizing/i)).toBeInTheDocument()
      })

      // Should eventually show the preview
      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
        expect(screen.getByText('iPhone')).toBeInTheDocument()
      })

      // Verify hidden parser was called
      expect(mockHiddenParserService.normalizeOutput).toHaveBeenCalledWith(
        'Add Product: iPhone, Revenue: $1,000',
        expect.objectContaining({
          expectedAction: 'addRow',
          headers: ['Product', 'Revenue']
        })
      )
    })
  })

  describe('Form-based Data Entry Integration', () => {
    it('should integrate AI chat with dynamic form generation', async () => {
      const user = userEvent.setup()

      // Setup spreadsheet with schema
      mockAppsScriptService.listTabs.mockResolvedValue({
        success: true,
        sheets: [{ name: 'Products', gid: 0, rows: 50, cols: 4 }]
      })

      mockAppsScriptService.fetchTabData.mockResolvedValue({
        success: true,
        data: {
          sheetName: 'Products',
          headers: ['Name', 'Price', 'Category', 'InStock'],
          schema: [
            { name: 'Name', inputType: 'text', dataType: { type: 'text' } },
            { name: 'Price', inputType: 'number', dataType: { type: 'number' } },
            { name: 'Category', inputType: 'select', dataType: { type: 'text' } },
            { name: 'InStock', inputType: 'checkbox', dataType: { type: 'boolean' } }
          ],
          sampleValues: [
            ['Name', 'Price', 'Category', 'InStock'],
            ['iPhone', 999, 'Electronics', true],
            ['Book', 29.99, 'Books', false]
          ]
        }
      })

      render(<App />)

      // Setup spreadsheet
      const urlInput = screen.getByPlaceholderText(/paste google sheets url/i)
      await user.type(urlInput, 'test-id')
      await user.click(screen.getByRole('button', { name: /sync/i }))

      await waitFor(() => {
        expect(screen.getByText('Products')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Products'))

      // Wait for schema to load and form to be generated
      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/instock/i)).toBeInTheDocument()
      })

      // Fill out the form manually
      await user.type(screen.getByLabelText(/name/i), 'MacBook Pro')
      await user.type(screen.getByLabelText(/price/i), '2499')
      await user.selectOptions(screen.getByLabelText(/category/i), 'Electronics')
      await user.click(screen.getByLabelText(/instock/i))

      // Submit via form
      mockAppsScriptService.addRow.mockResolvedValue({
        success: true,
        dryRun: true,
        preview: ['MacBook Pro', 2499, 'Electronics', true]
      })

      const submitButton = screen.getByRole('button', { name: /add row/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/preview/i)).toBeInTheDocument()
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument()
      })

      // Verify form data was submitted correctly
      expect(mockAppsScriptService.addRow).toHaveBeenCalledWith(
        'test-id',
        'Products',
        {
          Name: 'MacBook Pro',
          Price: 2499,
          Category: 'Electronics',
          InStock: true
        },
        expect.objectContaining({ dryRun: true })
      )
    })
  })

  describe('Security and Validation Integration', () => {
    it('should prevent formula injection through the complete pipeline', async () => {
      const user = userEvent.setup()

      // Setup basic spreadsheet
      mockAppsScriptService.listTabs.mockResolvedValue({
        success: true,
        sheets: [{ name: 'Data', gid: 0, rows: 10, cols: 2 }]
      })

      mockAppsScriptService.fetchTabData.mockResolvedValue({
        success: true,
        data: {
          sheetName: 'Data',
          headers: ['Name', 'Formula'],
          schema: [],
          sampleValues: []
        }
      })

      // AI tries to inject formula
      mockGeminiService.parseUserInstruction.mockResolvedValue({
        action: 'addRow',
        data: {
          Name: 'Test',
          Formula: '=SUM(A1:A10)' // Potential formula injection
        }
      })

      // Apps Script should sanitize this
      mockAppsScriptService.addRow.mockResolvedValue({
        success: true,
        result: {
          rowIndex: 11,
          data: ['Test', "'=SUM(A1:A10)"] // Sanitized with apostrophe
        }
      })

      render(<App />)

      // Setup and use AI chat
      const urlInput = screen.getByPlaceholderText(/paste google sheets url/i)
      await user.type(urlInput, 'test-id')
      await user.click(screen.getByRole('button', { name: /sync/i }))

      await waitFor(() => {
        expect(screen.getByText('Data')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Data'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask me to help/i)).toBeInTheDocument()
      })

      const chatInput = screen.getByPlaceholderText(/ask me to help/i)
      await user.type(chatInput, 'Add name Test and formula =SUM(A1:A10)')
      await user.click(screen.getByRole('button', { name: /send/i }))

      // Should show sanitized preview
      await waitFor(() => {
        expect(screen.getByText("'=SUM(A1:A10)")).toBeInTheDocument()
      })

      // Verify sanitization occurred
      expect(mockAppsScriptService.addRow).toHaveBeenCalledWith(
        'test-id',
        'Data',
        expect.objectContaining({
          Formula: '=SUM(A1:A10)' // Raw input
        }),
        expect.any(Object)
      )
    })
  })

  describe('Performance and User Experience', () => {
    it('should show appropriate loading states throughout the workflow', async () => {
      const user = userEvent.setup()

      // Add delays to simulate real network conditions
      mockAppsScriptService.listTabs.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          sheets: [{ name: 'Test', gid: 0, rows: 10, cols: 2 }]
        }), 100))
      )

      mockAppsScriptService.fetchTabData.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: {
            sheetName: 'Test',
            headers: ['A', 'B'],
            schema: [],
            sampleValues: []
          }
        }), 100))
      )

      render(<App />)

      // Test URL sync loading
      const urlInput = screen.getByPlaceholderText(/paste google sheets url/i)
      await user.type(urlInput, 'test-id')
      
      const syncButton = screen.getByRole('button', { name: /sync/i })
      await user.click(syncButton)

      expect(screen.getByText(/syncing/i)).toBeInTheDocument()
      expect(syncButton).toBeDisabled()

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
        expect(screen.queryByText(/syncing/i)).not.toBeInTheDocument()
      })

      // Test tab data loading
      await user.click(screen.getByText('Test'))

      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })
    })
  })
})