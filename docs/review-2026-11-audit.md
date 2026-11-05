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

## 2. 条件付きで壊れるもの・軽微なもの

> **2026-11-05 追補**: 2-9・2-10・2-12〜2-17 を作業ブランチ `claude/audit-followups-rj8iyn`（PR #15）で修正した。
> 各項目末尾の「→ 修正済み」に内容とコミットを書いた。行番号は修正前（main = `367fdb2`）時点。
> 2-13 は報告時の `:106-114` からずれており、実際は `src/components/Nav.tsx:143-182`（モバイル側のメニュー）だった。
>
> **2026-11-05 追補（3周目）**: 2-11（動きの部分）・2-12 の残り・2-15 の reduced-motion・2-16 の HSTS・2-19 を
> 作業ブランチ `fix/audit-followups-2` で修正した。各項目末尾の「→ 修正済み（3周目）」に書いた。2-20・2-21 は新規。
> 行番号の確認: 未修正項目の行は main（`69b07fc`）で読み直し、ずれていたのは 2-19 の `src/app/shop/page.tsx:32-37`（実際は `:32-36`）程度で、内容は報告どおりだった。

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
  → **修正済み（`04defde`）**: og/twitter の title・description をページの既存 title/description（見出し「特定商取引法に基づく表記」）に。
  openGraph はページで書くと layout の値が**丸ごと置き換わる**（Next の metadata は入れ子を浅くマージしない）ので、siteName/locale/type/画像も明示。build 後の HTML で確認。
- **2-10. robots.txt が無い**（`/robots.txt` は 404 を実測）。クロールは妨げないが、sitemap の場所を検索エンジンに伝える手段が Search Console だけ。
  → **修正済み（`4da631e`）**: `src/app/robots.ts`。`Allow: /` と `Sitemap: https://www.takutosuzuki.com/sitemap.xml`。
  noindex の `/journal` は Disallow に**しない**（塞ぐとクローラーが noindex を読めない）。sitemap の中身（公開8 URL、Journal・下書きなし）と下書き記事の 404 は変化なしを実測。
- **2-11. トップのスライドショー**（`src/app/page.tsx`）
  - alt が「Photo 1」〜「Photo 4」（`:7-17`）で内容を表さない。
  - 4秒ごとに自動で切り替わり停止手段が無い（`:24`）。`prefers-reduced-motion` も見ていない（WCAG 2.2.2）。
  - `fill` で `sizes` 未指定のため既定の `100vw` 扱い。スマホでは 65% 幅、PC では 60vw 幅なので、必要より大きい画像を取りに行く。
    さらに `priority` がモバイル用・PC 用の両方の1枚目に付いているので、**どちらの端末でも使わない側の1枚目を preload する**。
  → **動きの部分だけ修正済み（3周目、`ca2e0e3`）**: 「視差効果を減らす」設定の人には 1秒のクロスフェードをやめて即時に切り替える
  （`motion-reduce:transition-none`、`src/app/page.tsx:41,56`）。4秒ごとの切り替え自体は残した（止めると3枚が見えなくなるので見せ方の判断＝4-15）。
  通常設定の見た目は不変（計算後の `transition: opacity 1s` が修正前と同じことを Playwright で確認）。
  `priority` は同じ出力の `preload` に置き換えた（`330a3ea`）。alt・`sizes`・両端末の1枚目の preload・一時停止ボタンは未対応（4-15）。
