import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CategoriesPage } from './CategoriesPage';
import { useCategories } from '@/store/useCategories';

// Mock dependencies
vi.mock('@/store/useCategories');

const mockUseCategories = {
  categories: [
    { id: '1', name: '仕事', color: '#6366F1', order: 1 },
    { id: '2', name: 'プライベート', color: '#F97316', order: 2 },
  ],
  loading: false,
  load: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  reorder: vi.fn(),
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(component, { wrapper: BrowserRouter });
};

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCategories).mockReturnValue(mockUseCategories);
  });

  it('should render categories list', () => {
    renderWithRouter(<CategoriesPage />);
    
    expect(screen.getByText('カテゴリー管理')).toBeInTheDocument();
    expect(screen.getByText('仕事')).toBeInTheDocument();
    expect(screen.getByText('プライベート')).toBeInTheDocument();
  });

  it('should call load on mount', () => {
    renderWithRouter(<CategoriesPage />);
    
    expect(mockUseCategories.load).toHaveBeenCalledTimes(1);
  });

  it('should open create dialog when clicking new category button', () => {
    renderWithRouter(<CategoriesPage />);
    
    const createButton = screen.getByRole('button', { name: /新しいカテゴリー/ });
    fireEvent.click(createButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('カテゴリー名')).toBeInTheDocument();
  });

  it('should create a new category', async () => {
    renderWithRouter(<CategoriesPage />);
    
    const createButton = screen.getByText('新しいカテゴリー');
    fireEvent.click(createButton);
    
    const nameInput = screen.getByLabelText('カテゴリー名');
    fireEvent.change(nameInput, { target: { value: '新規カテゴリー' } });
    
    const submitButton = screen.getByText('作成');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUseCategories.add).toHaveBeenCalledWith({
        name: '新規カテゴリー',
        color: '#6366F1',
      });
    });
  });

  it('should show edit dialog when clicking edit button', () => {
    renderWithRouter(<CategoriesPage />);
    
    const editButton = screen.getByRole('button', { name: '仕事を編集' });
    fireEvent.click(editButton);
    
    expect(screen.getByText('カテゴリーを編集')).toBeInTheDocument();
    expect(screen.getByDisplayValue('仕事')).toBeInTheDocument();
  });

  it('should show delete confirmation dialog', () => {
    renderWithRouter(<CategoriesPage />);
    
    const deleteButton = screen.getByRole('button', { name: '仕事を削除' });
    fireEvent.click(deleteButton);
    
    expect(screen.getByText('カテゴリーを削除しますか？')).toBeInTheDocument();
  });

  it('should delete category when confirmed', async () => {
    renderWithRouter(<CategoriesPage />);
    
    const deleteButton = screen.getByRole('button', { name: '仕事を削除' });
    fireEvent.click(deleteButton);
    
    const confirmButton = screen.getByText('削除');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockUseCategories.remove).toHaveBeenCalledWith('1');
    });
  });

  it('should handle drag and drop reordering', async () => {
    renderWithRouter(<CategoriesPage />);
    
    const cards = screen.getAllByRole('article');
    
    // Simulate drag and drop
    fireEvent.dragStart(cards[0], { dataTransfer: { setData: vi.fn() } });
    fireEvent.dragOver(cards[1]);
    fireEvent.drop(cards[1], { 
      dataTransfer: { getData: () => '0' },
      preventDefault: vi.fn(),
    });
    
    await waitFor(() => {
      expect(mockUseCategories.reorder).toHaveBeenCalled();
    });
  });

  it('should show loading state', () => {
    vi.mocked(useCategories).mockReturnValue({
      ...mockUseCategories,
      loading: true,
    });
    
    renderWithRouter(<CategoriesPage />);
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('should show empty state when no categories', () => {
    vi.mocked(useCategories).mockReturnValue({
      ...mockUseCategories,
      categories: [],
    });
    
    renderWithRouter(<CategoriesPage />);
    
    expect(screen.getByText('カテゴリーがありません。「新しいカテゴリー」ボタンから追加してください。')).toBeInTheDocument();
  });
});