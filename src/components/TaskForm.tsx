import { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, Repeat } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RRule, type Frequency } from 'rrule';
import type { Task } from '../db';

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  onSubmit: (task: Partial<Task>) => void;
  onDelete?: (id: string) => void;
}

export function TaskForm({ open, onOpenChange, task, onSubmit, onDelete }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [dueDate, setDueDate] = useState(
    task?.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : ''
  );
  const [dueTime, setDueTime] = useState(
    task?.dueAt ? new Date(task.dueAt).toTimeString().split(' ')[0].slice(0, 5) : ''
  );
  const [durationMin, setDurationMin] = useState(task?.durationMin?.toString() || '');
  const [checklist, setChecklist] = useState(task?.checklist || []);
  
  // 繰り返し設定のステート
  const [repeatEnabled, setRepeatEnabled] = useState(!!task?.repeatRule);
  const [repeatFrequency, setRepeatFrequency] = useState<string>('DAILY');
  const [repeatInterval, setRepeatInterval] = useState('1');
  const [repeatUntil, setRepeatUntil] = useState(
    task?.repeatUntil ? new Date(task.repeatUntil).toISOString().split('T')[0] : ''
  );
  
  // 既存のタスクからRRULEを解析
  useState(() => {
    if (task?.repeatRule) {
      try {
        const rrule = RRule.fromString(task.repeatRule);
        setRepeatFrequency(RRule.FREQUENCIES[rrule.options.freq]);
        setRepeatInterval(rrule.options.interval?.toString() || '1');
        if (rrule.options.until) {
          setRepeatUntil(rrule.options.until.toISOString().split('T')[0]);
        }
      } catch (error) {
        console.error('Failed to parse RRULE:', error);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    let dueAt: number | undefined;
    if (dueDate) {
      const dateTime = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T00:00`;
      dueAt = new Date(dateTime).getTime();
    }
    
    // RRULEを生成
    let repeatRule: string | undefined;
    let repeatUntilTimestamp: number | undefined;
    if (repeatEnabled && dueAt) {
      const freq = RRule[repeatFrequency as keyof typeof RRule] as Frequency;
      const rruleOptions: any = {
        freq,
        interval: parseInt(repeatInterval) || 1,
        dtstart: new Date(dueAt),
      };
      
      if (repeatUntil) {
        const untilDate = new Date(repeatUntil);
        untilDate.setHours(23, 59, 59, 999);
        rruleOptions.until = untilDate;
        repeatUntilTimestamp = untilDate.getTime();
      }
      
      const rrule = new RRule(rruleOptions);
      repeatRule = rrule.toString();
    }

    const taskData = {
      id: task?.id,
      title: title.trim(),
      dueAt,
      durationMin: durationMin ? parseInt(durationMin) : undefined,
      checklist: checklist.filter((item: any) => item.text.trim()),
      repeatRule,
      repeatUntil: repeatUntilTimestamp,
    };

    onSubmit(taskData);

    onOpenChange(false);
  };
  
  const addChecklistItem = () => {
    setChecklist([
      ...checklist,
      { id: crypto.randomUUID(), text: '', checked: false }
    ]);
  };
  
  const updateChecklistItem = (id: string, updates: Partial<typeof checklist[0]>) => {
    setChecklist(checklist.map((item: any) =>
      item.id === id ? { ...item, ...updates } : item
    ));
  };
  
  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item: any) => item.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{task ? 'タスクを編集' : '新しいタスク'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タスクのタイトル"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">期日</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="dueTime">時刻</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="dueTime"
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="duration">所要時間（分）</Label>
              <Input
                id="duration"
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="60"
                min="1"
              />
            </div>
            
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="repeat"
                  checked={repeatEnabled}
                  onCheckedChange={(checked) => setRepeatEnabled(!!checked)}
                />
                <Label htmlFor="repeat" className="flex items-center gap-2 cursor-pointer">
                  <Repeat className="h-4 w-4" />
                  繰り返し
                </Label>
              </div>
              
              {repeatEnabled && (
                <div className="space-y-3 pl-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="frequency">頻度</Label>
                      <Select value={repeatFrequency} onValueChange={setRepeatFrequency}>
                        <SelectTrigger id="frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">毎日</SelectItem>
                          <SelectItem value="WEEKLY">毎週</SelectItem>
                          <SelectItem value="MONTHLY">毎月</SelectItem>
                          <SelectItem value="YEARLY">毎年</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="interval">間隔</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="interval"
                          type="number"
                          value={repeatInterval}
                          onChange={(e) => setRepeatInterval(e.target.value)}
                          min="1"
                          max="99"
                        />
                        <span className="text-sm text-muted-foreground">
                          {repeatFrequency === 'DAILY' && '日ごと'}
                          {repeatFrequency === 'WEEKLY' && '週ごと'}
                          {repeatFrequency === 'MONTHLY' && 'ヶ月ごと'}
                          {repeatFrequency === 'YEARLY' && '年ごと'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="repeatUntil">終了日</Label>
                    <Input
                      id="repeatUntil"
                      type="date"
                      value={repeatUntil}
                      onChange={(e) => setRepeatUntil(e.target.value)}
                      min={dueDate}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      空欄の場合は無期限に繰り返します
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>チェックリスト</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={addChecklistItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>
              
              <div className="space-y-2">
                {checklist.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) =>
                        updateChecklistItem(item.id, { checked: !!checked })
                      }
                    />
                    <Input
                      value={item.text}
                      onChange={(e) =>
                        updateChecklistItem(item.id, { text: e.target.value })
                      }
                      placeholder="サブタスク"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeChecklistItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            {task && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete(task.id!);
                  onOpenChange(false);
                }}
              >
                削除
              </Button>
            )}
            <Button type="submit">
              {task ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}