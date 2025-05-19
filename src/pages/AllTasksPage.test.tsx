import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AllTasksPage } from './AllTasksPage';
import { useTasks } from '@/store/useTasks';
import { useCategories } from '@/store/useCategories';
import type { Task, Category } from '@/db';

// Mock dependencies
vi.mock('@/store/useTasks');
vi.mock('@/store/useCategories');

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Pending Task',
    status: 'pending',
    createdAt: new Date('2023-01-01').getTime(),
    updatedAt: new Date('2023-01-01').getTime(),
    dueAt: new Date('2023-01-10').getTime(),
    categoryId: 'cat-1',
  },
  {
    id: '2',
    title: 'Done Task',
    status: 'done',
    createdAt: new Date('2023-01-02').getTime(),
    updatedAt: new Date('2023-01-02').getTime(),
    categoryId: 'cat-2',
  },
  {
    id: '3',
    title: 'Archived Task',
    status: 'archived',
    createdAt: new Date('2023-01-03').getTime(),
    updatedAt: new Date('2023-01-03').getTime(),
  },
];

const mockCategories: Category[] = [
  { id: 'cat-1', name: '仕事', color: '#1234567', order: 1 },
  { id: 'cat-2', name: 'プライベート', color: '#7654321', order: 2 },
];

const mockUseTasks = {
  tasks: mockTasks,
  loading: false,
  load: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toggleStatus: vi.fn(),
};

const mockUseCategories = {
  categories: mockCategories,
  load: vi.fn(),
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(component, { wrapper: BrowserRouter });
};

