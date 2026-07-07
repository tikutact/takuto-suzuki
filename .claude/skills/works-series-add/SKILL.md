---
name: works-series-add
description: TAKUTO SUZUKIポートフォリオに新しいWorksシリーズを追加する定常フロー。画像リサイズからsitemap更新・公開確認まで
---

# Worksシリーズ追加フロー

1. **画像を準備**: `sips -Z 1800` でリサイズして `public/images/<series>-01.jpg` 〜 連番で配置（**元ファイルは削除禁止**）。カバーはシリーズを代表する1枚
2. **詳細ページ作成**: `src/app/works/<slug>/page.tsx`。既存の `cast/page.tsx` を雛形に:
   - `photos` 配列（縦横ミックスの並び順は意図的に組む）
   - `JsonLd`（`seriesLd` + `breadcrumb`）と `BackLink` を忘れずに
   - レイアウト: 1枚ずつ縦スクロール、`max-h-[82vh] object-contain`、グリッド不可
3. **一覧に追加**: `src/app/works/page.tsx` の `series` 配列に `{ slug, title, year, cover }`
4. **ナビ確認**: 左パネル/モバイルメニューのWorksシリーズ一覧に新シリーズが出ることを確認（ハードコードなら追記）
5. **★sitemap.ts に手動追加**: `src/app/sitemap.ts` は静的ルートを手打ち列挙している。**忘れて実際に漏れた実績あり**。`/works/<slug>` を必ず追加
6. **本番ビルドで確認**: dev modeはLAN経由モバイルでJSが動かないので、モバイル確認は `npm run build && npm start`
7. **git commit → push**（Vercel自動デプロイ）
8. **Search Console登録**: URL検査 → `/works/<slug>` のインデックス登録リクエスト

## 参照

- レイアウト・命名の詳細基準: メモリ `project_takuto_works_rules`
- draft運用のあるJournal記事追加は別フロー（`src/lib/journal.ts` に `draft: true` で追記 → 公開時にフラグを外す）
