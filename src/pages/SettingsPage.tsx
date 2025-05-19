import { useState, useRef } from 'react';
import { Download, Upload, Save, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSettings } from '@/store/useSettings';
import { exportData, downloadJSON, readFile, importData } from '@/utils/export-import';
import { useTasks } from '@/store/useTasks';
import { useCategories } from '@/store/useCategories';

export function SettingsPage() {
  const { settings, updateSetting } = useSettings();
  const { load: loadTasks } = useTasks();
  const { load: loadCategories } = useCategories();
  
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // エクスポート処理
  const handleExport = async () => {
    try {
      const data = await exportData();
      downloadJSON(data);
    } catch (error) {
      console.error('エクスポートエラー:', error);
    }
  };
  
  // ファイル選択処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportDialogOpen(true);
      setImportError(null);
    }
  };
  
  // インポート処理
  const handleImport = async () => {
    if (!selectedFile) return;
    
    setImporting(true);
    setImportError(null);
    
    try {
      const content = await readFile(selectedFile);
      const data = JSON.parse(content);
      
      await importData(data, importMode);
      
      // データを再読み込み
      await loadTasks();
      await loadCategories();
      
      setImportDialogOpen(false);
      setSelectedFile(null);
      
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'インポートに失敗しました');
    } finally {
      setImporting(false);
    }
  };
  
  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto p-4">
          <h1 className="text-2xl font-bold mb-6">設定</h1>
          
          {/* 通知設定 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
              <CardDescription>タスクのリマインダー通知に関する設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="snooze-duration">スヌーズ時間（分）</Label>
                <Input
                  id="snooze-duration"
                  type="number"
                  value={settings.snoozeDuration || 10}
                  onChange={(e) => updateSetting('snoozeDuration', parseInt(e.target.value))}
                  className="w-24"
                  min="1"
                  max="60"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* データ管理 */}
          <Card>
            <CardHeader>
              <CardTitle>データ管理</CardTitle>
              <CardDescription>タスクとカテゴリーのバックアップ・復元</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">エクスポート</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  全てのタスク、カテゴリー、設定をJSONファイルとしてダウンロードします
                </p>
                <Button onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  データをエクスポート
                </Button>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">インポート</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  JSONファイルからデータを読み込んで復元します
                </p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  データをインポート
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* インポート確認ダイアログ */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>データのインポート</DialogTitle>
            <DialogDescription>
              選択したファイルからデータをインポートします
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">インポートモード</p>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                  />
                  <span>置き換え（既存のデータを全て削除して入れ替え）</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                  />
                  <span>マージ（既存のデータに追加）</span>
                </label>
              </div>
            </div>
            
            {importError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={importing}
            >
              キャンセル
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
                  インポート中...
                </>
              ) : (
                'インポート実行'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}