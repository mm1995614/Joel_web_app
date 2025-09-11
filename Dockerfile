FROM python:3.11-slim

# 安裝 nginx 和其他必要工具
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 複製 requirements
COPY requirements.txt .
COPY BillGets/requirements.txt BillGets/requirements.txt

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r BillGets/requirements.txt

# 複製應用程式碼
COPY . .

# 複製 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 創建 supervisor 配置文件
RUN echo '[supervisord]' > /etc/supervisor/conf.d/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:nginx]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=nginx -g "daemon off;"' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/nginx.err.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/nginx.out.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:main_app]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=python /app/app.py' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/app' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/main_app.err.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/main_app.out.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:billgets_app]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=python /app/BillGets/app.py' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/app/BillGets' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/billgets_app.err.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/billgets_app.out.log' >> /etc/supervisor/conf.d/supervisord.conf

EXPOSE 3000

# 使用 supervisor 來管理所有服務
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]