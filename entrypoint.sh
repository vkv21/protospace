#!/bin/sh
set -e

DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@example.com}"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

echo "🚀 Starting CommitSpace..."
echo "Domain: $DOMAIN"

# Check if running locally (localhost/127.0.0.1)
if [ "$DOMAIN" = "localhost" ] || [ "$DOMAIN" = "127.0.0.1" ]; then
    echo "⚠️  Running in local mode (HTTP only, no SSL)"
    
    # Use simple HTTP-only nginx config for local testing
    cat > /etc/nginx/nginx.conf <<'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    sendfile on;
    keepalive_timeout 65;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;
        
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
EOF
    
    echo "✅ Local configuration applied"
    exec nginx -g 'daemon off;'
fi

# Production mode with SSL
echo "🔐 Production mode - Setting up SSL..."

# Check if certificates exist
if [ -f "$CERT_PATH/fullchain.pem" ] && [ -f "$CERT_PATH/privkey.pem" ]; then
    echo "✅ SSL certificates found"
    
    # Check if certificate expires in < 30 days
    if openssl x509 -checkend 2592000 -noout -in "$CERT_PATH/fullchain.pem"; then
        echo "✅ Certificate is valid for > 30 days"
    else
        echo "⚠️  Certificate expires soon, renewing..."
        certbot renew --nginx --non-interactive || echo "⚠️  Renewal failed, will continue with existing cert"
    fi
else
    echo "📜 No SSL certificates found, obtaining from Let's Encrypt..."
    
    # Create webroot for ACME challenge
    mkdir -p /var/www/certbot
    
    # Temporarily start nginx for HTTP-01 challenge
    nginx
    
    # Obtain certificate
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --non-interactive || {
            echo "❌ Failed to obtain SSL certificate"
            echo "⚠️  Starting without SSL (HTTP only)"
            nginx -s stop
            exec nginx -g 'daemon off;'
        }
    
    # Stop temporary nginx
    nginx -s stop
    
    echo "✅ SSL certificates obtained successfully"
fi

# Start nginx in foreground
echo "🌐 Starting Nginx web server..."
exec nginx -g 'daemon off;'
