import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskCard } from './TaskCard';
import type { Task } from '../db';
import '@testing-library/jest-dom';

describe('TaskCard', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  it('should render task title', () => {
    render(<TaskCard task={mockTask} onToggle={() => {}} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
  
  it('should show due date when available', () => {
    const dueTask = {
      ...mockTask,
      dueAt: new Date('2024-12-31').getTime(),
    };
    
    render(<TaskCard task={dueTask} onToggle={() => {}} />);
    expect(screen.getByText(/期限:/)).toBeInTheDocument();
  });
  
  it('should show completion status', () => {
    const doneTask = {
      ...mockTask,
      status: 'done' as const,
    };
    
    render(<TaskCard task={doneTask} onToggle={() => {}} />);
    const title = screen.getByText('Test Task');
    expect(title).toHaveClass('line-through');
  });
  
  it('should show checklist progress', () => {
    const taskWithChecklist = {
      ...mockTask,
      checklist: [
        { id: '1', text: 'Item 1', checked: true },
        { id: '2', text: 'Item 2', checked: false },
        { id: '3', text: 'Item 3', checked: true },
      ],
    };
    
    render(<TaskCard task={taskWithChecklist} onToggle={() => {}} />);
    expect(screen.getByText('2 / 3 完了')).toBeInTheDocument();
  });
});
