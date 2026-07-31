\### タイトル

Suno Visualizer on Cloudflare Workers — 設計書



\### 1. 目的

\- Sunoの曲URLを貼るだけで、クライアント側でリアルタイムに音楽可視化できるようにする

\- Worker側は「Suno情報の解決（ID抽出・音声URL・カバーURL取得）」に専念

\- 可視化自体はブラウザ（p5.js + Web Audio）で行う



\### 2. 全体アーキテクチャ

```

\[クライアント]

&#x20; ↓ Suno URLを送信

\[Worker /api/suno]

&#x20; ↓ ID抽出 → 音声/カバーURL解決

\[クライアント]

&#x20; ↓ audio\_url + cover\_url を受け取る

\[p5.js + Web Audio]

&#x20; → リアルタイム可視化

```



\### 3. Worker側の責務

\- Suno URLのパース（`/song/{uuid}` と `/s/{short}` の両方対応）

\- 曲IDの抽出

\- 音声URL・カバー画像URLの解決

\- タイトルなどのメタ情報取得（可能な範囲で）

\- エラーハンドリング（存在しない曲、非公開など）



\### 4. クライアント側の責務

\- URL入力UI

\- Workerへのリクエスト

\- カバー画像の表示

\- Web Audio APIで音声解析（FFTなど）

\- p5.jsによる可視化描画

\- （将来）MediaRecorderで録画機能



\### 5. 技術選定

\- Worker: 既存のcloudflare-labsプロジェクトにFunctionsを追加

\- フロント: 素のHTML + p5.js（CDN）

\- 通信: 単純なJSON API



\### 6. 今後の拡張候補

\- カスタムビジュアライザー選択

\- マイク入力対応

\- 録画してダウンロード

\- 複数曲キュー



