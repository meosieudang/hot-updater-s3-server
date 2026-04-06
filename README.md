# Hot Updater Server — Supabase Storage + Prisma SQLite

OTA update server cho React Native. Upload bundle lên **Supabase Storage**, metadata lưu **SQLite qua Prisma**, API server **Express** tự host — không cần Lambda@Edge, không cần edge function.

## Kiến trúc

```
React Native App
      │  GET /hot-updater/check-update
      ▼
Express Server (VPS của bạn)  ←── CLI: npx hot-updater deploy
      │  đọc/ghi metadata
      ▼
Prisma + SQLite (local)
      │  trả về Supabase URL
      ▼
Supabase Storage (lưu bundle .zip)
```

## Yêu cầu

- **Node.js 22+**
- Supabase project (free tier đủ dùng)
- VPS hoặc server chạy Node

---

## Cài đặt

### 1. Cài dependencies

```bash
npm install
```

### 2. Tạo file `.env`

```bash
cp .env.example .env
```

Điền vào `.env`:

```env
HOT_UPDATER_SUPABASE_URL=https://your-project-id.supabase.co
HOT_UPDATER_SUPABASE_ANON_KEY=eyJ...
HOT_UPDATER_SUPABASE_BUCKET_NAME=hot-updater-bundles
HOT_UPDATER_API_KEY=your-secret-key
DATABASE_URL="file:./data/hot_updater.db"
```

### 3. Generate Prisma schema từ hot-updater

```bash
npm run db:generate
```

Lệnh này sẽ in ra Prisma schema. Copy phần `model Bundle { ... }` vào file `prisma/schema.prisma`.

> **Lưu ý:** File `prisma/schema.prisma` đã có sẵn schema mẫu từ docs. Nếu `db:generate` in ra schema khác thì dùng bản mới hơn.

### 4. Tạo database và chạy migration

```bash
npm run db:migrate
# hoặc nếu không cần migration history:
npm run db:push
```

### 5. Generate Prisma Client

```bash
npm run prisma:generate
```

### 6. Chạy server

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

---

## Deploy lên VPS với Docker

```bash
cp .env.example .env
# Điền .env

docker compose up -d
docker compose logs -f
```

---

## Cấu hình Supabase Storage

1. Vào Supabase Dashboard → **Storage** → **New bucket**
2. Đặt tên bucket (ví dụ: `hot-updater-bundles`)
3. Chọn **Public** để React Native download trực tiếp không cần auth
4. Copy bucket name vào `.env`

---

## Cấu hình CLI trong project React Native

Tạo `hot-updater.config.ts` trong project RN:

```typescript
import "dotenv/config";
import { defineConfig } from "hot-updater";
import { bare } from "@hot-updater/bare";
import { supabaseStorage } from "@hot-updater/supabase";
import { standaloneRepository } from "@hot-updater/standalone";

export default defineConfig({
  build: bare({ enableHermes: true }),
  storage: supabaseStorage({
    supabaseUrl: process.env.HOT_UPDATER_SUPABASE_URL!,
    supabaseAnonKey: process.env.HOT_UPDATER_SUPABASE_ANON_KEY!,
    bucketName: process.env.HOT_UPDATER_SUPABASE_BUCKET_NAME!,
  }),
  database: standaloneRepository({
    baseUrl: "https://your-server.com/hot-updater",
    headers: { "x-api-key": process.env.HOT_UPDATER_API_KEY! },
  }),
});
```

Deploy bundle:
```bash
npx hot-updater deploy -p android -c production
npx hot-updater deploy -p ios -c production
```

---

## Cấu hình React Native App

```typescript
import { HotUpdater } from "@hot-updater/react-native";

export default HotUpdater.wrap({
  baseURL: "https://your-server.com/hot-updater",
  updateStrategy: "appVersion",
  updateMode: "auto",
})(App);
```

---

## API Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/health` | ❌ | Health check |
| GET | `/hot-updater/app-version/*` | ❌ | App kiểm tra update |
| GET | `/hot-updater/fingerprint/*` | ❌ | App kiểm tra update (fingerprint) |
| GET | `/hot-updater/api/bundles` | ✅ | Liệt kê bundles |
| POST | `/hot-updater/api/bundles` | ✅ | CLI tạo bundle mới |
| PATCH | `/hot-updater/api/bundles/:id` | ✅ | Cập nhật bundle |
| DELETE | `/hot-updater/api/bundles/:id` | ✅ | Xóa bundle |

Auth header: `x-api-key: <HOT_UPDATER_API_KEY>`