- **2-12. `/works` の一覧で全カバーに `priority`**（`src/app/works/page.tsx:26`）。現在2シリーズなので影響は小さいが、増えるほど初期読み込みが重くなる。`sizes` も未指定。
  → **修正済み（`8477da7`）**: 先読みは1枚目だけ。Next 16 で `priority` は非推奨なので `preload={i === 0}` に。`sizes="(min-width: 768px) 54vw, 90vw"`。
  HTML で preload が1件・`imageSizes` 付き、2枚目は `loading="lazy"` になったことを確認。見た目は不変（2枚目は先読みされないだけで、画面内なら通常どおり読み込まれる）。
  ほかのページ（`/`・`/works/[slug]`・`/shop`）にも `priority` が残っている（非推奨だが動作する）。今回は範囲外。
  → **修正済み（3周目、`330a3ea`）**: 3ページの `priority` を `preload` に。Next 16 の `get-img-props.js` は `preload || priority` で同じ扱い
  （遅延読み込みの判定も同じ）。置き換え前後で `/`・`/shop`・`/works/2026`・`/works/fade-stay` の `<img>` と preload の `<link>`（58行）が完全に一致。
- **2-13. モバイルメニュー**（`src/components/Nav.tsx:106-114`）: 閉じている間も `max-h-0 overflow-hidden` で隠しているだけなので、
  Tab キー／スクリーンリーダーで見えないリンクにフォーカスが移る。トグルボタンに `aria-expanded` が無い。
  → **修正済み（`46f5c0a`）**: 開閉の器に `inert={!menuOpen}`、トグルに `aria-expanded`・`aria-controls`。inert は描画に影響しないので開閉アニメーションは同じ。
  390px 幅の Chromium で、閉じている間は Tab が「ロゴ → トグル」だけを回り、開くと Works/Film/Shop… に入ることを確認。
- **2-14. Film ページ**（`src/app/film/page.tsx`）: 動画セルが `div onClick`（`:51`）でキーボード操作できない。モーダルに `role="dialog"`・フォーカス移動が無く、
  閉じるボタンは「✕」だけ（`:105`、`aria-label` なし）。
  → **修正済み（`366c1f9`）**: セルを `<button>`（`aria-label="Play trees"` 等）に。モーダルに `role="dialog"`・`aria-modal`・`aria-label`、
  開くと閉じるボタン（`aria-label="Close"`）へフォーカス、Tab で背後へ抜けない、Esc／背景クリックで閉じる、閉じたら押したセルへフォーカスを戻す。
  Chromium で Tab→Enter／Space で開閉できることを確認。**見た目の違い**: キーボード操作でフォーカスしたセルに黒い枠（`focus-visible`）が出る。マウス操作では変化なし。
- **2-15. ページ全体が JS 実行まで不可視**（`src/components/PageTransition.tsx:28` の `style={{ opacity: 0 }}`）。JS が失敗・無効だと本文が見えない
  （特商法ページも含む）。`prefers-reduced-motion` も未対応。
  → **修正済み（`ba2fd59`）**: 最初のフェード（0.2秒待って1.8秒・ease）を CSS アニメーション `.page-transition`（`globals.css`）に移し、
  クライアント遷移時の1.2秒フェードだけ JS（`PageTransition.tsx`）に残した。JS 無効の Chromium でも opacity が 0（100ms）→0.58（900ms）→1（2.6秒）になり本文が見える。
  **見た目の違い**: 曲線・時間は同じ。開始の基準が「JS の実行（hydration）後」から「最初の描画」に変わるので、回線が遅い時はフェードが少し早く始まる。
  `prefers-reduced-motion` は見た目の判断が要るので未対応のまま（4-11）。
  → **reduced-motion も修正済み（3周目、`ca2e0e3`）**: `prefers-reduced-motion: reduce` のときだけ、最初のフェード（`globals.css` の `@media`）と
  クライアント遷移の 1.2秒フェード（`PageTransition.tsx` で `matchMedia` を見て animate しない）を止め、最初から表示する。
  同じ設定のときだけ `html` のスムーズスクロール、モバイルメニューの開閉・ハンバーガーの変形（`Nav.tsx`）、`/works`・`/journal` のホバー拡大も止めた。
  Playwright（`reducedMotion: "reduce"`）で: 表示 100ms 後の opacity が 0→**1**、遷移 300ms 後が 0.35→**1**、各 `transition-property` が `none`、ホバー時の scale が 1.02→**1**。
  `no-preference` では全項目が修正前と同じ値。
