import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import { useSettings } from '@/store/useSettings';
import { useTasks } from '@/store/useTasks';
import { useCategories } from '@/store/useCategories';
import * as exportImport from '@/utils/export-import';

// Mock dependencies
vi.mock('@/store/useSettings');
vi.mock('@/store/useTasks');
vi.mock('@/store/useCategories');
vi.mock('@/utils/export-import');

const mockUseSettings = {
  settings: { snoozeDuration: 10 },
  updateSetting: vi.fn(),
};

const mockUseTasks = {
  load: vi.fn(),
};

const mockUseCategories = {
  load: vi.fn(),
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(component, { wrapper: BrowserRouter });
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSettings).mockReturnValue(mockUseSettings);
    vi.mocked(useTasks).mockReturnValue(mockUseTasks as any);
    vi.mocked(useCategories).mockReturnValue(mockUseCategories as any);
  });

  it('should render settings page with sections', () => {
    renderWithRouter(<SettingsPage />);
    
    expect(screen.getByText('設定')).toBeInTheDocument();
    expect(screen.getByText('通知設定')).toBeInTheDocument();
    expect(screen.getByText('データ管理')).toBeInTheDocument();
  });

  it('should display and update snooze duration', () => {
    renderWithRouter(<SettingsPage />);
    
    const input = screen.getByLabelText('スヌーズ時間（分）');
    expect(input).toHaveValue(10);
    
    fireEvent.change(input, { target: { value: '15' } });
    
    expect(mockUseSettings.updateSetting).toHaveBeenCalledWith('snoozeDuration', 15);
  });

  it('should handle export', async () => {
    const mockExportData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      data: { tasks: [], categories: [], settings: [] },
    };
    
    vi.mocked(exportImport.exportData).mockResolvedValue(mockExportData);
    vi.mocked(exportImport.downloadJSON).mockImplementation(() => {});
    
    renderWithRouter(<SettingsPage />);
    
    const exportButton = screen.getByText('データをエクスポート');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(exportImport.exportData).toHaveBeenCalled();
      expect(exportImport.downloadJSON).toHaveBeenCalledWith(mockExportData);
    });
  });

  it('should handle file selection and show import dialog', () => {
    renderWithRouter(<SettingsPage />);
    
    const importButton = screen.getByText('データをインポート');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveClass('hidden');
    
    // ファイル選択をシミュレート
    const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // ダイアログが表示される
    expect(screen.getByText('データのインポート')).toBeInTheDocument();
    expect(screen.getByText('置き換え（既存のデータを全て削除して入れ替え）')).toBeInTheDocument();
    expect(screen.getByText('マージ（既存のデータに追加）')).toBeInTheDocument();
  });

  it('should handle import with replace mode', async () => {
    renderWithRouter(<SettingsPage />);
    
    // ファイル選択をシミュレート
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });
    
    vi.mocked(exportImport.readFile).mockResolvedValue('{"test": "data"}');
    vi.mocked(exportImport.importData).mockResolvedValue();
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // インポート実行
    const importButton = screen.getByText('インポート実行');
    fireEvent.click(importButton);
    
    await waitFor(() => {
      expect(exportImport.readFile).toHaveBeenCalledWith(file);
      expect(exportImport.importData).toHaveBeenCalledWith({ test: "data" }, 'replace');
      expect(mockUseTasks.load).toHaveBeenCalled();
      expect(mockUseCategories.load).toHaveBeenCalled();
    });
  });

  it('should handle import error', async () => {
    renderWithRouter(<SettingsPage />);
    
    // ファイル選択をシミュレート
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['invalid json'], 'test.json', { type: 'application/json' });
    
    vi.mocked(exportImport.readFile).mockResolvedValue('invalid json');
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // インポート実行
    const importButton = screen.getByText('インポート実行');
    fireEvent.click(importButton);
    
    await waitFor(() => {
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('Unexpected token');
    });
  });

  it('should allow changing import mode', async () => {
    renderWithRouter(<SettingsPage />);
    
    // ファイル選択をシミュレート
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });
    
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // マージモードに変更
    const mergeRadio = screen.getByLabelText('マージ（既存のデータに追加）');
    fireEvent.click(mergeRadio);
    
    vi.mocked(exportImport.readFile).mockResolvedValue('{"test": "data"}');
    vi.mocked(exportImport.importData).mockResolvedValue();
    
    // インポート実行
    const importButton = screen.getByText('インポート実行');
    fireEvent.click(importButton);
    
    await waitFor(() => {
      expect(exportImport.importData).toHaveBeenCalledWith({ test: "data" }, 'merge');
    });
  });
});