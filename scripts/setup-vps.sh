#!/usr/bin/env bash
# ==========================================
# DokanOS VPS Initial Provisioning Script
# Supported OS: Ubuntu 22.04 LTS / 24.04 LTS
# ==========================================

set -euo pipefail

echo "=================================================="
echo "    DokanOS Production VPS Setup Starting        "
echo "=================================================="

# 1. Update OS Packages
echo "[1/6] Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    git \
    jq

# 2. Configure Firewall (UFW)
echo "[2/6] Configuring UFW Firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 443/udp comment 'HTTP/3 QUIC'
sudo ufw --force enable
sudo ufw status verbose

# 3. Configure Fail2Ban (SSH Brute Force Protection)
echo "[3/6] Enabling Fail2ban for SSH security..."
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# 4. Install Docker Engine & Docker Compose Plugin
echo "[4/6] Installing official Docker Engine..."
if ! command -v docker &> /dev/null; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker "$USER"
    sudo systemctl enable docker
    sudo systemctl start docker
fi

# 5. Create DokanOS Application Directory
echo "[5/6] Creating deployment directories in /opt/dokanos..."
sudo mkdir -p /opt/dokanos/apps/api /opt/dokanos/apps/ai-service /opt/dokanos/deploy
sudo chown -R "$USER:$USER" /opt/dokanos

# 6. Setup Docker log rotation limits
echo "[6/6] Configuring global Docker log rotation daemon..."
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  }
}
EOF
sudo systemctl restart docker

echo "=================================================="
echo "    VPS Setup Complete! You are ready to deploy.  "
echo "=================================================="
