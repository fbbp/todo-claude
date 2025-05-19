import { Check, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Task } from '../db';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onClick?: (task: Task) => void;
}

export function TaskCard({ task, onToggle, onClick }: TaskCardProps) {
  const isOverdue = task.dueAt && task.dueAt < Date.now() && task.status === 'pending';
  
  return (
    <Card 
      id={`task-${task.id}`}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        task.status === 'done' && 'opacity-60'
      )}
      onClick={() => onClick?.(task)}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <Checkbox
          checked={task.status === 'done'}
          onCheckedChange={() => onToggle(task.id!)}
          onClick={(e) => e.stopPropagation()}
          className="h-5 w-5"
        />
        
        <div className="flex-1">
          <h3 className={cn(
            'font-medium',
            task.status === 'done' && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </h3>
          
          {task.dueAt && (
            <p className={cn(
              'text-sm text-muted-foreground',
              isOverdue && 'text-destructive'
            )}>
              期限: {new Date(task.dueAt).toLocaleDateString()}
            </p>
          )}
          
          {task.checklist && task.checklist.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              {task.checklist.filter((item: any) => item.checked).length} / {task.checklist.length} 完了
            </div>
          )}
        </div>
        
        {task.status === 'done' ? (
          <Check className="h-5 w-5 text-success" />
        ) : (
          <Circle className={cn(
            'h-5 w-5',
            isOverdue ? 'text-destructive' : 'text-muted-foreground'
          )} />
        )}
      </CardContent>
    </Card>
  );
}
