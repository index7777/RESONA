# RESONA × RES 下一步執行手冊（2026-10-20）

> 狀態：**待執行清單**，不是已通過的測試或已部署服務。所有程式先留在 feature 分支。禁止直接部署正式 reslab.app、禁止在 RES 正式 D1 執行音訊 migration。

## 0. 現有分支、原始碼與責任

| 系統 | 分支 | 重要檔案 | 用途 |
| --- | --- | --- | --- |
| RES | `feature/resona-auth-bridge` | `app/worker/src/resona-identity.mjs`, `resona-bridge-worker.mjs`, `wrangler.resona-bridge.toml` | 驗證既有 RES session，僅回傳 userId |
| RESONA | `feature/ai-audio-studio` | `worker/src/res-auth.mjs`, `api.mjs`, `index.mjs` | 私人呼叫 RES，提供 /audio/api/me、/credits |
| RESONA | 同上 | `worker/migrations/0001_audio_wallet.sql`, `wallet.mjs` | 獨立音訊 D1 點數 |
| 兩者 | 同上 | `tests/res-auth.test.mjs`, `app/worker/tests/resona-identity.test.mjs` | 待執行的單元測試 |

不得將 RESONA 音訊資料表放進 RES 的 `DB`。RES 身分橋接服務需要唯讀查詢 RES 的 sessions/users，因此其 `DB` 指向 RES 身分資料庫；RESONA 的 `AUDIO_DB` 必須是**另一個**資料庫。

## 1. 先修正安全與部署阻礙（寫程式，不部署）

1. RES `resona-identity.mjs`：目前使用一般字串比較 Bearer token，改成長度安全、固定時間的秘密比較；拒絕空密鑰；避免在 log 輸出 Cookie/token。
2. RES 私人 Worker：只在專用 `resona-bridge-worker.mjs` 註冊 `/internal/resona/identity`；**絕不**掛到公開 `src/index.mjs`；設定 `workers_dev=false`、`preview_urls=false`、無 routes。
3. RES 身分驗證：重用 `sessionTokenOf()`、`sessionUser()`，確認 banned_at / suspended_at 都拒絕。檢查裝置／IP 禁用政策是否要同步到 RESONA，若要同步，必須另定可驗證的原始請求來源，不能直接信任自報 IP。
4. RESONA `api.mjs`：收到 authenticate 回傳值後也應執行 `requireVerifiedIdentity`，避免未來測試／替代 adapter 意外繞過驗證。
5. RESONA `wallet.mjs`：目前只有預扣點，**沒有結算／退款**；禁止開放生成扣點路由。修正開頭舊的 D1 batch 註解，與 migration trigger 一致。
6. 確認 `/audio/api/me` 在未配置綁定時是 401，且無公開的內部身分端點。

**驗收：** 程式碼審查確認沒有公開 introspection、沒有信任 browser userId、沒有圖片點數 SQL。

## 2. 執行本機測試

使用 Node.js 22+。從各 repo 根目錄執行：

```bash
# RES
node --test app/worker/tests/resona-identity.test.mjs
# RESONA
node --test tests/audio-wallet.test.mjs tests/audio-api.test.mjs tests/res-auth.test.mjs
npm run build
```

以上命令是**待執行**，不是已通過。測試應補齊：無 Bearer、錯 Bearer、無 Cookie、過期/登出 Session、banned/suspended、缺 D1、偽造 userId、跨帳號讀取、重複請求、RES 影像點數不變。

對 `0001_audio_wallet.sql` 另使用獨立 SQLite/D1 測試庫做交易整合測試：
- 建立錢包 10 點；預扣 3 點後應為 7 點、1 job、1 reserve ledger。
- 重送相同 idempotency key 不可二次扣點。
- 餘額不足、job ID 衝突、ledger 寫入失敗時，不可留下半套資料。
- 並行兩次預扣不能讓 balance 小於 0。
- **特別注意**：測試中不能僅靠 mock 宣稱 D1 transaction/trigger 已驗證。

## 3. Cloudflare 預覽資源（需要擁有者 Cloudflare 權限）

**不要在正式 RES D1 跑 migration。** 在 Cloudflare 建立獨立測試用 Audio D1，名稱可用 `resona-audio-preview`，實際 database_id 從 Wrangler 輸出取得，不要猜測。需要：

- RES 私人橋接 Worker `res-resona-identity-bridge`：不綁公開 route；`DB` 指向**適當隔離的 RES 測試身分資料庫**，不要把正式 session 複製到測試環境；`RESONA_BRIDGE_KEY` 用 Cloudflare secret 設定。
- RESONA 測試 Worker：`AUDIO_DB` 綁定獨立 Audio D1；`RES_AUTH` service binding 指向上方私人 Worker；`RES_BRIDGE_KEY` secret 必須與 RES 端一致。
- 禁止把 secret 寫入 TOML、GitHub、PR 或測試 log。密鑰輪替需兩端同步。
- RESONA Worker 的 Wrangler 設定檔**尚未建立**；先新增明確的 preview-only 設定，再執行部署。
- RES 私人橋接 TOML 目前只有 skeleton，**尚缺 D1 binding**；在核對環境及資料庫 ID 後才補上。

建議依序驗證：私人 Worker 不可從公開網址呼叫 → binding 可通 → 無 Cookie 401 → 有效 session 200 → 過期/登出/停權 401 → RESONA /me 與 /credits 正確。

## 4. `reslab.app/audio` 路由與前端

RES 正式 Worker 使用 `reslab.app` custom domain，且 static assets fallback。**不能假設另一個 Worker 自動接管 /audio**。

1. 先在隔離 preview hostname 模擬相同路由，確認 `/audio`、`/audio/*`、`/audio/api/*` 不被 RES 靜態資產吃掉。
2. 確認登入後 RES OAuth 的 `next=/audio` 在既有帳號可用；新帳號須先完成 RES 年齡確認，再設計回到 /audio 的流程。
3. 再選擇可驗證的路由整合方案（例如 RES 入口轉送至 RESONA service binding）；需處理 cookie、回應、cache、CORS、資產路徑與 API 的 worker-first 規則。
4. 此步驟要修改 RES 正式路由之前，先經審查與獨立測試，**不直接改正式部署**。

## 5. 發布前關卡

- RES 與 RESONA 的測試都有實際成功記錄（指令、commit、pass/fail）。
- 真實 Cloudflare preview 驗證登出/停權即失效。
- 獨立 D1 的帳務整合測試通過；RES 圖片點數沒有變更。
- 路由、登入回跳、Cookie、權限與密鑰輪替均已驗收。
- 退款/結算與 provider 錯誤補償尚未完成前，付費 AI SFX/BGM **不可開啟**。
- 最後才準備 PR、部署方案與回滾程序，待明確核准後上線。

## 6. 下一個開發工作包（建議順序）

A. 完成 RES 身分橋接安全修正 + 單元測試；B. RESONA 身分 API 強制驗證 + 單元測試；C. Audio D1 交易整合測試；D. preview Wrangler 設定；E. Cloudflare preview 端對端驗證；F. /audio 路由及 OAuth 回跳；G. 付費點數結算/退款；H. AI provider 與前端。

**本文件提交不代表上述工作已執行。**
