# 05 UI スタイルガイド

作成日: 2025-05-18

## パレット
| 役割 | HEX |
| ---- | --- |
| Primary | #6366F1 |
| Accent | #F97316 |
| Success | #10B981 |
| Danger | #EF4444 |
| BG Light | #F8FAFC |
| BG Dark | #1E293B |

## タイポ
| Role | Tailwind classes |
| ---- | ---------------- |
| H1 | text-2xl font-bold |
| H2 | text-xl font-semibold |
| Body | text-base |
| Caption | text-sm text-slate-500 |

## コンポーネント
- **Button**: `rounded-full shadow px-4 py-2 font-semibold`  
- **Card**: `rounded-2xl p-4 shadow-sm`  
- **Modal**: center + backdrop blur

## アクセシビリティ
- コントラスト比 4.5:1 以上  
- フォーカスリング `ring-2 ring-offset-2`  
- ESC でモーダル閉じ