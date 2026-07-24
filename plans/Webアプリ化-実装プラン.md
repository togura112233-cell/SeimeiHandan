# 姓名判断アプリ Webアプリ化 実装プラン

> バージョン: v3 | 作成日: 2026-07-24 | 更新日: 2026-07-25 | ステータス: 完了（Step1〜6すべて完了、本番公開済み）

---

## 経緯（前回セッションからの引き継ぎ）

- 2026-07-24前セッションで所在確認：`C:\Users\ogura\Documents\ヒオウギ\SeimeiHandan`（GitHub `Getabako/SeimeiHandan`）
- 本体（五格計算・筆順アニメ・オフライン鑑定トーク）は依存パッケージ・APIキー不要の静的アプリ → デプロイ容易
- 「AI鑑定」機能（`/api/reading`）はローカルの`bin/cli.js`がcodex CLIをシェルアウトする作りのため、サーバーレス/静的ホスティングでは動作しない
- 今回のセッションで追加確認：オフライン鑑定トークの人格「手相詩人 心之介。」（古舘プロジェクト所属の実在の占い師）を公開情報から模した設定とREADMEに明記されている → 販売時にパブリシティ権・氏名冒用のリスク

## タカシさん確認済み事項（2026-07-24）

| 論点 | 決定 |
|---|---|
| AI鑑定機能 | **保留**（今回のスコープ外。別途plan.mdで後日検討） |
| 心之介。ペルソナ | **架空のオリジナルキャラクターに変更**する |
| 決済 | **今回は決済なし・無料公開のみ** |

## 新キャラクター設定（タカシさん確定・2026-07-25）

| 項目 | 内容 |
|---|---|
| 肩書き | 筆聖（ひっせい） |
| 名前 | 墨伝（ぼくでん） |
| 一人称 | 私 |
| 口調 | 基本は穏やかな標準語、時々関西弁が混ざる |
| 決め台詞 | 「名前は、生き方の設計図や」 |
| 鑑定トーンの例 | 「ふむ…この画数、なかなか面白い流れをしてはる。天格も人格も、無理に型にはまらんでええ形や」 |
| 締めの一行詩（例） | 「己の名を、己で生きる」 |

実在の「手相詩人 心之介。」の名前・肩書き・実際の決め台詞（「人生を人に決められてたまるか！」等）は一切使用しない。口調の「明るく喋って最後に静かに一行の書」という演出の型自体は特定個人に紐づく要素ではないため踏襲する。

## ゴール

現行の姓名判断アプリ（五格計算・筆順アニメ・オフライン鑑定トーク）から、
1. 実在の占い師を模した人格設定を架空のオリジナルキャラクターに差し替え
2. AI鑑定ボタン（ローカルcodex CLI依存で動作しない機能）を非表示化
3. KanjiVG（CC BY-SA 3.0）・KANJIDIC2（EDRDG）のクレジット表記を追加
4. 静的Webアプリとしてホスティング（Vercel想定・決済なし・無料公開）

した状態で完了とする。

