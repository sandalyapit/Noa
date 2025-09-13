import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIAssistantChat } from '../../components/AIAssistantChat'

// Mock services
const mockGeminiService = {
  parseUserInstruction: vi.fn(),
  generateSuggestions: vi.fn(),
  startChat: vi.fn()
}

const mockHiddenParserService = {
  normalizeOutput: vi.fn(),
  validateAndNormalize: vi.fn()
}

const mockAppsScriptService = {
  addRow: vi.fn(),
  updateCell: vi.fn(),
  readRange: vi.fn()
}

describe('AIAssistantChat', () => {
  const defaultProps = {
    sheetContext: {
      spreadsheetId: 'test-id',
      tabName: 'Sales Data',
      headers: ['Product', 'Revenue', 'Quantity', 'Region'],
      sampleData: [
        ['iPhone', 1000, 2, 'US'],
        ['iPad', 800, 1, 'EU']
      ]
    },
    onActionGenerated: vi.fn(),
    onActionExecuted: vi.fn(),
    appsScriptService: mockAppsScriptService,
    disabled: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render chat interface', () => {
    render(<AIAssistantChat {...defaultProps} />)
    
    expect(screen.getByPlaceholderText(/ask me to help/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('should display welcome message when no context', () => {
    render(<AIAssistantChat {...defaultProps} sheetContext={null} />)
    
    expect(screen.getByText(/connect a spreadsheet/i)).toBeInTheDocument()
  })

  it('should show suggestions based on context', async () => {
    mockGeminiService.generateSuggestions.mockResolvedValue({
      suggestions: [
        'Add a new sales record',
        'Update revenue for iPhone',
        'Calculate total revenue'
      ]
    })

    render(<AIAssistantChat {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Add a new sales record')).toBeInTheDocument()
      expect(screen.getByText('Update revenue for iPhone')).toBeInTheDocument()
    })
  })

  it('should handle user message with main AI model', async () => {
    const user = userEvent.setup()
    
    mockGeminiService.parseUserInstruction.mockResolvedValue({
      action: 'addRow',
      data: {
        Product: 'iPhone 15',
        Revenue: 1200,
        Quantity: 1,
        Region: 'US'
      },
      confidence: 0.9
    })

    mockAppsScriptService.addRow.mockResolvedValue({
      success: true,
      dryRun: true,
      preview: ['iPhone 15', 1200, 1, 'US']
    })

    render(<AIAssistantChat {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me to help/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    await user.type(input, 'Add iPhone 15 with revenue 1200, quantity 1, region US')
    await user.click(sendButton)

    await waitFor(() => {
      expect(mockGeminiService.parseUserInstruction).toHaveBeenCalledWith(
        'Add iPhone 15 with revenue 1200, quantity 1, region US',
        defaultProps.sheetContext
      )
    })

    expect(defaultProps.onActionGenerated).toHaveBeenCalledWith({
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

  it('should use hidden parser when main AI fails', async () => {
    const user = userEvent.setup()
    
    // Main AI returns malformed output
    mockGeminiService.parseUserInstruction.mockResolvedValue({
      success: false,
      error: 'Failed to parse AI response',
      rawResponse: 'Add Product: iPhone 15, Revenue: $1,200'
    })

    // Hidden parser normalizes the output
    mockHiddenParserService.normalizeOutput.mockResolvedValue({
      success: true,
      normalized: {
        action: 'addRow',
        data: {
          Product: 'iPhone 15',
          Revenue: 1200
        }
      }
    })

    mockAppsScriptService.addRow.mockResolvedValue({
      success: true,
      dryRun: true,
      preview: ['iPhone 15', 1200, '', '']
    })

    render(<AIAssistantChat {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me to help/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    await user.type(input, 'Add Product: iPhone 15, Revenue: $1,200')
    await user.click(sendButton)

    await waitFor(() => {
      expect(mockHiddenParserService.normalizeOutput).toHaveBeenCalledWith(
        'Add Product: iPhone 15, Revenue: $1,200',
        {
          expectedAction: 'addRow',
          headers: defaultProps.sheetContext.headers
        }
      )
    })

    expect(defaultProps.onActionGenerated).toHaveBeenCalledWith({
      action: 'addRow',
      data: {
        Product: 'iPhone 15',
        Revenue: 1200
      }
    })
  })

  it('should show error when both AI models fail', async () => {
    const user = userEvent.setup()
    
    mockGeminiService.parseUserInstruction.mockResolvedValue({
      success: false,
      error: 'Failed to parse',
      rawResponse: 'unclear input'
    })

    mockHiddenParserService.normalizeOutput.mockResolvedValue({
      success: false,
      error: 'Unable to extract structured data'
    })

    render(<AIAssistantChat {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me to help/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    await user.type(input, 'unclear input')
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/unable to understand/i)).toBeInTheDocument()
    })
  })

  it('should handle dry run confirmation flow', async () => {
    const user = userEvent.setup()
    
    mockGeminiService.parseUserInstruction.mockResolvedValue({
      action: 'addRow',
      data: { Product: 'iPhone 15', Revenue: 1200 }
    })

    // First call: dry run
    mockAppsScriptService.addRow
      .mockResolvedValueOnce({
        success: true,
        dryRun: true,
        preview: ['iPhone 15', 1200, '', '']
      })
      // Second call: actual execution
      .mockResolvedValueOnce({
        success: true,
        result: { rowIndex: 101, data: ['iPhone 15', 1200, '', ''] }
      })

    render(<AIAssistantChat {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me to help/i)
    await user.type(input, 'Add iPhone 15 with revenue 1200')
    await user.click(screen.getByRole('button', { name: /send/i }))

    // Wait for dry run preview
    await waitFor(() => {
      expect(screen.getByText(/preview/i)).toBeInTheDocument()
    })

    // Confirm the action
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockAppsScriptService.addRow).toHaveBeenCalledTimes(2)
      expect(mockAppsScriptService.addRow).toHaveBeenLastCalledWith(
        'test-id',
        'Sales Data',
        { Product: 'iPhone 15', Revenue: 1200 },
        { dryRun: false, author: expect.any(String) }
      )
    })

    expect(defaultProps.onActionExecuted).toHaveBeenCalledWith({
      success: true,
      result: { rowIndex: 101, data: ['iPhone 15', 1200, '', ''] }
    })
  })

  it('should handle update cell action', async () => {
    const user = userEvent.setup()
    
    mockGeminiService.parseUserInstruction.mockResolvedValue({
      action: 'updateCell',
      range: 'B2',
      data: { value: 'iPhone 15 Pro' }
    })

    mockAppsScriptService.updateCell.mockResolvedValue({
      success: true,
      dryRun: true,
      preview: { range: 'B2', oldValue: 'iPhone', newValue: 'iPhone 15 Pro' }
    })

    render(<AIAssistantChat {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me to help/i)
    await user.type(input, 'Change B2 to iPhone 15 Pro')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(mockAppsScriptService.updateCell).toHaveBeenCalledWith(
        'test-id',
        'Sales Data',
        'B2',
        { value: 'iPhone 15 Pro' },
        { dryRun: true, author: expect.any(String) }
      )
    })
  })

  it('should be disabled when prop is set', () => {
    render(<AIAssistantChat {...defaultProps} disabled={true} />)
    
    const input = screen.getByPlaceholderText(/ask me to help/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    expect(input).toBeDisabled()
    expect(sendButton).toBeDisabled()
  })

  it('should clear input after sending message', async () => {
    const user = userEvent.setup()
    
    mockGeminiService.parseUserInstruction.mockResolvedValue({
      action: 'addRow',
      data: { Product: 'iPhone' }
    })

    render(<AIAssistantChat {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me to help/i)
    await user.type(input, 'Add iPhone')
    
    expect(input.value).toBe('Add iPhone')
    
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('should show typing indicator while processing', async () => {
    const user = userEvent.setup()
    
    // Delay the response to test loading state
    mockGeminiService.parseUserInstruction.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ action: 'addRow', data: {} }), 100))
    )

    render(<AIAssistantChat {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/ask me to help/i)
    await user.type(input, 'Add iPhone')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(screen.getByText(/thinking/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument()
    })
  })

  it('should handle suggestion clicks', async () => {
    const user = userEvent.setup()
    
    mockGeminiService.generateSuggestions.mockResolvedValue({
      suggestions: ['Add a new sales record']
    })

    mockGeminiService.parseUserInstruction.mockResolvedValue({
      action: 'addRow',
      data: { Product: 'New Product' }
    })

    render(<AIAssistantChat {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Add a new sales record')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Add a new sales record'))

    await waitFor(() => {
      expect(mockGeminiService.parseUserInstruction).toHaveBeenCalledWith(
        'Add a new sales record',
        defaultProps.sheetContext
      )
    })
  })
})