- **2-16. `X-Powered-By: Next.js` が出ている**（実測）。`poweredByHeader: false` で消せる。CSP・HSTS は next.config では未設定
  （HSTS は Vercel が独自ドメインに付けるはずだが未確認）。
  → **X-Powered-By は修正済み（`92c9870`）**: `poweredByHeader: false`。`/`・`/shop` で消えたこと、既存の4ヘッダーが残ることを実測。CSP・HSTS は足していない（4-12）。
  → **HSTS は修正済み（3周目、`f0bc498`）**: `Strict-Transport-Security: max-age=63072000`（`next.config.ts:16`）。`includeSubDomains`・`preload` は付けていない
  （付けると takutosuzuki.com の全サブドメインが2年 HTTPS 必須になり後から外せない＝4-16）。このホストにだけ効くので、購入ボタンの遷移先 `buy.stripe.com`・
  Formspree への送信には影響しない。`next start` で公開ページ・`/robots.txt`・`/sitemap.xml`・画像・404 の全部に5ヘッダーが付くことを確認。
  `X-Content-Type-Options`・`Referrer-Policy`・`Permissions-Policy` は**前から付いている**（3章）ので足していない。CSP は入れていない（下書きは 4-12）。
- **2-17. 未使用ファイル**: `src/components/Footer.tsx`（どこからも import されていない）、`public/{file,globe,next,vercel,window}.svg`（create-next-app の残り）。
  README も create-next-app のまま。
  → **修正済み（`b10233d`）**: 6ファイルを削除。`src`・`scripts`・`public`・`docs`・設定ファイルを grep し、参照はこの報告書だけだった。build 成功・`/next.svg` は 404。README は未変更。
- **2-18. 依存**: `npm audit --omit=dev` は 0 件。dev 依存に moderate（ESLint 経由の `minimatch`）があるが、本番には載らない。
- **2-19.（新規・未修正）ページで `openGraph` を書くと layout の siteName/locale/type が落ちる**: `src/app/layout.tsx:36-38` のコメントは
  「images だけ書けば title/description/siteName/locale/type は継承される」としているが、Next の docs（`generate-metadata.md`「Overwriting fields」）では
  入れ子のフィールドは丸ごと置き換わる。実測で `/shop` の HTML に `og:site_name`・`og:locale`・`og:type` が出ていない（`src/app/shop/page.tsx:32-37`）。
  `src/app/journal/[slug]/page.tsx:26` も `openGraph: { images }` だけなので、記事を公開すると title/description まで落ちる（今は全記事 draft なので影響なし）。
  共有時の見え方は概ね保たれる（og:title 等は出ている）ので軽微。shop の metadata は範囲外として触っていない。
  → **修正済み（3周目）**: `/shop` は `/tokushoho` と同じく openGraph に siteName/locale/type を明示し、`layout.tsx` の誤ったコメントを直した（`970312d`）。
  文言は既存の title「Shop — TAKUTO SUZUKI」と description のまま。build 後の `/shop` に `og:site_name`・`og:locale`・`og:type` が出ることを確認（修正前は無し）。
  Journal 記事は**カバーのある記事だけ** og/twitter の全項目を書くようにした（`236bf9c`。無い記事は従来どおり layout の既定）。
  下書きの `sample-field-note` を作業ツリーで一時的に公開扱いにして build し、og・twitter とも記事の title/description/カバー画像になることを確認（コミットはしていない。戻した後は 404）。
- **2-20.（新規・未修正）Film ページの動画は「視差効果を減らす」設定でも自動再生する**（`src/app/film/page.tsx:36-44` の IntersectionObserver が画面内で `play()`）。
  12本のループ動画が動く。止めると `preload="none"` で poster も無いため**黒い枠が並ぶだけ**になるので、poster 画像を用意するか等の判断が要る（4-14）。
  クリック後のモーダル再生は本人の操作なので問題なし。
