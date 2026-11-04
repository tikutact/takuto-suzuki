# 総点検レポート（2026-11）

対象: `tikutact/takuto-suzuki`（main = `19d2ade` 時点）／作業ブランチ `claude/takuto-suzuki-audit-0wrxu3`
方法: 静的なコードレビューと、秘密情報なしで動くチェック（型チェック・lint・build・`next start` での実測・追加したユニットテスト）。
**本番の Stripe・Vercel・Formspree には一切接続していない**ので、Stripe 側の実際の設定値（上限・送料レート・決済手段など）は
見ていない。そこは「4. 人間が判断・確認すべきこと」に回した。テストデータは架空の `plink_TEST_*` のみ。

行番号は、直したものは **main（`19d2ade`）時点**、直していないものは現在のブランチの行。

---

## 1. 実害につながる問題（優先度順）

### 1-1. 再入荷スクリプトが「中断してください」と出した直後に上限を書き換える → 枠が二重に増えて売り越す 【修正済み】
- **場所**: `scripts/bump-restock.mjs:74-81`（main 時点）
- **条件**: 次のどちらか。
  - 同じコマンドを2回打つ（1回目が通ったか分からず再実行、など）。
  - `docs/shop-emails.md` §3 の手順どおり **shop.ts の `restocked` を先に +1 してから** このスクリプトを実行する。
- **壊れ方**: スクリプトは「shop.ts の現在値 + by」を新しい上限にする。Stripe 側（31）と shop.ts（31→32 に編集済み、または 2回目）が
  ずれていると「⚠ 一致していません…想定と違う場合はCtrl+Cで中断してください」と表示するが、**待ち時間なしで次の行で POST する**ので中断できない。
  上限は 33 になり、サイトは 32 で Sold Out を出すが、Payment Link の URL（ブックマーク・共有済み URL）からは 33 冊目まで決済が通る
  ＝**手元に無い1冊分の注文が入る**。サイトのランタイム（`src/lib/stripe.ts`）は上限値そのものを見ていないので、ここでは止まらない（2-1 参照）。
- **ついでに見つかった同種の穴**（同じ関数で塞いだ）:
  - 渡した `plink_...` が shop.ts の `paymentLinkId` と違っても照合しない＝**別商品・旧リンク・テスト用リンクの上限を fade-stay の枠で書き換える**。
  - shop.ts が `soldOut: true` でも上限を上げて **リンクを再有効化する**（`:86-87`）。サイトは Sold Out のまま、URL を知る人だけ買える状態になる。
- **修正**: 判定を `scripts/_restock-plan.mjs` の純粋関数に切り出し、上の3条件では**何も変更せずに終了**するようにした（意図的なら `--force`）。
  先に落ちるテストを書いてから実装（`scripts/_restock-plan.test.mjs`、6件）。`docs/shop-emails.md` に実行順も追記。
  コミット: `1cfe298`, `e2c2d67`

### 1-2. Payment Link 作成スクリプトの重複チェックが、失敗時と「ダッシュボードで作ったリンク」を素通しする → 有効なリンクが2本になる 【修正済み】
- **場所**: `scripts/create-payment-link.mjs:78-82`（main 時点）
- **条件**:
  - 有効リンク一覧の GET がレート制限・一時障害などで失敗した（`res.ok` を見ずに `existing.data ?? []` → 空＝「重複なし」）。
  - もしくは現行リンクに `metadata.slug` が付いていない（ダッシュボードで手作りしたリンク・スクリプト化以前のリンク）。照合は `metadata.slug` だけ。
- **壊れ方**: `--live` で再実行すると新しい有効なリンクがもう1本でき、それぞれが独立に上限 31 を持つ。サイトは新リンクに貼り替えても、
  旧 URL が生きていれば合計で枠を超えて売れる（スクリプト自身のコメントにある「実質60」の状態）。
