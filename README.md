# 🐸 Froggy Link

Nuxt 4 + PWA 的個人連結整理工具，定位為簡單版收藏 App。

## 目前功能

- 以貼上網址或 Android 分享連結（Web Share Target）新增項目
- 使用者可手動建立標籤，一個連結可綁定多個標籤
- 新增連結時自動嘗試抓取 metadata（圖片、標題、描述）
- 可用標籤篩選清單
- 所有連結資料只儲存在本機 IndexedDB（不使用資料庫伺服器）
- 版型使用 TailwindCSS，色彩以 CSS 變數集中管理
- 已預留「地圖點位」區塊，暫不實作地圖功能

## 開發

```bash
npm install
npm run dev
```

開啟 `http://localhost:3000`。

## 打包

```bash
npm run build
npm run preview
```

## PWA 安裝注意事項

- 正式環境需透過 HTTPS（Vercel 預設符合）
- manifest 需提供至少 `192x192` 與 `512x512` 的 PNG 圖示（本專案在 `public/icons`）
- 若更新過 service worker 或 manifest，請在瀏覽器 DevTools 清除舊快取後再重整驗證

## 樣式客製化

- 主要色彩變數：`app/assets/css/main.css`
- Tailwind 主題擴充：`tailwind.config.ts`

## Metadata 抓取說明

- 由 Nuxt 內建 API (`/api/metadata`) 代抓目標頁面 meta（`og:*` / `twitter:*` / `description`）
- 若目標網站 meta 不完整，會退而嘗試 `noembed` 支援來源
- 若仍無法取得，會以網址網域當作標題顯示
