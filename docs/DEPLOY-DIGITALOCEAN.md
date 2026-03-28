# Deploy OpenClaw Mini CRM บน DigitalOcean

> ย้ายจาก Hetzner + Nginx มาใช้ **DigitalOcean + Caddy** ตั้งแต่ 2026-03-26
> Caddy จัดการ SSL อัตโนมัติ ไม่ต้องตั้ง Certbot

---

## สเปค VPS แนะนำ

| Plan | CPU | RAM | SSD | ราคา/เดือน |
|------|-----|-----|-----|-----------|
| **Basic $24** (แนะนำ) | 2 vCPU | 4 GB | 80 GB | $24 (~850 บาท) |
| Basic $48 (scale) | 4 vCPU | 8 GB | 160 GB | $48 |

- **Region:** Singapore (SGP1) --- ใกล้ไทย
- **OS:** Ubuntu 24.04

---

## ขั้นตอนทั้งหมด

### 1. สร้าง Droplet

1. สมัครที่ https://www.digitalocean.com/
2. Create Droplet --> **Ubuntu 24.04** / **Basic $24** / **Singapore**
3. ใส่ SSH key
4. Create --> ได้ IP address

### 2. Setup Server (ครั้งแรก)

```bash
ssh root@YOUR_IP

# ติดตั้ง Docker
curl -fsSL https://get.docker.com | sh

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### 3. Clone repo

```bash
cd /opt
git clone https://github.com/smlsoft/openclawminicrm.git
cd openclawminicrm
```

### 4. สร้าง .env

```bash
cp .env.example .env
nano .env
# ใส่ค่าจริงทั้งหมด
```

### 5. DNS --- ชี้ domain

ที่ Cloudflare DNS (หรือ registrar อื่น):
- เพิ่ม A record: `crm.satistang.com` --> IP ของ DigitalOcean
- **DNS only (grey cloud)** --- ให้ Caddy จัดการ SSL เอง

### 6. Deploy

```bash
docker compose -f docker-compose.caddy.yml up -d --build
```

### 7. ตรวจสอบ

```bash
docker compose -f docker-compose.caddy.yml ps
```

ต้องเห็น containers:

```
smltrack-caddy        Up
smltrack-agent        Up
smltrack-dashboard    Up
smltrack-openclaw     Up
smltrack-mongodb      Up
```

ทดสอบ: https://crm.satistang.com/dashboard

### 8. Seed ข้อมูลตัวอย่าง

```bash
curl -s -X POST "https://crm.satistang.com/dashboard/api/seed"
```

---

## คำสั่งที่ใช้บ่อย (บน server)

```bash
cd /opt/openclawminicrm

# ดูสถานะ
docker compose -f docker-compose.caddy.yml ps

# ดู logs
docker compose -f docker-compose.caddy.yml logs -f agent
docker compose -f docker-compose.caddy.yml logs -f dashboard
docker compose -f docker-compose.caddy.yml logs -f openclaw

# Restart service
docker compose -f docker-compose.caddy.yml restart dashboard

# อัพเดท + rebuild (ใช้ --no-cache ทุกครั้ง!)
git pull
docker compose -f docker-compose.caddy.yml build --no-cache dashboard
docker compose -f docker-compose.caddy.yml up -d --force-recreate dashboard

# ดู disk/memory
df -h
free -h
docker stats --no-stream
```

> **สำคัญ:** ใช้ `--no-cache` ทุกครั้งที่ build ไม่งั้นอาจได้ไฟล์เก่า

---

## CI/CD --- Auto Deploy เมื่อ push

### GitHub Secrets

ไปที่ GitHub repo --> Settings --> Secrets:

| Secret | ค่า |
|--------|-----|
| `DEPLOY_HOST` | IP address ของ DigitalOcean |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | SSH private key |

### Flow

```
push to main --> GitHub Actions --> SSH to DO --> git pull --> rebuild --> restart
```

---

## Backup MongoDB

MongoDB อยู่บน server เดียวกัน (Docker volume):

```bash
# Backup ทุกวัน (ใส่ใน crontab)
0 3 * * * docker exec smltrack-mongodb mongodump --out=/data/backup/$(date +\%Y\%m\%d)
```

---

## เทียบกับ Hetzner (เดิม)

| | Hetzner (เดิม) | DigitalOcean (ปัจจุบัน) |
|---|---|---|
| Reverse Proxy | Nginx + Certbot | **Caddy** (auto HTTPS) |
| SSL | Let's Encrypt (manual renew) | **Caddy จัดการเอง** |
| Compose file | `docker-compose.prod.yml` | `docker-compose.caddy.yml` |
| MongoDB | Atlas M0 (free) | **Docker local** (ไม่จำกัด) |
| Region | Singapore | Singapore |

> `docker-compose.prod.yml` + `nginx/` ยังอยู่ใน repo แต่ไม่ได้ใช้แล้ว
