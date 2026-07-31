\# Suno Visualizer on Cloudflare Workers



\## 概要

Sunoの曲URLを貼るだけで、リアルタイムに音楽可視化するWebアプリ。  

Cloudflare Workers + 静的HTMLのみで構成し、Nodeプロジェクトを一切使わずに実装した。



\## きっかけ

\- Cloudflare Workersを「Vercel的に」使いたかった

\- 最初は静的ページ（D3.jsサンプル）からスタート



\## 作ったもの

\- \*\*Worker API\*\* (`/api/suno`)

&#x20; - Suno URL（フル・短縮両対応）を解析

&#x20; - 音声URL・カバー画像・タイトルを返す

\- \*\*クライアント\*\* (`visualizer.html`)

&#x20; - p5.js + Web Audio APIによるリアルタイム可視化

&#x20; - カバー表示・再生コントロール付き



\## 技術的な流れ



\### 1. 基盤構築

\- `cloudflare\_labs` リポジトリ作成

\- Cloudflare Workersで静的配信（`public/`）

\- 余計なNode開発環境を排除してシンプルに保つ



\### 2. 設計

\- `design-suno-visualizer.yaml` を作成

\- 「Workerはメタデータ解決だけ、可視化はクライアント」という分担を明確化

\- ローカル開発環境禁止を制約として明記



\### 3. 実装

\- Worker（`index.ts`）: Suno URLを解析し、音声・カバー・タイトルを返す

\- クライアント（`visualizer.html`）: p5.js + Web Audioでリアルタイム可視化



\### 4. 詰まったポイントと解決

| 問題 | 解決 |

|------|------|

| 短URLがパースできない | 正規表現を修正 |

| 短URLが「Song not found」になる | リダイレクトを追って本物のUUIDを取得 |

| タイトルが取れない | ページfetchで `og:title` / `og:image` を取得 |



\### 5. 結果

\- フルURL・短URL両方対応

\- タイトル・カバー画像・音声再生・リアルタイム可視化がすべて動作

\- Git push → 自動デプロイの流れが確立



\## ポイント

Nodeプロジェクトを作らずに、静的ファイル + 単一Workerだけで  

「pushしたらエッジに載る」Vercel的な体験を実現した。

