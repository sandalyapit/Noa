import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TabDataViewer } from '../../components/TabDataViewer'

const mockAppsScriptService = {
  fetchTabData: vi.fn()
}

describe('TabDataViewer', () => {
  const defaultProps = {
    spreadsheetId: 'test-spreadsheet-id',
    tabName: 'Sales Data',
    appsScriptService: mockAppsScriptService,
    onSchemaReady: vi.fn(),
    disabled: false
  }

  const mockTabData = {
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
        },
        {
          name: 'Revenue',
          index: 2,
          letter: 'C',
          dataType: { type: 'number', confidence: 0.95 },
          stats: { nonEmpty: 98, sampleValues: [1000, 800] },
          inputType: 'number'
        }
      ],
      sampleValues: [
        ['Date', 'Product', 'Revenue', 'Quantity', 'Region'],
        ['2024-01-01', 'iPhone', 1000, 10, 'US'],
        ['2024-01-02', 'iPad', 800, 5, 'EU'],
        ['2024-01-03', 'MacBook', 2000, 2, 'US']
      ]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAppsScriptService.fetchTabData.mockResolvedValue(mockTabData)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render loading state initially', () => {
    render(<TabDataViewer {...defaultProps} />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should fetch and display tab data', async () => {
    render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockAppsScriptService.fetchTabData).toHaveBeenCalledWith(
        'test-spreadsheet-id',
        'Sales Data',
        { sampleMaxRows: 100 }
      )
    })

    expect(screen.getByText('Sales Data')).toBeInTheDocument()
    expect(screen.getByText('100 rows, 5 columns')).toBeInTheDocument()
    expect(screen.getByText('50 rows sampled')).toBeInTheDocument()
  })

  it('should display schema information', async () => {
    render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Product')).toBeInTheDocument()
      expect(screen.getByText('Revenue')).toBeInTheDocument()
    })

    expect(screen.getByText('date')).toBeInTheDocument()
    expect(screen.getByText('text')).toBeInTheDocument()
    expect(screen.getByText('number')).toBeInTheDocument()
  })

  it('should display sample data in table', async () => {
    render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('iPhone')).toBeInTheDocument()
      expect(screen.getByText('iPad')).toBeInTheDocument()
      expect(screen.getByText('MacBook')).toBeInTheDocument()
    })

    expect(screen.getByText('2024-01-01')).toBeInTheDocument()
    expect(screen.getByText('1000')).toBeInTheDocument()
    expect(screen.getByText('US')).toBeInTheDocument()
  })

  it('should call onSchemaReady with schema data', async () => {
    render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(defaultProps.onSchemaReady).toHaveBeenCalledWith({
        headers: ['Date', 'Product', 'Revenue', 'Quantity', 'Region'],
        schema: mockTabData.data.schema,
        sampleData: mockTabData.data.sampleValues,
        dimensions: mockTabData.data.dimensions
      })
    })
  })

  it('should handle API errors', async () => {
    mockAppsScriptService.fetchTabData.mockResolvedValue({
      success: false,
      error: 'Permission denied'
    })

    render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
    })
  })

  it('should handle network errors', async () => {
    mockAppsScriptService.fetchTabData.mockRejectedValue(new Error('Network timeout'))

    render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/network timeout/i)).toBeInTheDocument()
    })
  })

  it('should show confidence levels for data types', async () => {
    render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('90%')).toBeInTheDocument() // Date confidence
      expect(screen.getByText('100%')).toBeInTheDocument() // Product confidence
      expect(screen.getByText('95%')).toBeInTheDocument() // Revenue confidence
    })
  })

  it('should display column statistics', async () => {
    render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('95% filled')).toBeInTheDocument() // Date stats
      expect(screen.getByText('100% filled')).toBeInTheDocument() // Product stats
      expect(screen.getByText('98% filled')).toBeInTheDocument() // Revenue stats
    })
  })

  it('should allow toggling between schema and data views', async () => {
    const user = userEvent.setup()
    
    render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Schema')).toBeInTheDocument()
    })

    // Should show schema by default
    expect(screen.getByText('Data Type')).toBeInTheDocument()

    // Switch to data view
    await user.click(screen.getByText('Sample Data'))
    
    expect(screen.getByText('iPhone')).toBeInTheDocument()
    expect(screen.queryByText('Data Type')).not.toBeInTheDocument()

    // Switch back to schema
    await user.click(screen.getByText('Schema'))
    
    expect(screen.getByText('Data Type')).toBeInTheDocument()
  })

  it('should refresh data when props change', async () => {
    const { rerender } = render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockAppsScriptService.fetchTabData).toHaveBeenCalledTimes(1)
    })

    // Change tab name
    rerender(<TabDataViewer {...defaultProps} tabName="Different Tab" />)
    
    await waitFor(() => {
      expect(mockAppsScriptService.fetchTabData).toHaveBeenCalledTimes(2)
      expect(mockAppsScriptService.fetchTabData).toHaveBeenLastCalledWith(
        'test-spreadsheet-id',
        'Different Tab',
        { sampleMaxRows: 100 }
      )
    })
  })

  it('should be disabled when prop is set', () => {
    render(<TabDataViewer {...defaultProps} disabled={true} />)
    
    expect(screen.getByText(/disabled/i)).toBeInTheDocument()
  })

  it('should handle empty spreadsheet', async () => {
    mockAppsScriptService.fetchTabData.mockResolvedValue({
      success: true,
      data: {
        sheetName: 'Empty Sheet',
        dimensions: { rows: 0, cols: 0, sampledRows: 0 },
        headers: [],
        headerRowIndex: -1,
        schema: [],
        sampleValues: []
      }
    })

    render(<TabDataViewer {...defaultProps} tabName="Empty Sheet" />)
    
    await waitFor(() => {
      expect(screen.getByText(/no data found/i)).toBeInTheDocument()
    })
  })

  it('should handle spreadsheet with no headers', async () => {
    mockAppsScriptService.fetchTabData.mockResolvedValue({
      success: true,
      data: {
        sheetName: 'No Headers',
        dimensions: { rows: 10, cols: 3, sampledRows: 10 },
        headers: [],
        headerRowIndex: -1,
        schema: [
          { name: 'Column A', index: 0, letter: 'A', dataType: { type: 'text', confidence: 0.8 } },
          { name: 'Column B', index: 1, letter: 'B', dataType: { type: 'number', confidence: 0.9 } }
        ],
        sampleValues: [
          ['Value1', 100, 'Data1'],
          ['Value2', 200, 'Data2']
        ]
      }
    })

    render(<TabDataViewer {...defaultProps} tabName="No Headers" />)
    
    await waitFor(() => {
      expect(screen.getByText('Column A')).toBeInTheDocument()
      expect(screen.getByText('Column B')).toBeInTheDocument()
      expect(screen.getByText(/no headers detected/i)).toBeInTheDocument()
    })
  })

  it('should show sample size configuration', async () => {
    const user = userEvent.setup()
    
    render(<TabDataViewer {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('100')).toBeInTheDocument() // Sample size input
    })

    const sampleInput = screen.getByDisplayValue('100')
    await user.clear(sampleInput)
    await user.type(sampleInput, '200')
    
    // Should trigger refetch with new sample size
    await waitFor(() => {
      expect(mockAppsScriptService.fetchTabData).toHaveBeenLastCalledWith(
        'test-spreadsheet-id',
        'Sales Data',
        { sampleMaxRows: 200 }
      )
    })
  })
})