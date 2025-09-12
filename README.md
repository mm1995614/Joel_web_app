# Joel Web App

一個整合多個服務的網頁應用平台，包含遊戲和實用工具。

## 架構概覽

本專案採用微服務架構，使用 Docker Compose 統一管理所有服務：

- **webapp**: 主入口頁面，提供遊戲和服務的導航
- **BillGets**: 分帳記帳工具
- **Move_and_Eat**: 雙人策略棋類遊戲
- **PostgreSQL**: 統一資料庫服務
- **Nginx**: 反向代理和負載平衡

## 專案結構

```
Joel_web_app/
├── .env                        # 環境變數配置
├── .gitignore                  # Git忽略檔案
├── docker-compose.yml          # 統一的容器編排檔案
├── nginx.conf                  # Nginx 反向代理配置
├── README.md                   # 專案文檔
├── webapp/                     # 主網頁服務
│   ├── Dockerfile
│   ├── app.py
│   ├── requirements.txt
│   ├── static/
│   └── templates/
├── BillGets/                   # 分帳服務
│   ├── Dockerfile
│   ├── app.py
│   ├── requirements.txt
│   ├── static/
│   └── templates/
└── Move_and_Eat/              # 遊戲服務
    ├── Dockerfile
    ├── app.py
    ├── requirements.txt
    ├── static/
    └── templates/
```

## 快速開始

### 前置需求

- Docker
- Docker Compose

### 啟動所有服務

```bash
# 建構並啟動所有容器
docker-compose up --build

# 在背景執行
docker-compose up -d --build
```

### 訪問服務

- **主頁面**: http://localhost （透過 Nginx）
- **BillGets**: http://localhost/billgets
- **Move and Eat**: http://localhost/move-and-eat
- **健康檢查**: http://localhost/health

### 直接訪問個別服務 (開發用)

- **主網頁**: http://localhost:3000
- **BillGets**: http://localhost:5001
- **Move and Eat**: http://localhost:5000
- **PostgreSQL**: localhost:5432

## 服務說明

### webapp (主網頁)
- 提供整個平台的入口頁面
- 展示所有可用的應用程式和服務

### BillGets (分帳工具)
- 群組消費管理
- 費用分攤計算
- 使用 PostgreSQL 儲存資料

### Move_and_Eat (策略遊戲)
- 雙人線上棋類遊戲
- 即時互動遊戲介面

## 資料庫

所有需要持久化儲存的服務都使用統一的 PostgreSQL 資料庫：

- **資料庫名稱**: joel_web_app
- **使用者**: joel  
- **密碼**: 在 .env 檔案中設定

## 開發指南

### 新增服務

1. 在根目錄建立新的服務資料夾
2. 建立 Dockerfile 和相關檔案
3. 在 docker-compose.yml 中新增服務定義
4. 在 nginx.conf 中新增路由規則
5. 在 webapp 的首頁新增服務入口

### 停止服務

```bash
# 停止所有容器
docker-compose down

# 停止並移除所有資料
docker-compose down -v
```

### 查看日誌

```bash
# 查看所有服務日誌
docker-compose logs

# 查看特定服務日誌
docker-compose logs webapp
docker-compose logs billgets
docker-compose logs move-and-eat
```

## 環境變數

環境變數在 `.env` 檔案中配置：

- `POSTGRES_DB`: 資料庫名稱
- `POSTGRES_USER`: 資料庫使用者
- `POSTGRES_PASSWORD`: 資料庫密碼
- `FLASK_ENV`: Flask 運行模式 (development/production)

**注意**: .env 檔案包含敏感資訊，請勿提交到版本控制系統

## 注意事項

- 首次啟動時會自動初始化 PostgreSQL 資料庫
- 開發模式下會掛載程式碼目錄，支援熱重載
- 生產環境部署前請修改預設密碼和安全設定

## 授權

此專案僅供學習和個人使用。