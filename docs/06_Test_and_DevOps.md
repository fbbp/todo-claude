# 06 テスト & DevOps

作成日: 2025-05-18

## テストピラミッド
| 層 | ツール | 内容 |
| -- | ----- | ---- |
| Unit | Vitest | Hook, util |
| Component | Testing Library | UI |
| Storybook | visual test | storyshots |
| E2E | Playwright | PWA / offline / 通知 |
| a11y | axe-core | 自動検査 |

## Playwright offline 実行例
```bash
pnpm playwright test --project=chromium --offline
```

## GitHub Actions
```yaml
name: CI

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{{{ secrets.GITHUB_TOKEN }}}}
          publish_dir: dist
```

## Lighthouse CI
- Performance / PWA / Accessibility ≥ 90 を維持