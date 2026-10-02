# 🐸 Froggy Link

Nuxt 4 + PWA 的個人連結整理工具，定位為簡單版收藏 App。

## 目前功能

- 以貼上網址或 Android 分享連結（Web Share Target）新增項目
- Android 可從其他 App「分享至 Froggy Link」，帶入網址後設定標籤並按「新增」
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

- Android 瀏覽器確認可安裝後，首頁會顯示安裝橫幅；點「安裝 App」才會開啟系統安裝視窗
- 點「暫時不要」或取消系統提示後，同一個分頁工作階段不再自動提示；設定仍保留安裝入口
- 已安裝並以 App 模式開啟、iOS 與桌面瀏覽器不顯示 Android 安裝橫幅；設定會提供可用的安裝按鈕或手動安裝說明
- 安裝提示由瀏覽器決定何時提供，未觸發 `beforeinstallprompt` 時不會顯示無法使用的橫幅按鈕
- 正式環境需透過 HTTPS（Vercel 預設符合）
- manifest 需提供至少 `192x192` 與 `512x512` 的 PNG 圖示（本專案在 `public/icons`）
- 若更新過 service worker 或 manifest，請在瀏覽器 DevTools 清除舊快取後再重整驗證
- 已啟用自動更新：偵測到新版 service worker 會自動啟用並重新整理頁面，且清理過期快取

## 樣式客製化

- 主要色彩變數：`app/assets/css/main.css`
- Tailwind 主題擴充：`tailwind.config.ts`

## Metadata 抓取說明

- 由 Nuxt 內建 API (`/api/metadata`) 代抓目標頁面 meta（`og:*` / `twitter:*` / `description`）
- YouTube 影片（包含 Android App 分享的 `youtu.be`、Shorts 與直播連結）優先透過 YouTube oEmbed 取得標題與縮圖
- 若目標網站 meta 不完整，會透過 `noembed` 補齊缺少的欄位；只有標題時也會繼續嘗試取得縮圖
- 蝦皮商品連結若受到反爬限制導致無法直接取得主圖，會改用商品頁截圖作為預覽圖 fallback
- 短網址重新導向後，以最終頁面網址解析相對圖片路徑
- 已儲存的連結再次新增時會更新預覽文字與縮圖，並保留原有標籤；可用於修復舊版本儲存的 HTML 字元編碼文字
- 舊收藏中殘留的數字 HTML 字元編碼會在載入時自動修復一次，保留網址、標籤與建立時間
- 卡片上的「更新預覽」可重新取得文字與圖片；沒有圖片或圖片載入失敗時隱藏圖片區塊，不保留空白或提示
- 若仍無法取得，會以網址網域當作標題顯示
- 預覽需要網路與可執行 Nuxt API 的部署環境；純靜態 `generate` 無法提供 `/api/metadata`
- 私人內容、需登入或限制擷取的網站可能無法提供預覽；不會繞過來源網站的存取限制

## 驗證

使用 Node.js 22.18+ 或 24 執行 `npm test`，驗證 YouTube 分享網址、縮圖備援與重新導向處理。正式建置使用 `npm run build`。

## iPhone／iPad 分享捷徑

設定中的「安裝分享捷徑」會開啟 `/ios-shortcut`，提供加入捷徑、複製公開安裝連結與操作說明。

- 公開安裝連結：https://www.icloud.com/shortcuts/30f872e0ee2848cfabe004966c461d1f
- 固定送往 `https://froggy-link.vercel.app/?url=`；網址先編碼，保留原本的查詢參數
- 接收分享表單中的 URL、文字、Safari 網頁；沒有輸入時提示貼上網址；多個網址取第一個
- 使用者仍需在網站按「新增」儲存。iOS 瀏覽器與主畫面 PWA 的本機收藏不會自動同步
- 備援檔案：`public/shortcuts/share-to-froggy-link.shortcut`，已透過 Apple 簽署供任何人匯入

維護捷徑（需要 macOS）：

```bash
python3 scripts/build-ios-shortcut.py
shortcuts sign --mode anyone --input shortcuts/share-to-froggy-link.unsigned.shortcut --output public/shortcuts/share-to-froggy-link.shortcut
```

`shortcuts/share-to-froggy-link.plist` 是可閱讀的動作定義。修改後請重新簽署、匯入「捷徑」App、命名為「分享到 Froggy Link」，測試後使用分享選單的「拷貝 iCloud 連結」建立新版本，再更新 `app/pages/ios-shortcut.vue` 的 `installUrl` 與本文件。既有 iCloud 分享連結不會跟著原始碼更新。
