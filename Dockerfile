# 多階段建構 - 為Render部署優化
FROM python:3.11-slim as base

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 創建應用目錄
WORKDIR /app

# 複製所有requirements並安裝依賴
COPY webapp/requirements.txt /app/webapp_requirements.txt
COPY BillGets/requirements.txt /app/billgets_requirements.txt
COPY Move_and_Eat/requirements.txt /app/move_and_eat_requirements.txt

RUN pip install --no-cache-dir -r webapp_requirements.txt && \
    pip install --no-cache-dir -r billgets_requirements.txt && \
    pip install --no-cache-dir -r move_and_eat_requirements.txt

# 複製應用程式碼和配置
COPY webapp/ /app/webapp/
COPY BillGets/ /app/BillGets/
COPY Move_and_Eat/ /app/Move_and_Eat/
COPY nginx.render.conf /etc/nginx/nginx.conf
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 創建supervisor配置
RUN echo '[supervisord]' > /etc/supervisor/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisor/supervisord.conf && \
    echo 'user=root' >> /etc/supervisor/supervisord.conf && \
    echo '' >> /etc/supervisor/supervisord.conf && \
    echo '[program:nginx]' >> /etc/supervisor/supervisord.conf && \
    echo 'command=nginx -g "daemon off;"' >> /etc/supervisor/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/supervisord.conf && \
    echo '' >> /etc/supervisor/supervisord.conf && \
    echo '[program:webapp]' >> /etc/supervisor/supervisord.conf && \
    echo 'command=python /app/webapp/app.py' >> /etc/supervisor/supervisord.conf && \
    echo 'directory=/app/webapp' >> /etc/supervisor/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/supervisord.conf && \
    echo '' >> /etc/supervisor/supervisord.conf && \
    echo '[program:billgets]' >> /etc/supervisor/supervisord.conf && \
    echo 'command=python /app/BillGets/app.py' >> /etc/supervisor/supervisord.conf && \
    echo 'directory=/app/BillGets' >> /etc/supervisor/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/supervisord.conf && \
    echo '' >> /etc/supervisor/supervisord.conf && \
    echo '[program:move-and-eat]' >> /etc/supervisor/supervisord.conf && \
    echo 'command=python /app/Move_and_Eat/app.py' >> /etc/supervisor/supervisord.conf && \
    echo 'directory=/app/Move_and_Eat' >> /etc/supervisor/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/supervisord.conf

# 暴露端口 (Render會使用PORT環境變數)
EXPOSE 80

# 使用start.sh來處理資料庫初始化
CMD ["/app/start.sh"]