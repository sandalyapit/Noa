
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';

// Mock all services
vi.mock('../../services/appsScriptService');
vi.mock('../../services/geminiService');
vi.mock('../../services/hiddenParserService');
vi.mock('../../services/regexCheckService');
vi.mock('../../services/schemaValidatorService');
vi.mock('../../services/normalizerService');

import { AppsScriptService } from '../../services/appsScriptService';
import { GeminiService } from '../../services/geminiService';
import { HiddenParserService } from '../../services/hiddenParserService';
import { RegexCheckService } from '../../services/regexCheckService';
import { SchemaValidatorService } from '../../services/schemaValidatorService';
import { NormalizerService } from '../../services/normalizerService';

describe('New End-to-End Integration Test', () => {
  let mockAppsScriptService;
  let mockGeminiService;
  let mockHiddenParserService;
  let mockRegexCheckService;
  let mockSchemaValidatorService;
  let mockNormalizerService;

  beforeEach(() => {
    // Setup service mocks
    mockAppsScriptService = {
      listTabs: vi.fn(),
      fetchTabData: vi.fn(),
      updateCell: vi.fn(),
    };

    mockGeminiService = {
      parseUserInstruction: vi.fn(),
    };

    mockHiddenParserService = {
        validateAndNormalize: vi.fn(),
    };

    mockRegexCheckService = {
      validate: vi.fn(),
    };

    mockSchemaValidatorService = {
      validate: vi.fn(),
    };

    mockNormalizerService = {
      normalize: vi.fn(),
    };

    AppsScriptService.mockImplementation(() => mockAppsScriptService);
    GeminiService.mockImplementation(() => mockGeminiService);
    HiddenParserService.mockImplementation(() => mockHiddenParserService);
    RegexCheckService.mockImplementation(() => mockRegexCheckService);
    SchemaValidatorService.mockImplementation(() => mockSchemaValidatorService);
    NormalizerService.mockImplementation(() => mockNormalizerService);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

    /* it('should handle the full workflow from user prompt to sheet update', async () => {
    const user = userEvent.setup();

    // 1. User Action in UI
    mockAppsScriptService.listTabs.mockResolvedValue({
      success: true,
      sheets: [{ name: 'Laporan', gid: 0, rows: 10, cols: 5 }],
    });

    mockAppsScriptService.fetchTabData.mockResolvedValue({
        success: true,
        data: {
          sheetName: 'Laporan',
          dimensions: { rows: 10, cols: 5, sampledRows: 10 },
          headers: ['ID', 'Product', 'Price', 'Quantity', 'Total'],
          headerRowIndex: 0,
          schema: [],
          sampleValues: [
            ['ID', 'Product', 'Price', 'Quantity', 'Total'],
            ['1', 'A', '100', '2', '200'],
            ['2', 'B', '200', '3', '600'],
          ]
        }
      });

    // 2. Frontend -> Agent AI
    mockGeminiService.parseUserInstruction.mockResolvedValue({
      action: 'updateCell',
      tab: 'Laporan',
      row: 2,
      col: 3,
      value: '300',
    });

    // 3. Guardrail Layer Parsing
    mockRegexCheckService.validate.mockReturnValue(true);
    mockNormalizerService.normalize.mockImplementation(data => data);
    mockSchemaValidatorService.validate.mockReturnValue({ valid: true });
    mockHiddenParserService.validateAndNormalize.mockImplementation(async (instruction, schema) => {
        const normalized = mockNormalizerService.normalize(instruction);
        const validation = mockSchemaValidatorService.validate(normalized, schema);
        if (validation.valid) {
          return { success: true, data: normalized };
        }
        return { success: false };
      });

    // 4. Execution via Apps Script
    mockAppsScriptService.updateCell.mockResolvedValue({
      success: true,
      result: {
        spreadsheetId: 'test-spreadsheet-id',
        updatedRange: 'Laporan!C2',
      },
    });

    render(<App />);

    // Step 1: Enter spreadsheet URL
    const urlInput = screen.getByPlaceholderText(/paste google sheets url/i);
    await user.type(urlInput, 'https://docs.google.com/spreadsheets/d/test-spreadsheet-id/edit');
    
    const syncButton = screen.getByRole('button', { name: /sync/i });
    await user.click(syncButton);

    // Step 2: Wait for tabs to load and select one
    await waitFor(() => {
      expect(screen.getByText('Laporan')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Laporan'));

    // Step 3: Wait for tab data to load
    await waitFor(() => {
      expect(screen.getByText('Product')).toBeInTheDocument();
    });

    // Step 4: Use AI chat to update a cell
    const chatInput = screen.getByPlaceholderText(/ask me to help/i);
    await user.type(chatInput, 'Update cell C2 to 300 in Laporan tab');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Step 5: Wait for AI processing and confirmation
    await waitFor(() => {
      expect(mockAppsScriptService.updateCell).toHaveBeenCalledWith(
        'test-spreadsheet-id',
        'Laporan',
        2,
        3,
        '300'
      );
    });

    // Step 6: Verify successful execution
    await waitFor(() => {
      expect(screen.getByText(/successfully updated/i)).toBeInTheDocument();
    });

    // Verify the complete call chain
    expect(mockAppsScriptService.listTabs).toHaveBeenCalledWith('test-spreadsheet-id');
    expect(mockAppsScriptService.fetchTabData).toHaveBeenCalledWith('test-spreadsheet-id', 'Laporan', expect.any(Object));
    expect(mockGeminiService.parseUserInstruction).toHaveBeenCalled();
    expect(mockHiddenParserService.validateAndNormalize).toHaveBeenCalled();
    expect(mockAppsScriptService.updateCell).toHaveBeenCalledTimes(1);
  }); */
});