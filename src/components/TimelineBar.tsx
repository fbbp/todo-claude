import { useMemo } from 'react';
import type { Task } from '../db';

interface TimelineBarProps {
  tasks: Task[];
  date: Date;
}

export function TimelineBar({ tasks, date }: TimelineBarProps) {
  const { dayTasks, currentTimePosition } = useMemo(() => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const dayTasks = tasks
      .filter(task => task.dueAt && task.dueAt >= startOfDay.getTime() && task.dueAt <= endOfDay.getTime())
      .sort((a, b) => a.dueAt! - b.dueAt!);
    
    const now = new Date();
    const currentTimePosition = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
    
    return { dayTasks, currentTimePosition };
  }, [tasks, date]);
  
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  return (
    <div className="relative bg-muted rounded-lg p-4">
      {/* 時間軸 */}
      <div className="relative h-20">
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute top-0 h-full border-l border-border"
            style={{ left: `${(hour / 24) * 100}%` }}
          >
            <span className="absolute -top-6 -left-3 text-xs text-muted-foreground">
              {hour.toString().padStart(2, '0')}
            </span>
          </div>
        ))}
        
        {/* 現在時刻ライン */}
        {date.toDateString() === new Date().toDateString() && (
          <div
            className="absolute top-0 h-full w-0.5 bg-primary"
            style={{ left: `${currentTimePosition}%` }}
          >
            <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-primary" />
          </div>
        )}
        
        {/* タスク */}
        {dayTasks.map((task) => {
          const taskTime = new Date(task.dueAt!);
          const position = ((taskTime.getHours() * 60 + taskTime.getMinutes()) / (24 * 60)) * 100;
          const duration = task.durationMin || 30;
          const width = (duration / (24 * 60)) * 100;
          
          return (
            <div
              key={task.id}
              className="absolute top-1/2 -translate-y-1/2 h-8 bg-primary/20 border border-primary rounded px-2 overflow-hidden"
              style={{
                left: `${position}%`,
                width: `${Math.max(width, 2)}%`,
              }}
              title={task.title}
            >
              <span className="text-xs font-medium truncate">{task.title}</span>
            </div>
          );
        })}
      </div>
      
      {/* 今日の予定 */}
      <div className="mt-6">
        <h3 className="font-medium mb-2">今日の予定</h3>
        {dayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">予定はありません</p>
        ) : (
          <div className="space-y-1">
            {dayTasks.map((task) => {
              const time = new Date(task.dueAt!);
              return (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={task.status === 'done' ? 'line-through' : ''}>
                    {task.title}
                  </span>
                  {task.durationMin && (
                    <span className="text-muted-foreground">
                      ({task.durationMin}分)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}