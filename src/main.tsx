import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeDB } from './db';

// Initialize database before rendering app
initializeDB().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}).catch((error) => {
  console.error('Failed to initialize app:', error);
  // エラー時でもUIは表示する（ユーザーにエラーメッセージを表示）
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">データベースの初期化に失敗しました</h1>
          <p className="mt-2 text-gray-600">ページをリロードしてください</p>
        </div>
      </div>
    </React.StrictMode>,
  );
});