## 技術スタック・制約
- 使用言語/フレームワーク: 素のHTML/CSS/JS（既存構成のまま。依存パッケージ・APIキー不要の方針を維持）
- **推奨事項**: 既存の静的資産（index.html/styles.css/js/*）をほぼそのまま流用し、キャラクター設定部分（poem.js・meanings.js内の該当箇所）とAI鑑定ボタンのみ改修
- **禁止事項**:
  - 課金が発生する外部APIキーは使用しない（AI鑑定は今回スコープ外のため対象外）
  - 決済機能は今回実装しない
- デプロイ先: Vercel（無料枠・静的サイトホスティング）

## 依存関係・前提タスク
- 必要なAPIキー・認証情報: なし
- 先に完了させておくタスク:
  - 新キャラクター名・口調・キャッチコピー・色紙の一行詩スタイルの確定（タカシさん承認、v2で確定予定）
- 用意しておくファイル・リソース: 既存リポジトリ（Documents\ヒオウギ\SeimeiHandan、git管理・GitHub Getabako/SeimeiHandan にpush済み想定）

## 実装ステップ
- [x] Step 1: 新キャラクター設定案を2〜3案作成しタカシさんに提示・確定 → 「筆聖 墨伝（ぼくでん）」に確定（2026-07-25）
- [x] Step 2: `js/poem.js`・`js/meanings.js`・README.md内の「心之介。」関連の記述を「筆聖 墨伝」に置き換え（カイハツ君）
- [x] Step 3: `index.html`・`js/app.js`からAI鑑定ボタン（`/api/reading`呼び出し部分）を非表示化・除去（`bin/cli.js`はローカル起動用として残置）（カイハツ君）
- [x] Step 4: KanjiVG（CC BY-SA 3.0, © Ulrich Apel）・KANJIDIC2（EDRDG）のクレジットをフッター等の画面上に表示追加（カイハツ君）
- [x] Step 5: 静的サイトとしてローカル動作確認（ダブルクリック/簡易サーバ）→ Vercelへデプロイ（デジまる君）→ 完了（2026-07-25、リポジトリ移行の経緯は下記「実装後メモ」参照）
- [x] Step 6: 本番URLで動作確認（五格計算・筆順アニメ・新キャラ鑑定トーク・クレジット表示）→ 完了（2026-07-25、詳細は下記「実装後メモ」参照）

## 見積もり時間
- 見積もり: 2〜3時間（キャラクター確定の往復含む）
- 実際にかかった時間: Step2〜4は約1時間・Step5〜6は権限トラブル対応込みで約1時間（詳細は「実装後メモ」参照）。

## 完了条件
- 本番URLで名前を入力→五格計算・筆順アニメ・新キャラクターの鑑定トークが表示される（正常系）
- AI鑑定ボタンが画面に存在しない、または押しても静的環境向けの適切な代替表示になる（正常系）
- KanjiVG・KANJIDIC2のクレジットが画面上に表示されている（正常系）
- **異常系**: 未対応漢字・記号・絵文字・極端に長い名前・空欄入力を与えてもエラーで落ちず、既存の82画以上还元や霊数処理等の既存ロジックが崩れない
- **異常系**: 旧字体変換・部首補正のロジックが新キャラ差し替え後も既存と同じ計算結果を返す（回帰確認）

## エラー注意点
- 心之介。関連の文言はpoem.js・meanings.js・README.mdの複数箇所に分散している（grep済み：3ファイル）。置き換え漏れがないよう全箇所を機械的に確認すること
- AI鑑定ボタン除去時、`bin/cli.js`（ローカルサーバ）自体は残してよいか、リポジトリから削除するかは要判断（ローカルでの継続利用有無をタカシさんに確認）

## 懸念点・要確認
- AI鑑定機能は今回スコープ外だが、将来的に有料API（Claude/OpenAI等）で作り直す場合は別途plan.md＋コスト確認が必要
- 新キャラクターの著作権・商標的な独自性（既存キャラ・商標と紛らわしくないか）は六方さんの法務レビューを推奨
- カスタムドメイン取得の要否は未確認（Vercel既定URLで良いか）

## 担当者

| 役割 | 担当エージェント |
|---|---|
| 実装 | カイハツ君 |
| デプロイ・設定 | デジまる君 |
| plan-index.md 新規追加 | カイハツ君 |
| plan-index.md ステータス更新 | デジまる君 |
| レビュー・承認 | タカシさん |

---

## 決定ログ（ブラッシュアップ履歴）

| バージョン | 変更内容 | 理由 |
|---|---|---|
| v1 | 初稿作成 | AI鑑定保留・心之介ペルソナ差し替え・決済なしの3方針をタカシさんに確認済み |
| v2 | 新キャラクター「筆聖 墨伝」を確定・Step1完了・タカシさんGO受領 | 実装フェーズへ移行 |
| v3 | Step5でGitHubリポジトリを`Getabako/SeimeiHandan`から`togura112233-cell/SeimeiHandan`に変更・Step5〜6完了 | `Getabako/SeimeiHandan`へのpush権限がないことが判明したため、タカシさん確認の上、push権限のある`togura112233-cell`アカウント配下に新規リポジトリを作成する方針に変更 |

---

## 実装後メモ（次回への改善点）

**Step2〜4 実装完了（2026-07-25、カイハツ君）**

- 実際にかかった時間: 約1時間（grep調査〜実装〜Playwright動作確認〜plan.md更新まで）
- 発生したエラーと対処:
  - なし（構文エラー・実行時エラーともに未発生）。テストスクリプトの標準出力がWindowsのcp932コンソールで日本語credit表記の「©」をエンコードできずUnicodeEncodeErrorになったが、これはテストスクリプト側の出力エンコーディングの問題であり、アプリ本体の不具合ではない（`PYTHONIOENCODING=utf-8`で解消）。
- 想定と異なった点:
  - Step4のKanjiVG/KANJIDIC2クレジットは、実は`index.html`のフッターに**既に表示済み**だった（Step4着手前から存在）。今回は「KanjiVG」に著者表記（© Ulrich Apel）を追加し、KANJIDIC2にもEDRDGへのリンクを追加する形で強化するにとどめた。
  - `js/poem.js`内の`window.Shinnosuke`というオブジェクト名自体が実在の占い師名（心之介＝Shinnosuke）のローマ字表記になっていたため、grep対象の日本語文字列だけでなく変数名も`window.Bokuden`に改名した（`js/app.js`側の参照4箇所も追随して修正）。
  - AI鑑定ボタンを除去した結果、`js/app.js`内の`runAI()`・`summaryText()`関数、`aiText`変数、PDFレポート内の`aiHtml`挿入ブロックが全て呼び出し元を失い不要になったため、あわせて削除した（`bin/cli.js`自体・`/api/reading`エンドポイントは指示通り残置）。
  - 色紙の落款（初期表示の飾り文字）が旧キャラクター名に由来する「心」の1文字だったため、他の箇所で使われているフォールバック文字と合わせて「福」に変更した。
  - 鑑定トークの定型文（`core`/`wakage`/`shakai`/`bannen`）は毎回必ず出力される部分であり、旧キャラの「！」「やな」「そんで」といった快活な関西弁が濃く残っていたため、新キャラの「穏やかな標準語＋時々関西弁」というトーン指定に合わせて明るさを少し落とした（`JIN_TALK`等のセリフバンクは指示範囲内で全面的に書き換え済み）。
- 未実施・要確認事項:
  - README.mdの「AI鑑定」機能説明は削除し、`bin/cli.js`の説明も「現在UIから未使用」と明記したが、bin/cli.js自体のコード（`/api/reading`実装）は変更していない。将来再度AI鑑定機能を有効化する場合は別途plan.mdが必要（既存の「懸念点・要確認」欄を参照）。

**Step5〜6 実装完了（2026-07-25、デジまる君）**

- **リポジトリ移行の経緯**: `git push origin main`実行時、現在GitHub CLIで認証中のアカウント`togura112233-cell`が`Getabako/SeimeiHandan`への書き込み権限を持たない（403 Permission denied。`gh api repos/Getabako/SeimeiHandan`で確認したところ`"push": false, "pull": true`）ことが判明。一度作業を停止しタカシさんに確認した結果、「`togura112233-cell`アカウント配下に新規リポジトリを作成し、そちらにpush・Vercelデプロイする。`Getabako/SeimeiHandan`は読み取り専用のまま触らない」方針を確定。
  - 新リポジトリ: **https://github.com/togura112233-cell/SeimeiHandan**（public）
  - ローカルのgit remoteは`origin`（`Getabako/SeimeiHandan`、読み取り専用のまま維持）と`vercel-origin`（`togura112233-cell/SeimeiHandan`、push・Vercel連携用）の2本立てに変更
  - push時、ローカルリポジトリが`Getabako/SeimeiHandan`からのshallow clone（`.git/shallow`あり）だったため、そのままでは新リポジトリへのpushが`did not receive expected object`エラーで失敗。`git fetch --unshallow origin`で解消（origin自体への書き込みは発生しないため権限問題には抵触しない）。
- **Vercelデプロイ**: Vercel CLI（v54.9.0、ログインアカウント`togura112233-cell`）で`vercel deploy --prod --yes`を実行しデプロイ成功。プロジェクト名はディレクトリ名`SeimeiHandan`が大文字を含みVercelの命名規則（小文字のみ）に反するため`seimeihandan`で作成。
  - 本番URL: **https://seimeihandan.vercel.app**
  - Vercelプロジェクト: `takashi-s-projects7/seimeihandan`
  - **未実施**: `vercel git connect`によるGitHub連携（push時の自動デプロイ）は、Vercel側で「Failed to connect togura112233-cell/SeimeiHandan to project」エラーとなり未達成。おそらくVercel GitHub Appが`togura112233-cell`アカウントのリポジトリに対してまだ認可されていないことが原因（推測です・未確認）。Vercelダッシュボードから手動でGitHub App連携を承認すれば解消する見込み。現状はCLIでの`vercel deploy --prod`による手動デプロイのみ運用可能な状態。
- **Step6動作確認結果**（Playwright自動テストで確認、全て正常）:
  - 五格計算: 正常表示（例：山田太郎 → 天格8画「堅忍」・人格9画「窮乏」・地格18画「鉄石」・外格17画「剛健」・総格26画「変怪」、三才配置・陰陽配列も表示）
  - 筆順を数えるアニメーション: 正常表示
  - 新キャラクターの鑑定トーク: 「私」一人称・穏やかな標準語基調の口調で表示を確認。一行詩（色紙）も表示（例：「涙の分だけ　器が深い」）。旧キャラクター名「心之介」「手相詩人」等の文言は本番ページ上に一切残っていないことを確認済み。ただし「筆聖 墨伝」という肩書き・名前そのものはUI上のテキストラベルとしては表示されない（口調・トーンでのみ表現される設計。旧キャラクターも同様の設計だったため今回変更した挙動ではない）
  - AI鑑定ボタン: DOM上に`#aiBtn`・`#aiResult`ともに0件で存在しないことを確認
  - クレジット表示: フッターに「筆順データ: KanjiVG（CC BY-SA 3.0, © Ulrich Apel）／ 画数辞書: KANJIDIC2（EDRDG）」と表示されていることを確認
  - コンソールエラー: pageerror・console共に0件（エラーなし）
  - 異常系（記号・絵文字・英数字混在の入力）: クラッシュせず「この文字の画数が辞書にありません」という適切なエラーメッセージを表示して落ちないことを確認

**GitHub連携（自動デプロイ）試行の追記（2026-07-25、デジまる君）**

- タカシさんが `https://github.com/apps/vercel/installations/new` から`togura112233-cell`アカウント・`SeimeiHandan`リポジトリへのVercel GitHub Appアクセス許可を完了。その後`vercel git connect --yes`を再実行したが、**依然として同一のエラー**（`POST /v9/projects/{id}/link`が400 Bad Request、CLIメッセージ「Failed to connect togura112233-cell/SeimeiHandan to project.」）で失敗。
- `mcp__plugin_vercel_vercel__get_project`で確認したところ`"live": false`のままで、この間の`git push`でも新しいデプロイは自動生成されていない（＝連携は未成立のまま）ことを確認。
- `vercel integration installations`では「No marketplace installations found」（Vercelの「マーケットプレイス統合」とGitHub連携は別物のため、この結果は判断材料にならない）。
- GitHub側のApp installation状態をAPIで直接確認しようとしたが、`gh api user/installations`は現在のトークン種別（OAuthアクセストークン）では権限不足（403）で参照不可。Vercel REST APIへの直接POSTでエラー詳細bodyを取得しようとした際は、ローカルの認証情報ファイル読み取りがセキュリティフックにブロックされ中止（意図通りの安全策のため回避策は探さず）。
- **仮説（未検証）**: `https://github.com/apps/vercel/installations/new`から直接GitHub App単体をインストールしただけでは、Vercel側の「アカウント連携」処理までは完了しない可能性がある。VercelのGit連携は通常「Vercelダッシュボード起点でGitHub接続を開始→OAuthでVercelアカウントとGitHub IDを紐付け→App installation」という一連の流れをVercel側のUIで行う設計のため、GitHub側のApp画面だけを単独で操作すると連携が片肺になる可能性がある。
- **次にタカシさんに試していただきたいこと**（未実施）:
  1. `https://vercel.com/takashi-s-projects7/seimeihandan/settings/git` を開き、「Connect Git Repository」ボタンからGitHub連携を開始する（既にAppは許可済みのため、リポジトリ選択画面まで進む可能性が高い）
  2. それでも失敗する場合は `https://vercel.com/account/login-connections`（またはチーム設定内の同等ページ）でVercelアカウント`togura112233-cell`にGitHubアカウントとしての`togura112233-cell`が接続済みか確認する
- 上記が完了次第、再度`vercel git connect`を実行し、成功したら軽微な変更のpushで自動デプロイ発生を確認する（本タスクは未完了のため保留中）