describe('AllTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTasks).mockReturnValue(mockUseTasks as any);
    vi.mocked(useCategories).mockReturnValue(mockUseCategories as any);
  });

  it('should render page and load data', () => {
    renderWithRouter(<AllTasksPage />);
    
    expect(screen.getByText('全タスク')).toBeInTheDocument();
    expect(screen.getByText('フィルター & 検索')).toBeInTheDocument();
    expect(mockUseTasks.load).toHaveBeenCalled();
    expect(mockUseCategories.load).toHaveBeenCalled();
  });

  it('should display all tasks by default', () => {
    renderWithRouter(<AllTasksPage />);
    
    expect(screen.getByText('Pending Task')).toBeInTheDocument();
    expect(screen.getByText('Done Task')).toBeInTheDocument();
    expect(screen.getByText('Archived Task')).toBeInTheDocument();
  });

  it('should filter tasks by status', () => {
    renderWithRouter(<AllTasksPage />);
    
    // ステータスセレクトボックスはラベルで特定
    const statusLabel = screen.getByText('ステータス');
    const statusSelect = statusLabel.nextElementSibling!;
    fireEvent.click(statusSelect);
    
    const pendingOption = screen.getByRole('option', { name: '未完了' });
    fireEvent.click(pendingOption);
    
    expect(screen.getByText('Pending Task')).toBeInTheDocument();
    expect(screen.queryByText('Done Task')).not.toBeInTheDocument();
    expect(screen.queryByText('Archived Task')).not.toBeInTheDocument();
  });

  it('should filter tasks by category', () => {
    renderWithRouter(<AllTasksPage />);
    
    // カテゴリーセレクトボックスはラベルで特定
    const categoryLabel = screen.getByText('カテゴリー');
    const categorySelect = categoryLabel.nextElementSibling!;
    fireEvent.click(categorySelect);
    
    const workOption = screen.getByRole('option', { name: '仕事' });
    fireEvent.click(workOption);
    
    expect(screen.getByText('Pending Task')).toBeInTheDocument();
    expect(screen.queryByText('Done Task')).not.toBeInTheDocument();
  });

  it('should search tasks by title', () => {
    renderWithRouter(<AllTasksPage />);
    
    const searchInput = screen.getByPlaceholderText('タスクを検索...');
    fireEvent.change(searchInput, { target: { value: 'Done' } });
    
    expect(screen.queryByText('Pending Task')).not.toBeInTheDocument();
    expect(screen.getByText('Done Task')).toBeInTheDocument();
    expect(screen.queryByText('Archived Task')).not.toBeInTheDocument();
  });

  it('should sort tasks', () => {
    renderWithRouter(<AllTasksPage />);
    
    // ソートセレクトボックスはラベルで特定
    const sortLabel = screen.getByText('並び順');
    const sortSelect = sortLabel.nextElementSibling!;
    fireEvent.click(sortSelect);
    
    const titleOption = screen.getByRole('option', { name: 'タイトル' });
    fireEvent.click(titleOption);
    
    // タイトルによるソート時、デフォルトは降順なので逆順になる
    const allTasks = Array.from(document.querySelectorAll('[id^="task-"]'));
    expect(allTasks[0]).toHaveTextContent('Pending Task'); // P comes last in reverse
    expect(allTasks[1]).toHaveTextContent('Done Task');    // D comes middle in reverse
    expect(allTasks[2]).toHaveTextContent('Archived Task'); // A comes first in reverse
  });

  it('should toggle sort order', () => {
    renderWithRouter(<AllTasksPage />);
    
    const sortButton = screen.getByText('降順');
    fireEvent.click(sortButton);
    
    expect(screen.getByText('昇順')).toBeInTheDocument();
    
    // タスクカードの順序を確認（昇順=古い順）
    const allTasks = Array.from(document.querySelectorAll('[id^="task-"]'));
    expect(allTasks[0]).toHaveTextContent('Pending Task'); // 最も古い (2023-01-01)
    expect(allTasks[1]).toHaveTextContent('Done Task'); // 中間 (2023-01-02)
    expect(allTasks[2]).toHaveTextContent('Archived Task'); // 最も新しい (2023-01-03)
  });

  it('should select/deselect tasks', () => {
    renderWithRouter(<AllTasksPage />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    
    // 個別のタスクを選択
    fireEvent.click(checkboxes[1]); // 最初のタスク
    
    expect(screen.getByText('1件選択中')).toBeInTheDocument();
    
    // 全選択
    fireEvent.click(checkboxes[0]); // 全選択チェックボックス
    
    expect(screen.getByText('3件選択中')).toBeInTheDocument();
  });

  it('should archive selected tasks', async () => {
    renderWithRouter(<AllTasksPage />);
    
    // タスクを選択
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // 最初のタスクを選択
    
    const archiveButton = screen.getByText('アーカイブ');
    fireEvent.click(archiveButton);
    
    await waitFor(() => {
      expect(mockUseTasks.update).toHaveBeenCalled();
      const calledArgs = mockUseTasks.update.mock.calls[0];
      expect(calledArgs[1]).toEqual({ status: 'archived' });
    });
  });

  it('should delete selected tasks with confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    renderWithRouter(<AllTasksPage />);
    
    // タスクを選択
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    
    const deleteButton = screen.getByText('削除');
    fireEvent.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalledWith('1件のタスクを削除しますか？この操作は取り消せません。');
    
    await waitFor(() => {
      expect(mockUseTasks.remove).toHaveBeenCalled();
    });
    
    confirmSpy.mockRestore();
  });

  it('should cancel delete when confirmation is rejected', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    renderWithRouter(<AllTasksPage />);
    
    // タスクを選択
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    
    const deleteButton = screen.getByText('削除');
    fireEvent.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockUseTasks.remove).not.toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });

  it('should open task form when clicking on task', () => {
    renderWithRouter(<AllTasksPage />);
    
    const task = screen.getByText('Pending Task');
    fireEvent.click(task);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useTasks).mockReturnValue({
      ...mockUseTasks,
      loading: true,
    } as any);
    
    renderWithRouter(<AllTasksPage />);
    
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('should show empty state with search', () => {
    vi.mocked(useTasks).mockReturnValue({
      ...mockUseTasks,
      tasks: [],
    } as any);
    
    renderWithRouter(<AllTasksPage />);
    
    const searchInput = screen.getByPlaceholderText('タスクを検索...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    expect(screen.getByText('条件に一致するタスクがありません')).toBeInTheDocument();
  });

  it('should show empty state without search', () => {
    vi.mocked(useTasks).mockReturnValue({
      ...mockUseTasks,
      tasks: [],
    } as any);
    
    renderWithRouter(<AllTasksPage />);
    
    expect(screen.getByText('タスクがありません')).toBeInTheDocument();
  });
});