- **修正**: `findDuplicateLinks()`（`scripts/_shop-config.mjs`）に切り出し、取得失敗・100件超（`has_more`）は作成せず停止、
  shop.ts の `paymentLinkId` と同じ ID も重複として扱う。テスト5件を先に書いてから実装。コミット: `47a2d1d`
- **現行リンクに metadata が付いているかは未確認**（4-3）。

### 1-3. 発売前チェッカーが「割引コード」と「決済完了画面の発送日数」を見ていない 【修正済み】
- **場所**: `scripts/check-payment-link.mjs`（価格チェック `:123` 付近、送料チェックの後）
- **条件/壊れ方**:
  - ダッシュボードで「プロモーションコードを許可」を ON にすると、表示価格 ¥2,500 より安く決済できる。価格チェックは明細の定価（`amount_total`）しか見ないので「すべて OK」になる。
  - `SHIPPING_DAYS` を変えても、作成時に焼き込んだ完了画面の文言（`create-payment-link.mjs:135`「◯営業日以内に発送します」）は古いまま。
    サイト2ページは追従するので、**購入直後に客が見る約束だけが食い違う**。どこでも検出されなかった。
- **修正**: `allow_promotion_codes` が true なら ✗、完了画面に書かれた「N営業日」が `SHIPPING_DAYS` と違えば ✗ にする検査を追加。コミット: `27d51c2`
  （本番リンクに対しては未実行。次回 `--live` で回したときに新しい2項目の結果を見てほしい）

### 1-4. お問い合わせフォームのラベルが入力欄に紐づいていない 【修正済み】
- **場所**: `src/app/contact/page.tsx:80-121`（main 時点）
- **壊れ方**: `<label>` に `htmlFor` が無く入力欄にも `id` が無いため、スクリーンリーダーでは placeholder しか手がかりがない。
  このフォームは特商法ページで**不良品連絡の窓口**として案内しているので、支援技術の利用者が連絡できないのは実害寄り。
  エラー表示も読み上げられなかった。
- **修正**: `htmlFor`/`id` を付与し、エラー枠に `role="alert"`。build 後の HTML で `for="contact-name"` 等の出力を確認。コミット: `4e3221e`

---

## 2. 条件付きで壊れるもの・軽微なもの（未修正）

### Shop / Stripe
- **2-1. サイトは Stripe の「上限値」を見ていない**（`src/lib/stripe.ts:98`、`src/lib/sale-status.ts:30`）。
  読むのは完了件数 `count` だけで、`limit` が `salesCap()` と違っても気づかない。上限が大きすぎる（1-1 の二重 bump、手作業の打ち間違い）と、
  サイトは Sold Out でも URL からは買える。上限が小さすぎると Stripe が先に止め、サイトは「Available Soon」になる（売り逃しで済む）。
  `limit !== salesCap` を検出してログ＋`unavailable` にするのは小さな変更だが、**本番の表示を止める方向の変更**で実 API で検証できないため見送った（4-1）。
- **2-2. 価格・送料をコードで変えても、ランタイムは Stripe の金額と突き合わせない**（`src/lib/stripe.ts` は `line_items` を展開済みだが金額を読まない）。
  `price` / `SHIPPING_JPY` だけ変えて push し、リンクを作り直し忘れると「サイト表示 ≠ 請求額」のまま売れる。検出手段は手動の `check-payment-link.mjs` だけ。
  2-1 と同じ理由で直していない。
- **2-3. 一時停止中のリンクでも「完売しました」と表示される**（`scripts/create-payment-link.mjs:130` の `inactive_message`）。
  価格改定で旧リンクを止めたとき・一時停止したときに、旧 URL を開いた客に事実でない「完売」を見せる。サイト側はわざわざ Sold Out と Available Soon を
  分けている（`sale-status.ts`）のと方針がずれる。文言は人が決めること（4-5）。
