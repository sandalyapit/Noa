import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UrlSyncPanel } from '../../components/UrlSyncPanel'

const mockAppsScriptService = {
  listTabs: vi.fn()
}

describe('UrlSyncPanel', () => {
  const defaultProps = {
    onTabSelected: vi.fn(),
    appsScriptService: mockAppsScriptService,
    disabled: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render URL input and sync button', () => {
    render(<UrlSyncPanel {...defaultProps} />)
    
    expect(screen.getByPlaceholderText(/paste google sheets url/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument()
  })

  it('should extract spreadsheet ID from full URL', async () => {
    const user = userEvent.setup()
    
    mockAppsScriptService.listTabs.mockResolvedValue({
      success: true,
      sheets: [
        { name: 'Sheet1', gid: 0, rows: 100, cols: 10 },
        { name: 'Sales Data', gid: 1, rows: 50, cols: 5 }
      ]
    })

    render(<UrlSyncPanel {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    await user.type(input, 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0')
    await user.click(syncButton)

    await waitFor(() => {
      expect(mockAppsScriptService.listTabs).toHaveBeenCalledWith('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')
    })

    expect(screen.getByText('Sheet1')).toBeInTheDocument()
    expect(screen.getByText('Sales Data')).toBeInTheDocument()
  })

  it('should accept raw spreadsheet ID', async () => {
    const user = userEvent.setup()
    
    mockAppsScriptService.listTabs.mockResolvedValue({
      success: true,
      sheets: [{ name: 'Test Sheet', gid: 0, rows: 10, cols: 5 }]
    })

    render(<UrlSyncPanel {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    await user.type(input, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')
    await user.click(syncButton)

    await waitFor(() => {
      expect(mockAppsScriptService.listTabs).toHaveBeenCalledWith('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')
    })
  })

  it('should show error for invalid URL', async () => {
    const user = userEvent.setup()
    
    render(<UrlSyncPanel {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    await user.type(input, 'invalid-url')
    await user.click(syncButton)

    expect(screen.getByText(/invalid spreadsheet url/i)).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    
    mockAppsScriptService.listTabs.mockResolvedValue({
      success: false,
      error: 'Spreadsheet not found or no permission'
    })

    render(<UrlSyncPanel {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    await user.type(input, 'https://docs.google.com/spreadsheets/d/invalid-id/edit')
    await user.click(syncButton)

    await waitFor(() => {
      expect(screen.getByText(/spreadsheet not found/i)).toBeInTheDocument()
    })
  })

  it('should show loading state during sync', async () => {
    const user = userEvent.setup()
    
    // Delay the response to test loading state
    mockAppsScriptService.listTabs.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, sheets: [] }), 100))
    )

    render(<UrlSyncPanel {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    await user.type(input, 'https://docs.google.com/spreadsheets/d/test-id/edit')
    await user.click(syncButton)

    expect(screen.getByText(/syncing/i)).toBeInTheDocument()
    expect(syncButton).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByText(/syncing/i)).not.toBeInTheDocument()
    })
  })

  it('should allow tab selection', async () => {
    const user = userEvent.setup()
    
    mockAppsScriptService.listTabs.mockResolvedValue({
      success: true,
      sheets: [
        { name: 'Sheet1', gid: 0, rows: 100, cols: 10 },
        { name: 'Sales Data', gid: 1, rows: 50, cols: 5 }
      ]
    })

    render(<UrlSyncPanel {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    await user.type(input, 'https://docs.google.com/spreadsheets/d/test-id/edit')
    await user.click(syncButton)

    await waitFor(() => {
      expect(screen.getByText('Sales Data')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Sales Data'))

    expect(defaultProps.onTabSelected).toHaveBeenCalledWith({
      spreadsheetId: 'test-id',
      tabName: 'Sales Data',
      tabInfo: { name: 'Sales Data', gid: 1, rows: 50, cols: 5 }
    })
  })

  it('should show tab metadata', async () => {
    const user = userEvent.setup()
    
    mockAppsScriptService.listTabs.mockResolvedValue({
      success: true,
      sheets: [
        { name: 'Large Sheet', gid: 0, rows: 1000, cols: 25 }
      ]
    })

    render(<UrlSyncPanel {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    await user.type(input, 'test-id')
    await user.click(syncButton)

    await waitFor(() => {
      expect(screen.getByText('1000 rows')).toBeInTheDocument()
      expect(screen.getByText('25 columns')).toBeInTheDocument()
    })
  })

  it('should be disabled when prop is set', () => {
    render(<UrlSyncPanel {...defaultProps} disabled={true} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    expect(input).toBeDisabled()
    expect(syncButton).toBeDisabled()
  })

  it('should clear previous results when new URL is entered', async () => {
    const user = userEvent.setup()
    
    mockAppsScriptService.listTabs
      .mockResolvedValueOnce({
        success: true,
        sheets: [{ name: 'First Sheet', gid: 0, rows: 10, cols: 5 }]
      })
      .mockResolvedValueOnce({
        success: true,
        sheets: [{ name: 'Second Sheet', gid: 0, rows: 20, cols: 10 }]
      })

    render(<UrlSyncPanel {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    // First sync
    await user.type(input, 'first-id')
    await user.click(syncButton)

    await waitFor(() => {
      expect(screen.getByText('First Sheet')).toBeInTheDocument()
    })

    // Clear and enter new URL
    await user.clear(input)
    await user.type(input, 'second-id')
    await user.click(syncButton)

    await waitFor(() => {
      expect(screen.getByText('Second Sheet')).toBeInTheDocument()
      expect(screen.queryByText('First Sheet')).not.toBeInTheDocument()
    })
  })

  it('should validate spreadsheet ID format', async () => {
    const user = userEvent.setup()
    
    render(<UrlSyncPanel {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    await user.type(input, 'too-short')
    await user.click(syncButton)

    expect(screen.getByText(/invalid spreadsheet url/i)).toBeInTheDocument()
    expect(mockAppsScriptService.listTabs).not.toHaveBeenCalled()
  })

  it('should handle network errors', async () => {
    const user = userEvent.setup()
    
    mockAppsScriptService.listTabs.mockRejectedValue(new Error('Network error'))

    render(<UrlSyncPanel {...defaultProps} />)
    
    const input = screen.getByPlaceholderText(/paste google sheets url/i)
    const syncButton = screen.getByRole('button', { name: /sync/i })

    await user.type(input, 'valid-spreadsheet-id-1234567890')
    await user.click(syncButton)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })
})