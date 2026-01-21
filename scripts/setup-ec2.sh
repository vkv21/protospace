#!/bin/bash
set -e

echo "🔧 Setting up EC2 instance for CommitSpace deployment..."
echo "=============================================="

# Update system
echo "📦 Updating system packages..."
sudo yum update -y

# Install Docker
echo "🐳 Installing Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
echo "👤 Adding $USER to docker group..."
sudo usermod -aG docker $USER

# Install Docker Compose
echo "🎼 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install other tools
echo "🛠️ Installing additional tools..."
sudo yum install -y git htop curl wget

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p /home/$USER/logs
mkdir -p /home/$USER/backups
sudo mkdir -p /etc/letsencrypt
sudo chown $USER:$USER /etc/letsencrypt

# Create docker.env template
echo "📝 Creating docker.env template..."
cat > /home/$USER/docker.env << 'EOF'
DOMAIN=commitspace.com
EMAIL=vivekkannan6549@gmail.com
VITE_API_URL=https://commitspace.com/api
EOF

echo ""
echo "✅ EC2 setup complete!"
echo ""
echo "⚠️  IMPORTANT: Next steps:"
echo "1. Log out and log back in for Docker group to take effect"
echo "2. Verify docker.env has correct values: nano /home/$USER/docker.env"
echo "3. Copy the deploy.sh script to /home/$USER/"
echo "4. Set up GitHub Actions secrets in your repository"
echo ""
echo "Versions installed:"
docker --version
docker-compose --version
git --version
