#!/bin/bash

# 檢查是否有資料庫URL
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database to be ready..."
    while ! python -c "
import os
import psycopg2
try:
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    conn.close()
    print('Database is ready!')
except:
    exit(1)
" 2>/dev/null; do
        echo "Database not ready, waiting..."
        sleep 2
    done

    # 初始化BillGets資料庫
    echo "Initializing database..."
    cd /app/BillGets
    python -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('Database initialized!')
"
else
    echo "No DATABASE_URL provided, BillGets will use SQLite fallback"
fi

# 啟動supervisor
echo "Starting services..."
exec supervisord -c /etc/supervisor/supervisord.conf