- **2-4. Stripe API が失敗している間は常に Purchase を出す**（`sale-status.ts:22`）。設計どおり（最後の砦は Stripe 側の上限）で問題ではないが、
  Vercel 本番の `STRIPE_SECRET_KEY` が未設定・テストキーだと**自動 Sold Out が永久に働かない**のに画面は正常に見える。
  秘密なしの build でも実際に `Purchase` が出ることを確認した（ログには `[shop] STRIPE_SECRET_KEY が未設定です` が出る）。
- **2-5. ISR のキャッシュ**: `/shop` は `Cache-Control: s-maxage=60, stale-while-revalidate=31535940`（`next start` で実測）。
  完売直後の最初の1アクセスは古い Purchase 表示を受け取りうる。リンクは Stripe が止めるので決済は通らない＝実害なし。
- **2-6. 返金の「代金全額」に送料を含むかが文面で曖昧**（`src/app/tokushoho/page.tsx:102`「代金全額を返金」、`docs/shop-emails.md:89`「代金 {金額} 円を全額返金」）。4-6。
- **2-7. 問い合わせの件名が2系統ある**: フォームとContactページは `【takutosuzuki.com】`（`contact/page.tsx:28,63`）、特商法ページの mailto は
  `【Fade, Stay】`（`tokushoho/page.tsx:42`）。`docs/shop-emails.md` は「`【Fade, Stay】` でフィルタ」とだけ書いている。特商法ページは不良品連絡に
  「お問い合わせフォーム**または**メール」を案内しているので、フォーム経由の不良品連絡は `【Fade, Stay】` フィルタに掛からない。両方のフィルタがあれば問題なし（4-7）。

### サイト全体
- **2-8. ページ title がほぼ全部同じ**: `/`・`/works`・`/works/2026`・`/works/fade-stay`・`/film`・`/biography`・`/contact` がすべて
  `TAKUTO SUZUKI — Photographer`（build 後の HTML で確認）。description・OGP も既定値。検索結果で区別できない。
  `/film`・`/contact`・`/` は `"use client"` のページなので metadata を出すには構成変更（サーバーの page/layout で包む）が要り、文言も作者が決めるべきなので見送り。
  あわせて canonical がどのページにも無い（apex/www の扱いは Vercel 側の転送次第）。
- **2-9. `/tokushoho` の OGP は既定値を継承**（`title` だけ上書き）。共有すると「TAKUTO SUZUKI — Photographer」で出る。軽微。
- **2-10. robots.txt が無い**（`/robots.txt` は 404 を実測）。クロールは妨げないが、sitemap の場所を検索エンジンに伝える手段が Search Console だけ。
- **2-11. トップのスライドショー**（`src/app/page.tsx`）
  - alt が「Photo 1」〜「Photo 4」（`:7-17`）で内容を表さない。
  - 4秒ごとに自動で切り替わり停止手段が無い（`:24`）。`prefers-reduced-motion` も見ていない（WCAG 2.2.2）。
  - `fill` で `sizes` 未指定のため既定の `100vw` 扱い。スマホでは 65% 幅、PC では 60vw 幅なので、必要より大きい画像を取りに行く。
    さらに `priority` がモバイル用・PC 用の両方の1枚目に付いているので、**どちらの端末でも使わない側の1枚目を preload する**。
- **2-12. `/works` の一覧で全カバーに `priority`**（`src/app/works/page.tsx:26`）。現在2シリーズなので影響は小さいが、増えるほど初期読み込みが重くなる。`sizes` も未指定。
- **2-13. モバイルメニュー**（`src/components/Nav.tsx:106-114`）: 閉じている間も `max-h-0 overflow-hidden` で隠しているだけなので、
  Tab キー／スクリーンリーダーで見えないリンクにフォーカスが移る。トグルボタンに `aria-expanded` が無い。
- **2-14. Film ページ**（`src/app/film/page.tsx`）: 動画セルが `div onClick`（`:51`）でキーボード操作できない。モーダルに `role="dialog"`・フォーカス移動が無く、
  閉じるボタンは「✕」だけ（`:105`、`aria-label` なし）。
