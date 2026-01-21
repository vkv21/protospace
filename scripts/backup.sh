#!/bin/bash

BACKUP_DIR="/home/ec2-user/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "💾 Creating backup..."

# Backup SSL certificates
if [ -d "/etc/letsencrypt" ]; then
    echo "📜 Backing up SSL certificates..."
    sudo tar -czf "$BACKUP_DIR/ssl-certs.tar.gz" /etc/letsencrypt/
fi

# Backup configuration files
echo "⚙️ Backing up configuration files..."
cp /home/ec2-user/docker.env "$BACKUP_DIR/" 2>/dev/null || true
cp /home/ec2-user/deploy.sh "$BACKUP_DIR/" 2>/dev/null || true

# Backup logs (last 7 days)
echo "📋 Backing up recent logs..."
find /home/ec2-user/logs -name "*.log" -mtime -7 -exec cp {} "$BACKUP_DIR/" \; 2>/dev/null || true

# List Docker images
echo "🐳 Saving Docker image list..."
docker images > "$BACKUP_DIR/docker-images.txt"

echo "✅ Backup complete: $BACKUP_DIR"

# Optional: Upload to S3
# aws s3 sync "$BACKUP_DIR" s3://your-bucket/commitspace-backups/

# Cleanup old backups (keep last 7 days)
find /home/ec2-user/backups -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

echo "🧹 Old backups cleaned up"
