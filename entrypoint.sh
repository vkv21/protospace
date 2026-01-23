#!/bin/sh
set -e
set -x  # Enable debug mode - prints every command executed

DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@example.com}"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"

echo "════════════════════════════════════════════════════════════"
echo "🚀 Starting CommitSpace Frontend"
echo "════════════════════════════════════════════════════════════"
echo "📍 Domain: $DOMAIN"
echo "📧 Email: $EMAIL"
echo "📁 Certificate path: $CERT_PATH"
echo "🕐 Timestamp: $(date)"
echo "════════════════════════════════════════════════════════════"


# Production mode with SSL
echo ""
echo "🔐 PRODUCTION MODE - Setting up SSL..."
echo ""

# ============================================================
# PRE-FLIGHT CHECKS
# ============================================================
echo "🔍 Running pre-flight checks..."
echo "────────────────────────────────────────────────────────────"

# Check 1: DNS Resolution
echo "🌐 Checking DNS resolution for $DOMAIN..."
if nslookup "$DOMAIN" > /dev/null 2>&1; then
    RESOLVED_IP=$(nslookup "$DOMAIN" | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | head -1)
    echo "   ✅ DNS resolves to: $RESOLVED_IP"
else
    echo "   ❌ ERROR: DNS resolution failed for $DOMAIN"
    echo "   Let's Encrypt will not be able to reach this server"
    echo "   Please verify your DNS A record points to this server's public IP"
    exit 1
fi

# Check 2: www subdomain DNS resolution
echo "🌐 Checking DNS resolution for www.$DOMAIN..."
if nslookup "www.$DOMAIN" > /dev/null 2>&1; then
    WWW_IP=$(nslookup "www.$DOMAIN" | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | head -1)
    echo "   ✅ DNS resolves to: $WWW_IP"
else
    echo "   ⚠️  WARNING: DNS resolution failed for www.$DOMAIN"
    echo "   Certificate request will fail for the www subdomain"
    echo "   Consider adding a DNS A record for www.$DOMAIN"
fi

# Check 3: Port 80 availability (only when certs don't exist)
if [ ! -f "$CERT_PATH/fullchain.pem" ]; then
    echo "🔌 Checking if port 80 is available for Certbot..."
    if netstat -tln 2>/dev/null | grep -q ':80 ' || ss -tln 2>/dev/null | grep -q ':80 '; then
        echo "   ❌ ERROR: Port 80 is already in use"
        echo "   Certbot standalone mode requires port 80 to be completely free"
        echo "   Cannot obtain certificates. Exiting."
        exit 1
    else
        echo "   ✅ Port 80 is available"
    fi
fi

# Check 4: Verify certbot is installed
echo "🔧 Checking Certbot installation..."
if command -v certbot > /dev/null 2>&1; then
    CERTBOT_VERSION=$(certbot --version 2>&1 | head -1)
    echo "   ✅ $CERTBOT_VERSION"
else
    echo "   ❌ ERROR: Certbot is not installed"
    exit 1
fi

echo "────────────────────────────────────────────────────────────"
echo "✅ All pre-flight checks passed"
echo ""

# ============================================================
# CERTIFICATE CHECK AND ACQUISITION
# ============================================================

# Check if certificates exist
if [ -f "$CERT_PATH/fullchain.pem" ] && [ -f "$CERT_PATH/privkey.pem" ]; then
    echo "✅ SSL certificates found at $CERT_PATH"
    
    # Check certificate expiry
    echo "📅 Checking certificate expiration..."
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH/fullchain.pem" | cut -d= -f2)
    echo "   Certificate expires: $CERT_EXPIRY"
    
    # Check if certificate expires in < 30 days
    if openssl x509 -checkend 2592000 -noout -in "$CERT_PATH/fullchain.pem"; then
        echo "   ✅ Certificate is valid for more than 30 days"
    else
        echo "   ⚠️  Certificate expires in less than 30 days"
        echo "   🔄 Attempting automatic renewal..."
        
        certbot renew --nginx --non-interactive --verbose || {
            echo "   ⚠️  Renewal failed, continuing with existing certificate"
            echo "   📋 Check /var/log/letsencrypt/letsencrypt.log for details"
        }
    fi
else
    echo "📜 No SSL certificates found at $CERT_PATH"
    echo "🔐 Obtaining certificates from Let's Encrypt..."
    echo ""
    echo "────────────────────────────────────────────────────────────"
    echo "🔌 Using Certbot STANDALONE mode"
    echo "   • Certbot will start its own temporary HTTP server on port 80"
    echo "   • Let's Encrypt will verify domain ownership via HTTP-01 challenge"
    echo "   • Requesting certificates for: $DOMAIN, www.$DOMAIN"
    echo "────────────────────────────────────────────────────────────"
    echo ""
    
    # Obtain certificate using standalone mode
    echo "🚀 Starting Certbot certificate acquisition..."
    certbot certonly \
        --standalone \
        --preferred-challenges http \
        --http-01-port 80 \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --non-interactive \
        --verbose || {
            echo ""
            echo "════════════════════════════════════════════════════════════"
            echo "❌ CERTIFICATE ACQUISITION FAILED"
            echo "════════════════════════════════════════════════════════════"
            echo ""
            echo "📋 Certbot error details (last 100 lines):"
            echo "────────────────────────────────────────────────────────────"
            tail -100 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || echo "No log file found"
            echo "────────────────────────────────────────────────────────────"
            echo ""
            echo "🔍 Common issues:"
            echo "   1. DNS not pointing to this server"
            echo "   2. Port 80 not accessible from the internet (check security groups)"
            echo "   3. Domain validation timeout (DNS propagation)"
            echo "   4. Rate limiting (Let's Encrypt limits: 5 failures per hour)"
            echo ""
            echo "💡 Next steps:"
            echo "   1. Verify DNS: dig $DOMAIN +short"
            echo "   2. Test port 80: curl -I http://$DOMAIN"
            echo "   3. Check security groups allow inbound TCP port 80"
            echo "   4. Review full logs at: /var/log/letsencrypt/letsencrypt.log"
            echo ""
            echo "════════════════════════════════════════════════════════════"
            echo "🛑 EXITING - Cannot start without SSL certificates"
            echo "════════════════════════════════════════════════════════════"
            exit 1
        }
    
    echo ""
    echo "✅ SSL certificates obtained successfully!"
    echo "📁 Certificates stored at: $CERT_PATH"
    ls -lah "$CERT_PATH"
fi

# ============================================================
# START NGINX
# ============================================================
echo ""
echo "════════════════════════════════════════════════════════════"
echo "🌐 Starting Nginx web server with HTTPS..."
echo "════════════════════════════════════════════════════════════"
echo ""

# Verify nginx config is valid
echo "🔧 Testing Nginx configuration..."
nginx -t || {
    echo "❌ ERROR: Nginx configuration test failed"
    echo "📋 Nginx config details:"
    cat /etc/nginx/nginx.conf
    exit 1
}
echo "✅ Nginx configuration is valid"
echo ""

echo "🚀 Starting Nginx in foreground mode..."
exec nginx -g 'daemon off;'
