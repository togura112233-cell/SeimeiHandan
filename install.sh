#!/usr/bin/env bash
# 姓名判断 〜五格剖象法〜 — ワンライン導入＆起動（macOS）
#
#   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Getabako/SeimeiHandan/main/install.sh)"
#
# 何度貼っても OK。初回はダウンロード、2回目以降は最新に更新して起動するだけ。
# このツールは依存パッケージ不要の静的アプリなので、ビルドも API キーも不要。

set -e

GH_REPO="${SEIMEI_REPO:-Getabako/SeimeiHandan}"
BRANCH="${SEIMEI_BRANCH:-main}"
INSTALL_DIR="${SEIMEI_HOME:-$HOME/Desktop/SeimeiHandan}"

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*" >&2; }

__ash_on_error() {
  red ""
  red "──────────────────────────────────────────"
  red "  途中で止まりました。上の赤い文字（エラー）をそのままコピーして、"
  red "  Codex か Claude Code に貼り付け『このエラーを直して』と頼んでください。"
  red "──────────────────────────────────────────"
}
trap __ash_on_error ERR

cyan "▶ 姓名判断 〜五格剖象法〜 セットアップを開始します"

if [[ "$(uname)" != "Darwin" ]]; then
  red "✗ install.sh は macOS 向けです。"
  red "Windows の方は PowerShell で以下を実行してください:"
  red "  iwr -useb https://raw.githubusercontent.com/$GH_REPO/main/install.ps1 | iex"
  exit 1
fi

[[ -x /opt/homebrew/bin/brew ]] && eval "$(/opt/homebrew/bin/brew shellenv)"
[[ -x /usr/local/bin/brew ]] && eval "$(/usr/local/bin/brew shellenv)"

# 道具（Node / git）の確認。このツールは Codex 不要（AI鑑定ボタンを使う場合のみ Codex）。
__missing=""
command -v node >/dev/null 2>&1 || __missing="$__missing Node.js"
command -v git  >/dev/null 2>&1 || __missing="$__missing git"
if [[ -n "$__missing" ]]; then
  red "✗ 道具が足りません：$__missing"
  red ""
  red "先に『第一の儀（環境構築）』を一度だけ実行してください:"
  red "  /bin/bash -c \"\$(curl -fsSL https://service.if-juku.net/Ashura/setup.sh)\""
  exit 1
fi

# リポジトリを取得 or 更新（ローカル修正は保持）
if [[ -d "$INSTALL_DIR/.git" ]]; then
  if [[ -n "$(git -C "$INSTALL_DIR" status --porcelain 2>/dev/null)" ]]; then
    cyan "▶ あなたの修正を保持したまま起動します（自動更新はスキップ）"
  else
    cyan "▶ 最新版に更新します"
    git -C "$INSTALL_DIR" fetch --quiet origin "$BRANCH"
    git -C "$INSTALL_DIR" reset --quiet --hard "origin/$BRANCH"
  fi
else
  cyan "▶ アプリをダウンロードします → $INSTALL_DIR"
  rm -rf "$INSTALL_DIR"
  git clone --quiet --depth 1 --branch "$BRANCH" \
    "https://github.com/$GH_REPO.git" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

green ""
green "✓ 起動します。ブラウザが自動で開きます。終了は Ctrl+C。"
green ""
# スラッシュコマンドを設置（/seimeihandan で起動できるように）
curl -fsSL https://service.if-juku.net/Ashura/install-command.sh | bash -s -- seimeihandan "姓名判断 〜五格剖象法〜" "$INSTALL_DIR" "node bin/cli.js" 2>/dev/null || true
trap - ERR
exec node bin/cli.js
