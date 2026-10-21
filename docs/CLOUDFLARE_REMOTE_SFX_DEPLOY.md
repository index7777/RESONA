# Cloudflare 遠端建置 SFX Preview

此文件設定的是隔離的 `resona-audio-preview`，不是正式環境。使用 Cloudflare Workers Builds 在雲端建置 Container 映像，因此開發者電腦不需要安裝 Docker。Workers Builds 的 GitHub 連線與分支設定需在 Cloudflare Dashboard 完成；它們不是 Wrangler 設定檔的一部分。

## 目前的安全狀態

- `AUDIO_GENERATION_ENABLED=false`、`AUDIO_SFX_GENERATION_ENABLED=false`：付費生成維持關閉。
- Preview 沒有公開 `workers.dev` 網址或自訂路由。
- Vite 將前端建置到 `dist/audio/`；Cloudflare static assets 從 `dist/` 提供 `/audio/*`，只有 `/audio/api/*` 會先進 Worker。
- `RES_AUTH` 指向 `res-auth-bridge-preview`。2026-10-21 已部署私人 Preview bridge，版本 `7f5db535-c57d-4d05-89c1-a4d6b8b16737`；`workers.dev`、Preview URL、自訂網域和 routes 都關閉。
- Bridge 綁定獨立、空白的 `res-identity-preview` D1（`e9cd4d92-27a9-40c4-ac9e-119b3d1ccfd2`），只建立 `users`/`sessions` 最小測試表，未複製 RES 正式會員或 session 資料。`RESONA_BRIDGE_KEY` 已設為 Cloudflare secret。
- Container 以執行時 `HF_TOKEN` 下載 gated model weights。Token 不得放進 Git、Wrangler vars、Docker build args 或映像。
- 生成結果只在請求期間存在於記憶體，不寫入 R2 或音檔資料庫。

## Cloudflare 目前進度（2026-10-21）

- RES 最新分支 `feature/resona-auth-bridge` 已同步；Bearer capability 改為固定長度 XOR 比較並補測試，橋接測試 4/4 通過。提交 `d4dee19` 與隔離 D1 Wrangler 設定 `e28703a` 已推到該功能分支；RES `main` 未改。
- Cloudflare 已建立 `res-auth-bridge-preview`，只綁隔離 D1；目前沒有公開 URL 或路由。
- Cloudflare Workers Builds 已建立 `resona-audio-preview` 專案，來源 `index7777/RESONA`，Production branch 已選 `feature/ai-audio-studio`，Build command 為 `npm ci && npm run build`，Deploy command 為 `npm run deploy:audio-preview`，Root directory 為 `/`。
- 第一次初始化 Build 使用預設 `main`：前端建置成功，Deploy 因 main 尚無 `deploy:audio-preview` script 而停止，沒有建立 `/audio` 路由。之後已把 Production branch 改成音效功能分支。
- GitHub sudo re-authentication 已由帳戶持有人完成；Cloudflare Workers and Pages GitHub App 現在只選取 `50cut` 和 `RESONA` 兩個 repository（未開啟 All repositories），並保留原先列出的 App 權限。2026-10-21 更新後 Cloudflare 專案不再顯示 disconnected 警告。
- `feature/ai-audio-studio` 的 Cloudflare Build `0b2c2122-0a46-43ac-8b58-5668038f5289` 已成功 clone、install 和前端 build，並進入遠端 Container image build；失敗原因是 Docker context 在 repo root，Container Dockerfile 的 `COPY app.py` 找不到 `worker/sfx-inference/app.py`。已把 `env.preview.containers.images.base.build_context` 改為 `./worker/sfx-inference`，等待下一次 push 驗證。
- 下一次 push 觸發 Build 後，確認 Docker context 包含 `app.py`，遠端 image build、Wrangler deploy、D1/RES_AUTH bindings 均成功，再檢查 Worker URL/routes 仍關閉。
- Audio Worker 尚未成功部署；`RES_BRIDGE_KEY` 尚未加到 Audio Worker。正式 `reslab.app` 的 RES Worker、網域與 routes 均未更動。

## Cloudflare Workers Builds 設定

1. 由帳戶持有人完成 Cloudflare 的 GitHub sudo re-authentication，恢復 `index7777/RESONA` 連線。
2. 在 `resona-audio-preview` → **Settings → Builds** 確認分支仍為 `feature/ai-audio-studio`、Root directory `/`，Build command `npm ci && npm run build`，Deploy command `npm run deploy:audio-preview`。
3. 觸發此 Preview build，確認 Wrangler 遠端 Container image build 成功；本機不需要 Docker。
4. 部署後設定 Audio Worker 的 `RES_BRIDGE_KEY` Secret（與 bridge 的 `RESONA_BRIDGE_KEY` 相同），並確認 `AUDIO_DB`/`RES_AUTH` bindings 與 Wrangler 設定一致。
5. Preview 仍不綁公開 route；先用隔離身分資料驗證 bridge，之後再設計正式 RES session 的安全整合。
6. Hugging Face 登入並接受模型存取條款後，才在 Preview Worker 新增 `HF_TOKEN` Secret；不要提交 token 或傳入映像建置流程。
7. 驗收登入、冷啟動、生成、退款與 Container 費用後，再評估 `/audio/` 正式路由。此時不修改 `reslab.app`。

## 驗收順序

1. Cloudflare Build log 顯示 `npm ci` 及 `wrangler deploy --env preview` 成功，Container image 已發布。
2. Preview Worker 仍無正式網域或公開路由，兩個生成旗標仍為 `false`。
3. 以受控測試身分呼叫健康檢查，確認 Container 冷啟動與 `/health` 成功；不要先向一般使用者開放生成。
4. 完成模型授權與 secret 設定後，在隔離測試帳戶進行一次短音效生成，量測冷啟動、生成時間、實際時長、記憶體與費用。
5. 驗證失敗退款與 Audio Credits 結算，再由使用者明確決定是否啟用 SFX 旗標。

Cloudflare 文件：

- [Deploy Containers](https://developers.cloudflare.com/containers/guides/deploy/)
- [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Container image management](https://developers.cloudflare.com/containers/guides/image-management/)