- **2-15. ページ全体が JS 実行まで不可視**（`src/components/PageTransition.tsx:28` の `style={{ opacity: 0 }}`）。JS が失敗・無効だと本文が見えない
  （特商法ページも含む）。`prefers-reduced-motion` も未対応。
- **2-16. `X-Powered-By: Next.js` が出ている**（実測）。`poweredByHeader: false` で消せる。CSP・HSTS は next.config では未設定
  （HSTS は Vercel が独自ドメインに付けるはずだが未確認）。
- **2-17. 未使用ファイル**: `src/components/Footer.tsx`（どこからも import されていない）、`public/{file,globe,next,vercel,window}.svg`（create-next-app の残り）。
  README も create-next-app のまま。
- **2-18. 依存**: `npm audit --omit=dev` は 0 件。dev 依存に moderate（ESLint 経由の `minimatch`）があるが、本番には載らない。

---

## 3. 調べたが問題なかった箇所

- **売り切れ判定の分岐**（`sale-status.ts`）: 手動 soldOut → 未発売 → API 失敗 → 上限なし／数量可変 → 件数 ≥ 枠 → 停止中 の順で、
  「Sold Out を事実なしに出さない」「死んだリンクに送らない」が両立している。`soldCount >= salesCap` の境界も正しい。
- **未発売の型制約**（`shop.ts:9-21`）とビルド時アサーション（`edition < 1`・`plink_` 接頭辞・`restocked < 0`・`edition > totalEdition`）は意図どおり働く。
- **表示の単一ソース化**: 送料・発送日数・配送方法・表紙ポリシーは `/shop` と `/tokushoho` の両方が `shop.ts` の定数を参照（数字の手打ちなし）。
  部数も `edition`/`totalEdition` から生成。`docs/shop-emails.md` の数字（5営業日・7日以内・レターパックライト・返送不要）も現行の定数と一致。
- **鍵の扱い**（`scripts/_shop-config.mjs:24-42`）: `--live` を明示しないと本番キーを拒否、LIVE 変数にテストキーでも拒否。鍵はログに出していない。
- **作成スクリプトの冪等キー**は設定値から導出しており、同設定の再実行は Stripe 側で重複しない（24時間以内）。数量1固定・JP のみ・Stripe Tax 無効・送料レートあり・
  後払い系なしで作るパラメータになっている。
- **チェッカー**: モードの一致、soldOut/上限到達時の active、URL と ID の一致、価格、数量、決済手段、上限値、配送先、送料額、セッションのページ送りまで見ている。
- **クライアントへの秘密値の露出なし**: `.next/static` に `STRIPE_`・`sk_live`・`sk_test` は出現しない。`STRIPE_SECRET_KEY` を読むのはサーバー側 `src/lib/stripe.ts` だけ。
  `.env*` は `.gitignore` 済み。公開しているのは連絡先メール・Formspree のフォーム ID・Search Console の確認トークンで、いずれも公開前提の値。
- **画像の位置情報**: `public/` の JPEG 全件の EXIF を走査し、GPS 情報を含むものは無かった。参照している画像・OG 画像・動画はすべて存在する（欠損0）。
  OG 画像は 1200×630。商品画像の width/height は実ファイル（1800×2400）と一致。`images.qualities` に 90 が入っており `quality={90}` が丸められない。
- **旧 URL の転送**: `/works/cast` → `/works/2026` が 308 で返ることを実測。sitemap は公開ページのみで、noindex の Journal と下書き記事は含まれない（下書きは 404）。
- **Next.js 16 の書き方**: `node_modules/next/dist/docs` で確認。Cache Components 無効の構成なので `export const revalidate = 60` は有効（有効化すると削除が必要になる点だけ注意）。
  `params` を `Promise` で受けて `await` している書き方も現行仕様どおり。
- **セキュリティヘッダー**: X-Frame-Options・nosniff・Referrer-Policy・Permissions-Policy は全パスに付いている（実測）。

