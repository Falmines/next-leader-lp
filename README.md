# Next Leader Landing Page + Payment Gateway

Fitur:
- Landing page full Next Leader.
- Form pendaftaran peserta.
- Midtrans Snap Payment Gateway.
- Webhook notifikasi pembayaran dari Midtrans.
- Email otomatis via SMTP.
- WhatsApp otomatis via Fonnte.
- Data order disimpan di `data/orders.json`.

## Cara Install

```bash
npm install
cp .env.example .env
npm run dev
```

Buka:

```bash
http://localhost:3000
```

## Setting Midtrans

1. Buat akun Midtrans.
2. Ambil `Server Key` dan `Client Key`.
3. Masukkan ke file `.env`.
4. Di dashboard Midtrans, set Payment Notification URL:

```bash
https://domain-anda.com/api/midtrans/notification
```

Saat local development, gunakan ngrok:

```bash
ngrok http 3000
```

Lalu masukkan URL ngrok:

```bash
https://xxxx.ngrok-free.app/api/midtrans/notification
```

## Setting Email

Gunakan SMTP. Untuk Gmail, pakai App Password.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=emailanda@gmail.com
SMTP_PASS=app-password-email
EMAIL_FROM="Next Leader <emailanda@gmail.com>"
ADMIN_EMAIL=admin@nextleader.id
```

## Setting WhatsApp

Project ini memakai Fonnte.

```env
FONNTE_TOKEN=token-fonnte-anda
ADMIN_WA_NUMBER=6285722409993
```

## API

Create transaction:

```http
POST /api/create-transaction
```

Body:

```json
{
  "packageType": "early_bird",
  "name": "Nama Peserta",
  "email": "peserta@email.com",
  "phone": "085712345678"
}
```

Paket:
- `early_bird` = Rp190.000
- `group_3` = Rp490.000

Webhook:

```http
POST /api/midtrans/notification
```

Order list admin:

```http
GET /api/orders
x-admin-token: token-dari-env
```
