# CommitSpace Deployment Guide

This guide walks you through deploying CommitSpace to AWS EC2 with Docker, Nginx, Let's Encrypt SSL, and GitHub Actions CI/CD.

## 📋 Prerequisites

- AWS EC2 instance (running with SSH access)
- Domain name: `commitspace.com` (pointed to EC2)
- GitHub repository access
- SSH key for EC2 access

## 🏗️ Architecture

- **Frontend**: React + Vite (compiled to static assets)
- **Web Server**: Nginx (Alpine Linux)
- **Container**: Docker with multi-stage build
- **SSL**: Let's Encrypt (automatic certificate management)
- **CI/CD**: GitHub Actions (automated deployment on push to main)

---

## 🚀 Deployment Steps

### Step 1: Configure DNS (Namecheap)

1. Log into Namecheap
2. Go to your domain → Advanced DNS
3. Add A records:
   - **Host**: `@` → **Value**: `3.108.192.12` (your EC2 IP)
   - **Host**: `www` → **Value**: `3.108.192.12`
4. Wait for DNS propagation (5-30 minutes)
5. Verify: `dig commitspace.com` should return your EC2 IP

---

### Step 2: Setup EC2 Instance

**SSH into your EC2 instance:**

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@3.108.192.12
```

**Download and run setup script:** <--CURRENT STEP

```bash
curl -O https://raw.githubusercontent.com/vkv21/commitspace-fe/main/scripts/setup-ec2.sh
chmod +x setup-ec2.sh
./setup-ec2.sh
```

**Log out and back in** (for Docker group to take effect):

```bash
exit
ssh -i ~/.ssh/your-key.pem ec2-user@3.108.192.12
```

**Verify Docker works:**

```bash
docker --version
docker ps
```

**Edit docker.env with your values:**

```bash
nano ~/docker.env
```

Should contain:

```bash
DOMAIN=commitspace.com
EMAIL=vivekkannan6549@gmail.com
VITE_API_URL=https://commitspace.com/api
```

**Download deploy script:**

```bash
curl -O https://raw.githubusercontent.com/vkv21/commitspace-fe/main/scripts/deploy.sh
chmod +x deploy.sh
```

---

### Step 3: Configure GitHub Secrets

1. Go to: https://github.com/vkv21/commitspace-fe/settings/secrets/actions
2. Click "New repository secret"
3. Add these 4 secrets:

| Secret Name    | Value                         | Description                                    |
| -------------- | ----------------------------- | ---------------------------------------------- |
| `EC2_HOST`     | `3.108.192.12`                | EC2 public IP                                  |
| `EC2_USERNAME` | `ec2-user`                    | SSH username                                   |
| `EC2_SSH_KEY`  | (your private key contents)   | Full SSH private key including BEGIN/END lines |
| `VITE_API_URL` | `https://commitspace.com/api` | Production API URL                             |

**To get SSH key:**

```bash
cat ~/.ssh/your-key.pem
```

Copy entire output including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`

---

### Step 4: Deploy to EC2

**Option A: Automatic (via GitHub Actions)**

1. Merge your code to `main` branch:

   ```bash
   git checkout main
   git merge presence-detect
   git push origin main
   ```

2. Watch GitHub Actions workflow:
   - Go to: https://github.com/vkv21/commitspace-fe/actions
   - Monitor the deployment progress
   - Takes about 5-10 minutes

**Option B: Manual (first time only)**

If you want to test before setting up GitHub Actions:

```bash
# SSH to EC2
ssh -i ~/.ssh/your-key.pem ec2-user@3.108.192.12

# Clone repository
git clone https://github.com/vkv21/commitspace-fe.git
cd commitspace-fe

# Build Docker image
docker build --build-arg VITE_API_URL=https://commitspace.com/api -t commitspace:latest .

# Run deployment script
cd ~
bash deploy.sh
```

---

### Step 5: Verify Deployment

**Check container status:**

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@3.108.192.12
docker ps
docker logs commitspace-frontend
```

**Test website:**

1. Open browser: https://commitspace.com
2. Should see:
   - Valid SSL certificate (green padlock)
   - CommitSpace app loads
   - Webcam permission prompt appears
   - Dark mode toggle works

**Check SSL certificate:**

```bash
curl -I https://commitspace.com
# Should return: HTTP/2 200
```

---

## 🔧 Configuration Files

### Environment Variables

**Build-time** (baked into JavaScript bundle):

- `VITE_API_URL`: API endpoint URL

**Runtime** (container configuration):

- `DOMAIN`: Domain name for SSL certificates
- `EMAIL`: Email for Let's Encrypt notifications