- **2-21.（新規・軽微）`/works/cast` などの 308 転送の応答にはセキュリティヘッダーが付かない**（`next start` で実測、`next.config.ts` の `headers()` が redirects の応答に掛からない）。
  本文の無い同一ホスト内の転送なので実害はない。

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
- **（3周目）既存ヘッダーと Stripe・外部サービスの関係**: Purchase ボタン（`/shop`）は `buy.stripe.com` への普通の `<a href>`（`target` なし）で、iframe・Stripe.js・
  Payment Request API は使っていない。なので `Permissions-Policy`（camera/microphone/geolocation のみ禁止）・`X-Frame-Options: SAMEORIGIN` は決済に関係しない。
  `Referrer-Policy: strict-origin-when-cross-origin` で Stripe に渡るのはオリジンだけ（Payment Link はリファラーを使わない）。
  **GA4・Vercel Analytics/Speed Insights はコードにも build 結果にも入っていない**（`gtag`・`googletagmanager`・`@vercel/*` が0件、`package.json` にも無し）。
- **（3周目）未使用コード**: `src/lib`・`src/components` の export を全部 grep。外から使われていないのは同じファイル内で使っている型
  （`JournalBlock`・`BreadcrumbItem`・`Series`）だけで、消すものは無かった。外部リンク（Instagram）の `target="_blank"` には `rel="noopener noreferrer"` が付いている。

---

## 4. 人間が判断・確認すべきこと

1. **（2-1/2-2）ランタイムで Stripe の上限値・金額も突き合わせて、ずれていたら売り止めるか**。安全側だが、判定を誤ると本番で「Available Soon」になる。
   入れる場合は、テストモードのリンクで `limit`・`line_items.data[0].amount_total` の実際の値を確認してから。
2. **`node scripts/check-payment-link.mjs --live` を今の main で回す**。新しく足した「割引コード」「完了画面の発送日数」の2項目を含め、全項目が ✓ か。
3. **現行の本番リンク `plink_1U5e…` に `metadata.slug=fade-stay` が付いているか**（ダッシュボードの Payment Link 詳細 → メタデータ）。
   1-2 の修正で shop.ts の ID でも照合するようにしたが、もっと古いリンクが有効のまま残っていないかも「Payment Links」一覧で確認してほしい。
4. **特商法の「最終確認画面」表示（2022年6月施行の改正）**: Stripe の決済画面には価格・数量・送料は出るが、**引渡し時期・返品条件・申込みの撤回**は
   そのままでは出ない。Payment Link の「カスタムテキスト」（決済ボタン付近）に発送時期と返品条件、`/tokushoho` へのリンクを入れるかどうか。法的な判断なのでコードでは触っていない。
   → **2026-11-05 対応**: 文面を決めて `checkoutNotice()`（`scripts/_shop-config.mjs`）に置き、作成スクリプト・既存リンク用の `scripts/set-checkout-notice.mjs`・チェッカーの3つから使う。`/tokushoho` の返品条件にも「キャンセル」を足してそろえた。
5. **（2-3）一時停止時の `inactive_message`**: 「完売しました」を、停止理由を問わない文言（例: 「現在このページからはお求めいただけません。最新の情報は takutosuzuki.com/shop をご覧ください。」）にするか。既存リンクはダッシュボードで変更可能。
6. **（2-6）不良品で在庫切れのときの返金額に送料 ¥430 を含めるか**。含めるなら特商法ページを「商品代金および送料の全額」に。
7. **（2-7）Gmail に `【takutosuzuki.com】` のフィルタもあるか**。無ければフォーム経由の不良品連絡が埋もれる（7日以内の対応期限）。
8. **Vercel 本番の環境変数**: `STRIPE_SECRET_KEY` が本番キー（読み取り専用の制限付きキー推奨）で入っているか。Vercel のランタイムログに `[shop]` で始まるエラーが出ていないか。
9. **（2-8）各ページの title / description の文言**を決めてもらえれば、構成変更込みで対応できる。
10. **決済手段**: 作成スクリプトは `card` と `link`（Stripe のカード保存ウォレット）で作る。特商法ページの「クレジットカード決済（Stripe）」の表記で足りるか。
11. **（2-15）`prefers-reduced-motion` のときフェードを止めるか**。止めるなら `.page-transition` と JS の animate を両方外す小さな変更。
    → **3周目で対応（`ca2e0e3`）**: 止めて最初から表示する方にした。iPhone なら「設定 → アクセシビリティ → 動作 → 視差効果を減らす」を ON にして見え方を一度確認してほしい。
