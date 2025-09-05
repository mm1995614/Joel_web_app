# Web Game Room 🎮

一個遊戲房間平台，可以選擇和玩不同的遊戲。

## 結構

- **主應用** (`app.py`): 遊戲選擇主頁面 (端口 3000)
- **Move_and_Eat**: 邊走邊吃棋類遊戲 (端口 5000)
- **Nginx**: 反向代理服務器 (端口 80)

## 快速開始

### 使用 Docker Compose 啟動

```bash
# 構建和啟動所有服務
docker-compose up --build

# 在後台運行
docker-compose up -d

# 停止服務
docker-compose down
```

### 訪問方式

- **遊戲房間主頁**: http://localhost
- **邊走邊吃遊戲**: http://localhost/move-and-eat/
- **服務健康檢查**: http://localhost/health

### 本地開發

如果你想用 ngrok 測試單個遊戲：

```bash
# 進入特定遊戲目錄
cd Move_and_Eat

# 啟動單個遊戲
docker-compose up

# 在另一個終端用 ngrok
ngrok http 5000
```

## 添加新遊戲

1. 在 `web_game_room` 目錄下創建新的遊戲資料夾
2. 在 `app.py` 中添加新遊戲到 `games` 列表
3. 在主 `docker-compose.yml` 中添加新服務
4. 在 `nginx.conf` 中添加路由規則

## 部署

這個設置可以直接部署到 Render 或其他支持 Docker 的平台。只需要將整個 `web_game_room` 目錄上傳到 GitHub，然後連接到你的部署平台即可。