### Port Mapping

- **80** (HTTP): Redirects to HTTPS
- **443** (HTTPS): Main application

---

## 🔄 Continuous Deployment

Every push to `main` branch triggers:

1. **Build**: GitHub Actions builds Docker image
2. **Transfer**: Image transferred to EC2 via SCP
3. **Deploy**: Zero-downtime deployment script runs
4. **Health Check**: Verifies new container is healthy
5. **Rollback**: Automatic if health check fails

**Deployment time**: ~5-10 minutes from push to live

---

## 🛠️ Maintenance

### View Logs

```bash
# Container logs
docker logs -f commitspace-frontend

# Nginx access logs
docker exec commitspace-frontend tail -f /var/log/nginx/access.log

# Nginx error logs
docker exec commitspace-frontend tail -f /var/log/nginx/error.log
```

### SSL Certificate Renewal

Automatic! Certificates renew automatically 30 days before expiration.

**Manually check certificate status:**

```bash
docker exec commitspace-frontend openssl x509 -in /etc/letsencrypt/live/commitspace.com/fullchain.pem -noout -dates
```

### Backup

**Manual backup:**

```bash
bash ~/backup.sh
```

**Automated backups** (recommended - add to crontab):

```bash
crontab -e
# Add this line (runs weekly on Sunday at 2am):
0 2 * * 0 /home/ec2-user/backup.sh
```

### Restart Container

```bash
docker restart commitspace-frontend
```

### Update Application

Just push to main branch! GitHub Actions handles deployment automatically.

Or manually:

```bash
cd ~/commitspace-fe
git pull origin main
docker build --build-arg VITE_API_URL=https://commitspace.com/api -t commitspace:latest .
bash ~/deploy.sh
```

---

## 🐛 Troubleshooting

### DNS Not Resolving

```bash
# Check DNS
dig commitspace.com

# If not working, update /etc/hosts temporarily
sudo nano /etc/hosts
# Add: 3.108.192.12 commitspace.com
```

### SSL Certificate Fails

```bash
# Check DNS first (must point to your IP)
dig commitspace.com

# Check port 80 is open
sudo netstat -tlnp | grep :80

# Check certbot logs
docker exec commitspace-frontend cat /var/log/letsencrypt/letsencrypt.log

# Manual certificate request
docker exec -it commitspace-frontend sh
certbot certonly --webroot --webroot-path=/var/www/certbot -d commitspace.com -d www.commitspace.com
```

### Container Won't Start

```bash
# Check logs
docker logs commitspace-frontend

# Check if port is in use
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Stop all containers
docker stop $(docker ps -aq)

# Try again
bash ~/deploy.sh
```

### GitHub Actions Fails

**Common causes:**

1. **SSH key wrong**: Check secret format (include BEGIN/END lines)
2. **EC2 not accessible**: Check security group allows GitHub IPs
3. **Docker not installed**: Run setup-ec2.sh again
4. **deploy.sh not found**: Download it to /home/ec2-user/

**Debug:**

- Check workflow logs in GitHub Actions tab
- SSH to EC2 and check Docker status
- Verify all secrets are set correctly

### High Memory Usage

```bash
# Check memory
free -h

# Clean up old images
docker system prune -a

# Restart container
docker restart commitspace-frontend
```

---

## 💰 AWS Costs

**Estimated monthly cost:**

- EC2 t3.small: ~$15-17
- EBS 20GB: ~$2
- Data transfer: ~$5-10
- **Total: ~$22-30/month**

**Cost optimization:**

- Use AWS Free Tier if eligible (first year)
- Stop instance when not in use (development)
- Use Reserved Instances for production (save 30-40%)

---

## 🔐 Security Checklist

- [x] HTTPS only (HTTP redirects to HTTPS)
- [x] HSTS header enabled
- [x] SSH key-only authentication
- [x] Firewall configured (ports 22, 80, 443 only)
- [x] Security headers (X-Frame-Options, CSP, etc.)
- [x] SSL auto-renewal enabled
- [x] Docker runs as non-root user
- [x] Secrets not in Git (docker.env gitignored)

---

## 📞 Support

**Issues or questions?**

- Check troubleshooting section above
- Review container logs: `docker logs commitspace-frontend`
- Check GitHub Actions workflow logs

---

## 🎯 Next Steps

### Future Enhancements

1. **Backend Integration**
   - Add Express backend container
   - Update nginx.conf with API proxy
   - Connect to backend at /api endpoint

2. **Database Setup**
   - Add PostgreSQL container
   - Mount EBS volume for data persistence
   - Configure automated backups