12. **（2-16）CSP・HSTS を next.config で足すか**。CSP は Formspree・Stripe・JSON-LD のインライン script に影響するので、入れるなら Report-Only から。HSTS は Vercel 側で付いているかを本番の応答ヘッダーで確認してから。
    → **3周目**: HSTS は `max-age=63072000` だけ足した（`f0bc498`。Vercel も既定で同じ値を付けるはずで、重なっても害はない。本番で `curl -sI https://www.takutosuzuki.com/` を見て1本だけ出ているか確認してほしい）。
    CSP は入れていない。入れる場合の**下書き**（コードと `.next` の build 結果・`next start` の HTML から洗い出した。2026-11-05 時点）:

    | 読み込み・通信 | どこで | CSP で要るもの |
    |---|---|---|
    | Next の JS（`/_next/static/chunks/*`） | 全ページ | `script-src 'self'` |
    | Next のインライン script（RSC ペイロード `self.__next_f.push`、`<script id="_R_">` など、1ページに2〜3本） | 全ページ | `'unsafe-inline'`、または nonce（**全ページを動的レンダリングにする必要があり、静的生成・`/shop` の ISR をやめることになる**）、または実験的な SRI（`experimental.sri`） |
    | JSON-LD（`<script type="application/ld+json">`、1ページ最大3本） | 全ページ | 実行されないデータなので CSP の対象外（以前の「JSON-LD に影響」は訂正） |
    | `style="..."` 属性（next/image の配置、Film のモーダル）・Next/Tailwind のインライン style | `/`・`/shop`・`/works`・`/film` など | `style-src 'self' 'unsafe-inline'` |
    | 画像（`/images`・`/og`・`/_next/image`）。外部の画像配信元は無し（`images.remotePatterns` 未設定） | 全ページ | `img-src 'self'`。将来 `placeholder="blur"` を使うなら `data:` も |
    | フォント（同梱の woff2） | 全ページ | `font-src 'self'` |
    | 動画（`/film/*.mp4`） | `/film` | `media-src 'self'` |
    | お問い合わせの送信 `fetch("https://formspree.io/f/…")` | `/contact` | `connect-src 'self' https://formspree.io` |
    | 購入ボタン → `https://buy.stripe.com/…`、Instagram へのリンク | `/shop`、Nav | 普通のリンク遷移なので CSP では制限されない（`form-action` も無関係。フォームの送信は fetch） |
    | Stripe API（`api.stripe.com`） | `src/lib/stripe.ts`（サーバー側のみ） | ブラウザは通信しないので不要 |
    | Vercel のプレビュー用ツールバー（プレビューデプロイのみ） | Vercel が挿入 | 本番のみに CSP を掛けるなら不要。プレビューにも掛けるなら `script-src`/`connect-src`/`frame-src` に `https://vercel.live` 等 |
    | GA4・Vercel Analytics | **今は入っていない** | 入れるなら GA4: `script-src https://www.googletagmanager.com`、`connect-src`/`img-src https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com`。Vercel Analytics: 同一オリジンの `/_vercel/insights/*` なので `'self'` で足りる |
    | iframe 埋め込み | 無し | `frame-src 'none'`、`frame-ancestors 'self'`（今の X-Frame-Options と同じ意味） |

    たたき台（**まず `Content-Security-Policy-Report-Only` で**本番に出し、ブラウザのコンソールに違反が出ないかを見てから本適用）:
    ```
    default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:;
    font-src 'self'; media-src 'self'; connect-src 'self' https://formspree.io; frame-src 'none'; frame-ancestors 'self';
    object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
    ```
    `'unsafe-inline'` を含むので XSS 対策としての効き目は限定的（主な効果は外部読み込み先の固定・`frame-ancestors`・`object-src`・`base-uri`）。
    `next dev` では `'unsafe-eval'` も要る（Next の docs）。
