#!/bin/bash
set -e
cd "$(dirname "$0")"

case "$1" in
  new)
    [ -z "$2" ] && echo '用法: ./blog.sh new "文章标题"' && exit 1
    npx hexo new "$2"
    echo "已创建: source/_posts/$(ls -t source/_posts | head -1)"
    ;;
  preview)
    echo "预览地址: http://localhost:4000 (Ctrl+C 退出)"
    npx hexo server
    ;;
  pub|"")
    MSG="${2:-发布更新 $(date '+%Y-%m-%d %H:%M')}"
    git add -A
    if git diff --cached --quiet; then echo "没有新变更，无需发布"; exit 0; fi
    git commit -m "$MSG"
    git push
    echo ""
    echo "✅ 已推送，CI 构建中（约 90 秒生效）→ https://208202.xyz"
    echo "   构建进度: https://github.com/honor-99/honor-99.github.io/actions"
    ;;
  *)
    echo "用法:"
    echo "  ./blog.sh new \"文章标题\"     新建文章"
    echo "  ./blog.sh preview          本地预览 (localhost:4000)"
    echo "  ./blog.sh pub \"备注\"        一键发布"
    ;;
esac
