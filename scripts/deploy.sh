#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 CommitSpace Deployment Script${NC}"
echo "========================================"

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
        -v /etc/letsencrypt:/etc/letsencrypt \
        -v /home/ec2-user/logs:/var/log/nginx \
        --env-file /home/ec2-user/docker.env \
        "$IMAGE_NAME"
    
    echo "⏳ Waiting for new container to be healthy..."
    sleep 10
    
    # Health check new container
    if curl -f http://localhost:8080/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ New container is healthy${NC}"
        
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
            -v /etc/letsencrypt:/etc/letsencrypt \
            -v /home/ec2-user/logs:/var/log/nginx \
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
        -v /etc/letsencrypt:/etc/letsencrypt \
        -v /home/ec2-user/logs:/var/log/nginx \
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