13. **（2-19）layout.tsx の openGraph コメントの誤りを直し、`/shop`・Journal 記事に siteName/locale/type を足すか**。
    → **3周目で対応（`970312d`・`236bf9c`）**。
14. **（2-20）Film ページの動画を「視差効果を減らす」設定で止めるか**。止めるなら各動画の poster 画像（静止画）を用意するか、最初のフレームを見せる方法を決める必要がある。
15. **（2-11）トップのスライドショーの残り**: 一時停止ボタンを付けるか（WCAG 2.2.2。reduced-motion とは別に、誰でも止められる手段）、
    reduced-motion の人には自動切り替え自体を止めて1枚目だけにするか（今は即時切り替えで4枚とも見せている）、alt の文言、`sizes`（画像の解像度が変わるので見た目の確認込み）。
16. **（2-16）HSTS に `includeSubDomains`・`preload` を足すか**。takutosuzuki.com のサブドメイン（メール・他サービス用の CNAME など）が全部 HTTPS で動くと確認できてから。preload は外すのに数か月かかる。

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
| **追補（2026-11-05、PR #15）** 各修正コミットごとに `npx tsc --noEmit`・`npm run lint`・`npm test`・`npm run build` | 全コミットでエラー0・テスト12件成功・build 成功 |
| 追補: `next start` + curl | `X-Powered-By` なし／`/robots.txt` 200・内容確認／sitemap 8 URL（Journal なし）／下書き 404／`/works` の preload 1件／`/tokushoho` の og・twitter／全公開ページ 200・`/works/cast` 308・`/next.svg` 404 |
| 追補: Playwright（同梱の Chromium、ローカルの `next start` のみ） | Film のキーボード開閉・フォーカス移動と復帰、モバイルメニューの Tab 順（390px）、JS 無効時の本文の opacity、クライアント遷移時のフェード |
| 実機・ブラウザでのスマホ表示確認 | 未実施（コードから読める範囲のみ。2-11・2-13・2-14 はコード上の指摘） |
| **追補（2026-11-05、3周目 `fix/audit-followups-2`）** 修正前と各修正コミットごとに `npx tsc --noEmit`・`npm run lint`・`npm test`・`npm run build` | 全コミットでエラー0・テスト12件成功・build 成功 |
| 3周目: `next start` + curl | `/shop` の og（site_name/locale/type が追加、title/description/画像は不変）・twitter／`/tokushoho` の og・twitter（12タグ、不変）／公開ページ・robots・sitemap・画像・404 の全部に5ヘッダー（HSTS 含む）／`/works/cast` 308 |
| 3周目: 一時的に下書きを公開扱いにした build | `/journal/sample-field-note` の og・twitter（確認後に元へ戻し、404 を確認） |
| 3周目: Playwright（`reducedMotion: "reduce"` と `"no-preference"`、1280px と 390px） | 修正前は両設定で同じ値（reduce が効いていない）→ 修正後は reduce だけ動きが止まり、no-preference は修正前と同じ値 |
| 3周目: `priority`→`preload` の前後で4ページの `<img>`・preload `<link>` を diff | 完全一致 |
| 本番サイトの応答ヘッダー（Vercel の HSTS の有無） | **未確認**（外部サービスに接続しない方針のため。4-12） |
