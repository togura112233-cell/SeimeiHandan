# 姓名判断 〜五格剖象法〜 — ワンライン導入＆起動（Windows / PowerShell）
#
#   iwr -useb https://raw.githubusercontent.com/Getabako/SeimeiHandan/main/install.ps1 | iex
#
# 依存パッケージ不要の静的アプリ。ビルドも API キーも不要。

$ErrorActionPreference = "Stop"

$GhRepo     = if ($env:SEIMEI_REPO) { $env:SEIMEI_REPO } else { "Getabako/SeimeiHandan" }
$Branch     = if ($env:SEIMEI_BRANCH) { $env:SEIMEI_BRANCH } else { "main" }
$InstallDir = if ($env:SEIMEI_HOME) { $env:SEIMEI_HOME } else { Join-Path $HOME "Desktop\SeimeiHandan" }

function Cyan($m)  { Write-Host $m -ForegroundColor Cyan }
function Green($m) { Write-Host $m -ForegroundColor Green }
function Red($m)   { Write-Host $m -ForegroundColor Red }

Cyan "▶ 姓名判断 〜五格剖象法〜 セットアップを開始します"

# 道具の確認（Node / git）
$missing = @()
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $missing += "Node.js" }
if (-not (Get-Command git  -ErrorAction SilentlyContinue)) { $missing += "git" }
if ($missing.Count -gt 0) {
  Red ("✗ 道具が足りません：" + ($missing -join " "))
  Red "先に『第一の儀（環境構築）』を実行してください:"
  Red "  iwr -useb https://service.if-juku.net/Ashura/setup.ps1 | iex"
  exit 1
}

if (Test-Path (Join-Path $InstallDir ".git")) {
  $dirty = git -C $InstallDir status --porcelain
  if ($dirty) {
    Cyan "▶ あなたの修正を保持したまま起動します（自動更新はスキップ）"
  } else {
    Cyan "▶ 最新版に更新します"
    git -C $InstallDir fetch --quiet origin $Branch
    git -C $InstallDir reset --quiet --hard "origin/$Branch"
  }
} else {
  Cyan "▶ アプリをダウンロードします → $InstallDir"
  if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
  git clone --quiet --depth 1 --branch $Branch "https://github.com/$GhRepo.git" $InstallDir
}

Set-Location $InstallDir

# スラッシュコマンドを設置（/seimeihandan）
try {
  $cmdDir = Join-Path $HOME ".claude\commands"
  New-Item -ItemType Directory -Force -Path $cmdDir | Out-Null
  $body = @"
---
description: 姓名判断 〜五格剖象法〜 を起動してブラウザで開く
allowed-tools: Bash
---

姓名判断 〜五格剖象法〜（筆順アニメーション付き・ローカルの静的 Web ツール）を起動する。

手順:
1. ツールのルートは ``$InstallDir``。
2. ``node bin/cli.js`` を run_in_background で起動する。
3. 起動ログの http://localhost:<port> を読み取り、ブラウザで開く。URL をユーザーに伝える。
4. 終了は Ctrl+C と案内する。
"@
  Set-Content -Path (Join-Path $cmdDir "seimeihandan.md") -Value $body -Encoding UTF8
} catch {}

Green ""
Green "✓ 起動します。ブラウザが自動で開きます。終了は Ctrl+C。"
Green ""
node bin/cli.js
