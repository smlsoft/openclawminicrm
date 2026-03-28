# Deploy OpenClaw Mini CRM บน Hetzner VPS (เลิกใช้แล้ว)

> **หมายเหตุ:** ย้ายไป **DigitalOcean + Caddy** แล้ว ตั้งแต่ 2026-03-26
> ดูคู่มือใหม่ที่ [DEPLOY-DIGITALOCEAN.md](DEPLOY-DIGITALOCEAN.md)
>
> เอกสารด้านล่างเก็บไว้เป็น reference เท่านั้น

---

# (Legacy) Deploy OpenClaw Mini CRM บน Hetzner VPS

## สเปค VPS แนะนำ

| Plan | CPU | RAM | SSD | ราคา/เดือน |
|------|-----|-----|-----|-----------|
| **CX22** (เริ่มต้น) | 2 vCPU | 4 GB | 40 GB | €4.5 (~฿170) |
| CX32 (แนะนำ) | 4 vCPU | 8 GB | 80 GB | €8.5 (~฿310) |
| CX42 (scale) | 8 vCPU | 16 GB | 160 GB | €16 (~฿580) |

- **Location:** Ashburn หรือ Singapore (ใกล้ไทย)
- **OS:** Ubuntu 24.04

---

## ขั้นตอนทั้งหมด

### 1. สมัคร Hetzner + สร้าง VPS

1. สมัครที่ https://www.hetzner.com/cloud/
2. สร้าง Project → Add Server
3. เลือก: **Ubuntu 24.04** / **CX22** / **Singapore**
4. ใส่ SSH key (หรือตั้ง root password)
5. กด Create → ได้ IP address

### 2. Setup Server (ครั้งแรก)

```bash
# จากเครื่องตัวเอง — รัน setup script บน server
ssh root@YOUR_IP 'bash -s' < scripts/setup-server.sh
```

script จะติดตั้ง: Docker, Firewall (80/443/SSH), Auto-update

### 3. Clone repo บน server

```bash
ssh root@YOUR_IP
cd /opt
git clone https://github.com/smlsoft/smltrack.git
cd smltrack
```

### 4. สร้าง .env บน server

```bash
cp .env.example .env
nano .env
# ใส่ค่าจริงทั้งหมด (เหมือน .env ที่เครื่อง dev)
```

### 5. Setup SSL Certificate

```bash
# ชี้ domain ไปที่ IP ของ Hetzner ก่อน (DNS A record)
# แล้วรัน:
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh smlclaw.satistang.com admin@satistang.com
```

### 6. Deploy

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 7. ตรวจสอบ

```bash
docker compose -f docker-compose.prod.yml ps
```

ต้องเห็น 6 containers:

```
NAME                  STATUS
smltrack-nginx        Up (healthy)
smltrack-agent        Up (healthy)
smltrack-dashboard    Up (healthy)
smltrack-openclaw     Up (healthy)
smltrack-certbot      Up
smltrack-watchtower   Up
```

ทดสอบ: https://smlclaw.satistang.com/dashboard

---

## CI/CD — Auto Deploy เมื่อ push

### ตั้งค่า GitHub Secrets

ไปที่ GitHub repo → Settings → Secrets and variables → Actions:

| Secret | ค่า |
|--------|-----|
| `DEPLOY_HOST` | IP address ของ Hetzner VPS |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | SSH private key (สร้างด้วย `ssh-keygen`) |

### Flow

```
push to main → GitHub Actions → SSH to Hetzner → git pull → rebuild → restart
```

---

## คำสั่งที่ใช้บ่อย (บน server)

```bash
cd /opt/smltrack

# ดูสถานะ
docker compose -f docker-compose.prod.yml ps

# ดู logs
docker compose -f docker-compose.prod.yml logs -f agent
docker compose -f docker-compose.prod.yml logs -f openclaw

# Restart
docker compose -f docker-compose.prod.yml restart agent

# อัพเดท
git pull
docker compose -f docker-compose.prod.yml up -d --build

# ดู disk/memory
df -h
free -h
docker stats --no-stream
```

---

## DNS — ชี้ domain ไปที่ Hetzner

ไม่ใช้ Cloudflare Tunnel แล้ว (ใช้ Nginx + Let's Encrypt แทน)

ที่ Cloudflare DNS:
1. ลบ Tunnel route เดิม
2. เพิ่ม A record: `smlclaw` → IP ของ Hetzner
3. **ปิด Proxy (ไม่ต้อง orange cloud)** → DNS only (grey cloud)

หรือถ้าจะใช้ Cloudflare Proxy ด้วย:
- เปิด orange cloud
- SSL mode: Full (strict)
- ไม่ต้องใช้ Let's Encrypt (Cloudflare จัดการ SSL ให้)

---

## Backup MongoDB

MongoDB Atlas มี backup อัตโนมัติ (M0 free: ไม่มี)

ถ้าอยากได้ backup:

```bash
# Backup ทุกวัน (ใส่ใน crontab)
0 3 * * * mongodump --uri="MONGODB_URI" --out=/opt/backups/$(date +\%Y\%m\%d)
```

---

## Monitor

### ดู resource usage

```bash
docker stats --no-stream
```

### ดู logs ย้อนหลัง

```bash
docker compose -f docker-compose.prod.yml logs --since 1h agent
```

### ตรวจ SSL cert

```bash
echo | openssl s_client -connect smlclaw.satistang.com:443 2>/dev/null | openssl x509 -noout -dates
```