---

## 4. 人間が判断・確認すべきこと

1. **（2-1/2-2）ランタイムで Stripe の上限値・金額も突き合わせて、ずれていたら売り止めるか**。安全側だが、判定を誤ると本番で「Available Soon」になる。
   入れる場合は、テストモードのリンクで `limit`・`line_items.data[0].amount_total` の実際の値を確認してから。
2. **`node scripts/check-payment-link.mjs --live` を今の main で回す**。新しく足した「割引コード」「完了画面の発送日数」の2項目を含め、全項目が ✓ か。
3. **現行の本番リンク `plink_1U5e…` に `metadata.slug=fade-stay` が付いているか**（ダッシュボードの Payment Link 詳細 → メタデータ）。
   1-2 の修正で shop.ts の ID でも照合するようにしたが、もっと古いリンクが有効のまま残っていないかも「Payment Links」一覧で確認してほしい。
4. **特商法の「最終確認画面」表示（2022年6月施行の改正）**: Stripe の決済画面には価格・数量・送料は出るが、**引渡し時期・返品条件・申込みの撤回**は
   そのままでは出ない。Payment Link の「カスタムテキスト」（決済ボタン付近）に発送時期と返品条件、`/tokushoho` へのリンクを入れるかどうか。法的な判断なのでコードでは触っていない。
5. **（2-3）一時停止時の `inactive_message`**: 「完売しました」を、停止理由を問わない文言（例: 「現在このページからはお求めいただけません。最新の情報は takutosuzuki.com/shop をご覧ください。」）にするか。既存リンクはダッシュボードで変更可能。
6. **（2-6）不良品で在庫切れのときの返金額に送料 ¥430 を含めるか**。含めるなら特商法ページを「商品代金および送料の全額」に。
7. **（2-7）Gmail に `【takutosuzuki.com】` のフィルタもあるか**。無ければフォーム経由の不良品連絡が埋もれる（7日以内の対応期限）。
8. **Vercel 本番の環境変数**: `STRIPE_SECRET_KEY` が本番キー（読み取り専用の制限付きキー推奨）で入っているか。Vercel のランタイムログに `[shop]` で始まるエラーが出ていないか。
9. **（2-8）各ページの title / description の文言**を決めてもらえれば、構成変更込みで対応できる。
10. **決済手段**: 作成スクリプトは `card` と `link`（Stripe のカード保存ウォレット）で作る。特商法ページの「クレジットカード決済（Stripe）」の表記で足りるか。

---

## 5. 実行したチェックとその結果

| チェック | 結果 |
|---|---|
| `npm ci` | 成功 |
| `npx tsc --noEmit` | エラー 0（修正前・修正後とも） |
| `npx eslint .` | 警告・エラー 0（修正前）。修正後も `src/app/contact` で 0 |
| `next build`（`STRIPE_SECRET_KEY` なし） | 成功。`/shop` は ISR 60s。ログに想定どおり「STRIPE_SECRET_KEY が未設定」 |
| `next start` + curl | ヘッダー・`/works/cast` の 308・sitemap の中身・`/robots.txt` 404・下書き記事 404 を確認 |
| `npm test`（新設: `node --test 'scripts/*.test.mjs'`） | 11 件すべて成功（修正前は対象モジュールが無く失敗） |
| `npm audit --omit=dev` | 0 件（dev 依存に moderate 1系統） |
| ビルド成果物の秘密値 grep / 画像 EXIF の GPS 走査 / 参照アセットの存在確認 | 問題なし |
| `scripts/check-payment-link.mjs`・`create-payment-link.mjs`・`bump-restock.mjs` の実行 | **未実行**（Stripe の鍵を渡されておらず、本番・テストとも外部サービスに接続しない方針のため）。`node --check` での構文確認のみ |
| 実機・ブラウザでのスマホ表示確認 | 未実施（コードから読める範囲のみ。2-11・2-13・2-14 はコード上の指摘） |
