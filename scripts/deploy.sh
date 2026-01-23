#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 CommitSpace Deployment Script${NC}"
echo "========================================"

# ============================================================
# ENSURE REQUIRED DIRECTORIES EXIST
# ============================================================
echo -e "${GREEN}📁 Setting up persistent directories...${NC}"

# Create directories for SSL certificates, logs, and Certbot logs
REQUIRED_DIRS=(
    "/home/ec2-user/letsencrypt"
    "/home/ec2-user/letsencrypt-logs"
    "/home/ec2-user/nginx-logs"
)

for DIR in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$DIR" ]; then
        echo "   Creating directory: $DIR"
        mkdir -p "$DIR"
        chmod 755 "$DIR"
    else
        echo "   ✓ Directory exists: $DIR"
    fi
done

# Verify docker.env exists
if [ ! -f "/home/ec2-user/docker.env" ]; then
    echo -e "${RED}❌ ERROR: /home/ec2-user/docker.env not found${NC}"
    echo "Please create docker.env with required environment variables:"
    echo "  DOMAIN=commitspace.com"
    echo "  EMAIL=your-email@example.com"
    exit 1
fi

echo -e "${GREEN}✅ All directories ready${NC}"
echo ""

CONTAINER_NAME="commitspace-frontend"
IMAGE_NAME="commitspace:latest"
NEW_CONTAINER="${CONTAINER_NAME}-new"

# Check if container is running
if docker ps -q -f name="^${CONTAINER_NAME}$" > /dev/null; then
    echo -e "${YELLOW}📦 Existing container found, performing zero-downtime deployment...${NC}"
    
    # Start new container on temporary port
    docker run -d \
        --name "$NEW_CONTAINER" \
        -p 8080:80 \
        -v /home/ec2-user/letsencrypt:/etc/letsencrypt \
        -v /home/ec2-user/letsencrypt-logs:/var/log/letsencrypt \
        -v /home/ec2-user/nginx-logs:/var/log/nginx \
        --env-file /home/ec2-user/docker.env \
        "$IMAGE_NAME"
    
    echo "⏳ Waiting for new container to be healthy (can take up to 60s for SSL)..."
    
    # Improved health check loop
    MAX_RETRIES=12
    COUNT=0
    HEALTHY=false
    while [ $COUNT -lt $MAX_RETRIES ]; do
        if curl -f http://localhost:8080/ > /dev/null 2>&1; then
            echo -e "${GREEN}✅ New container is healthy${NC}"
            HEALTHY=true
            break
        fi
        echo "   Waiting for new container to be ready... ($((COUNT+1))/$MAX_RETRIES)"
        sleep 5
        COUNT=$((COUNT+1))
    done
    
    # Health check new container
    if [ "$HEALTHY" = true ]; then
        echo -e "${GREEN}✅ Proceeding with swap...${NC}"
        
        # Stop old container
        echo "🛑 Stopping old container..."
        docker stop "$CONTAINER_NAME"
        docker rm "$CONTAINER_NAME"
        
        # Stop new container and recreate with correct ports
        docker stop "$NEW_CONTAINER"
        docker rm "$NEW_CONTAINER"
        
        # Start with production ports
        docker run -d \
            --name "$CONTAINER_NAME" \
            --restart unless-stopped \
            -p 80:80 \
            -p 443:443 \
            -v /home/ec2-user/letsencrypt:/etc/letsencrypt \
            -v /home/ec2-user/letsencrypt-logs:/var/log/letsencrypt \
            -v /home/ec2-user/nginx-logs:/var/log/nginx \
            --env-file /home/ec2-user/docker.env \
            "$IMAGE_NAME"
        
        echo -e "${GREEN}✅ Deployment complete!${NC}"
    else
        echo -e "${RED}❌ New container failed health check, rolling back...${NC}"
        docker stop "$NEW_CONTAINER"
        docker rm "$NEW_CONTAINER"
        echo -e "${RED}Rollback complete, old container still running${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}📦 No existing container, starting fresh...${NC}"
    
    # Start new container
    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p 80:80 \
        -p 443:443 \
        -v /home/ec2-user/letsencrypt:/etc/letsencrypt \
        -v /home/ec2-user/letsencrypt-logs:/var/log/letsencrypt \
        -v /home/ec2-user/nginx-logs:/var/log/nginx \
        --env-file /home/ec2-user/docker.env \
        "$IMAGE_NAME"
    
    echo -e "${GREEN}✅ Container started successfully!${NC}"
fi

# Cleanup old images (keep last 3)
echo "🧹 Cleaning up old Docker images..."
docker images commitspace --format "{{.ID}} {{.CreatedAt}}" | sort -rk 2 | tail -n +4 | awk '{print $1}' | xargs -r docker rmi -f || true

# Show container status
echo ""
echo "📊 Container Status:"
docker ps -f name="^${CONTAINER_NAME}$" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Log the deployment
echo "$(date): Deployment completed successfully" >> /home/ec2-user/deployment.log

echo -e "${GREEN}🎉 All done!${NC}"
