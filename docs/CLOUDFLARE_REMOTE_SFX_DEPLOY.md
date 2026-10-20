# Cloudflare 遠端建置 SFX Preview

此文件設定的是隔離的 `resona-audio-preview`，不是正式環境。使用 Cloudflare Workers Builds 在雲端建置 Container 映像，因此開發者電腦不需要安裝 Docker。Workers Builds 的 GitHub 連線與分支設定需在 Cloudflare Dashboard 完成；它們不是 Wrangler 設定檔的一部分。

## 目前的安全狀態

- `AUDIO_GENERATION_ENABLED=false`、`AUDIO_SFX_GENERATION_ENABLED=false`：付費生成維持關閉。
- Preview 沒有公開 `workers.dev` 網址或自訂路由。
- `RES_AUTH` 指向 `res-auth-bridge-preview`。該 Preview 服務尚未確認已部署；缺少它時不能完成 Audio Worker 部署。
- Container 以執行時 `HF_TOKEN` 下載 gated model weights。Token 不得放進 Git、Wrangler vars、Docker build args 或映像。
- 生成結果只在請求期間存在於記憶體，不寫入 R2 或音檔資料庫。

## Cloudflare Workers Builds 設定

1. 在 Cloudflare Dashboard 開啟 `resona-audio-preview` Worker 的 **Settings → Builds**，連接 `index7777/RESONA` GitHub repository。
2. 將此隔離 Preview Worker 的 **Production branch** 設為 `feature/ai-audio-studio`。這很重要：Cloudflare 對一般非正式分支的預設流程可能只上傳 Worker 版本，不建置或發布 Container 映像。不要把這個分支接到正式 RESONA Worker。
3. 將根目錄設為 repository root，建置／部署命令設為 `npm ci && npm run deploy:audio-preview`。
4. 確認 Cloudflare Builds 使用的 Wrangler 版本與 repo lockfile 相符，並允許此 Worker 使用 Containers。
5. 在 GitHub 分支觸發建置前，先確認 Preview `RES_AUTH` service binding 的目標存在且已測過；目前缺少該 Worker 時部署會被拒絕。不要為了讓部署通過而改綁正式 RES Worker。
6. Hugging Face 登入並接受模型存取條款後，才在該 Preview Worker 的 **Settings → Variables and Secrets** 新增 `HF_TOKEN`，類型選 Secret。不要提交 token 或將它傳入映像建置流程。
7. 確認 Container 用量／付費方案、映像建置權限與冷啟動成本後，再合併或推送觸發部署。這份 repo 變更不會自動連 GitHub、觸發 Cloudflare Builds 或開啟生成旗標。

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