3. **Monitoring**
   - Add CloudWatch integration
   - Set up UptimeRobot for health checks
   - Configure alerts for downtime

4. **Performance**
   - Add CloudFront CDN
   - Implement bundle code splitting
   - Add service worker for offline support

---

## ✅ Unified Production Deployment Runbook & Checklist

> Use this checklist for every production deploy, whether first-time or routine.

### 1. Branch & Repo Status

- [ ] You are on the correct production deployment branch (`prod-demo`)
- [ ] The working directory is clean (no uncommitted/staged changes)
- [ ] `prod-demo` is up-to-date with remote
- [ ] All code/config changes intended for production are pushed to `prod-demo`
- [ ] If merging/rebasing from development (`main`), that is complete and re-tested locally!

### 2. GitHub Actions/Workflow Ready

- [ ] `.github/workflows/deploy.yml` is set to trigger on `prod-demo` branch
- [ ] Workflow allows for manual (`workflow_dispatch`) trigger if needed
- [ ] Workflow accurately references all needed scripts, environment files, and secrets

### 3. Secrets & Environment

- [ ] All required repository secrets set in GitHub:
  - [ ] `EC2_HOST`
  - [ ] `EC2_USERNAME`
  - [ ] `EC2_SSH_KEY`
  - [ ] `VITE_API_URL` (your prod API URL)
- [ ] **NO** secrets are hardcoded or stored in code/configs
- [ ] `.env`, `docker.env`, etc. are up-to-date
- [ ] Secret rotation schedule in place (esp. SSH key)

### 4. DNS & SSL

- [ ] DNS (`A` records for `@` and `www`) at Namecheap point to your EC2 IP
- [ ] DNS propagation is verified (`dig`, online checkers)
- [ ] SSL will/would be automatically provisioned, HTTP/HTTPS ports are open

### 5. EC2 Instance Health

- [ ] EC2 is up and reachable via SSH
- [ ] Docker (+ Docker Compose if needed) installed & up to date
- [ ] Security group allows HTTP, HTTPS, SSH
- [ ] Scripts (`setup-ec2.sh`, `deploy.sh`) are ready and executable
- [ ] Env/config files match intended environment

### 6. Triggering Deployment

- [ ] (First deploy) All above checks are ✅
- [ ] (Routine deploy) Code is merged into `prod-demo`, workflow is triggered (push/manual)
- [ ] SSH key is available for emergency
- [ ] Actions workflow/job monitored for successful completion

### 7. Post-Deployment Verification

- [ ] https://commitspace.com and www variant loads, SSL green, no errors
- [ ] App displays/works (including backend API calls)
- [ ] `docker ps`/logs reflect healthy containers
- [ ] SSL cert validity confirmed
- [ ] Rollback plan ready for critical deploys

### 8. Routine Ops & Edge Cases

- [ ] After deployment, review EC2 logs for issues
- [ ] Automated SSL renewal is confirmed
- [ ] Old Docker images/volumes cleaned up periodically
- [ ] Tag or backup before high-impact deploys/secret updates

### 9. Branch Management / Team Best Practices

- [ ] No direct commits to `prod-demo` (use PR/merge)
- [ ] Set branch protection as needed
- [ ] Routine dev/feature work: develop/merge on `main`, deploy via `prod-demo`
- [ ] Deploy logs/tags kept for auditing major changes
- [ ] Lessons learned after each deploy are shared

### 10. Troubleshooting Quick Reference

| Symptom               | Common Issues                              |
| --------------------- | ------------------------------------------ |
| SSH/Actions Fail      | Key, permissions, security group           |
| DNS/SSL Fail          | DNS/delay, port not open, config typo      |
| Site loads/no backend | Env/secret wrong, API/CORS, missing route  |
| All green, no update  | Wrong branch, old code, workflow not run   |
| Container unhealthy   | Docker build fail, bad env, port collision |

---

## 📝 File Structure

```
fe/
├── Dockerfile                 # Multi-stage Docker build
├── nginx.conf                 # Web server configuration
├── docker-compose.yml         # Local development orchestration
├── entrypoint.sh              # Container startup script
├── .dockerignore              # Build context optimization
├── .env.production            # Production environment variables
├── docker.env.example         # Environment template
├── .github/
│   └── workflows/
│       └── deploy.yml         # CI/CD pipeline
├── scripts/
│   ├── deploy.sh              # EC2 deployment script
│   ├── setup-ec2.sh           # EC2 initial setup
│   └── backup.sh              # Backup automation
└── DEPLOYMENT.md              # This file
```

---

**Last updated**: 2026-01-21  
**Version**: 1.0.0  
**Maintainer**: vivekkannan6549@gmail.com
