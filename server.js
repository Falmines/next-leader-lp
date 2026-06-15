require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const midtransClient = require("midtrans-client");
const axios = require("axios");
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const DATA_FILE = process.env.VERCEL
  ? path.join("/tmp", "orders.json")
  : path.join(__dirname, "data", "orders.json");

const PACKAGES = {
  early_bird: {
    name: "Business Presentation - Special 20 Pendaftar Pertama",
    amount: 10000,
    qty: 1
  },
  group_3: {
    name: "Business Presentation - Special Daftar Bertiga",
    amount: 490000,
    qty: 1
  }
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

const coreApi = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readOrders() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeOrders(orders) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), "utf8");
}

function saveOrder(order) {
  const orders = readOrders();
  orders.push(order);
  writeOrders(orders);
}

function updateOrder(orderId, updates) {
  const orders = readOrders();
  const index = orders.findIndex((order) => order.orderId === orderId);
  if (index >= 0) {
    orders[index] = { ...orders[index], ...updates, updatedAt: new Date().toISOString() };
    writeOrders(orders);
    return orders[index];
  }
  return null;
}

function normalizePhone(phone) {
  let cleaned = String(phone || "").replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  if (!cleaned.startsWith("62")) cleaned = "62" + cleaned;
  return cleaned;
}

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID").format(amount || 0);
}

function invoiceEmailTemplate(order) {
  const paidAt = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "long",
    timeStyle: "short"
  });

  return `
  <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:30px;">
    <div style="max-width:680px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e5eaf2;">
      <div style="background:#073995;color:white;padding:28px;text-align:center;">
        <h1 style="margin:0;font-size:28px;">INVOICE PEMBAYARAN</h1>
        <p style="margin:8px 0 0;">Next Leader Consulting</p>
      </div>
      <div style="padding:30px;">
        <div style="background:#eaf7ee;color:#15803d;padding:12px 16px;border-radius:12px;font-weight:bold;text-align:center;margin-bottom:24px;">
          ✅ PAID / LUNAS
        </div>
        <p>Halo <b>${order.customer.name}</b>,</p>
        <p>Pembayaran Anda telah berhasil dikonfirmasi melalui Midtrans.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:22px;">
          <tr><td style="padding:12px;border-bottom:1px solid #eee;color:#666;">Order ID</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;"><b>${order.orderId}</b></td></tr>
          <tr><td style="padding:12px;border-bottom:1px solid #eee;color:#666;">Program</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;"><b>Business Presentation</b></td></tr>
          <tr><td style="padding:12px;border-bottom:1px solid #eee;color:#666;">Paket</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;"><b>${order.packageName}</b></td></tr>
          <tr><td style="padding:12px;border-bottom:1px solid #eee;color:#666;">Nama</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;"><b>${order.customer.name}</b></td></tr>
          <tr><td style="padding:12px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${order.customer.email}</td></tr>
          <tr><td style="padding:12px;border-bottom:1px solid #eee;color:#666;">WhatsApp</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${order.customer.phone}</td></tr>
          <tr><td style="padding:12px;border-bottom:1px solid #eee;color:#666;">Metode Pembayaran</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${order.paymentType || "-"}</td></tr>
          <tr><td style="padding:12px;border-bottom:1px solid #eee;color:#666;">Tanggal</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${paidAt}</td></tr>
        </table>
        <div style="margin-top:24px;background:#f0f6ff;border-radius:14px;padding:22px;text-align:center;">
          <p style="margin:0;color:#073995;font-weight:bold;">Total Pembayaran</p>
          <h2 style="margin:8px 0 0;font-size:36px;color:#073995;">Rp${formatRupiah(order.amount)}</h2>
        </div>
        <p style="margin-top:24px;">Tim Next Leader akan menghubungi Anda untuk informasi teknis pelatihan.</p>
        <p style="font-size:13px;color:#777;margin-top:28px;">Invoice ini dibuat otomatis setelah pembayaran berhasil dikonfirmasi oleh Midtrans.</p>
      </div>
    </div>
  </div>`;
}

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log("[EMAIL SKIPPED] RESEND_API_KEY belum dikonfigurasi");
    return;
  }
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject,
      html
    });
    console.log("EMAIL SENT:", result);
  } catch (error) {
    console.error("EMAIL ERROR:", error);
  }
}

async function sendWhatsApp({ target, message }) {
  if (!process.env.FONNTE_TOKEN) {
    console.log("[WA SKIPPED] FONNTE_TOKEN belum dikonfigurasi");
    return;
  }
  try {
    await axios.post(
      "https://api.fonnte.com/send",
      new URLSearchParams({ target: normalizePhone(target), message }),
      { headers: { Authorization: process.env.FONNTE_TOKEN } }
    );
  } catch (error) {
    console.error("WA ERROR:", error.response?.data || error.message);
  }
}

async function sendRegistrationNotification(order) {
  if (process.env.ADMIN_EMAIL) {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Pendaftaran Baru - ${order.customer.name}`,
      html: `
        <h2>Pendaftaran Baru - Next Leader</h2>
        <p><b>Order ID:</b> ${order.orderId}</p>
        <p><b>Nama:</b> ${order.customer.name}</p>
        <p><b>Email:</b> ${order.customer.email}</p>
        <p><b>WhatsApp:</b> ${order.customer.phone}</p>
        <p><b>Paket:</b> ${order.packageName}</p>
        <p><b>Total:</b> Rp${formatRupiah(order.amount)}</p>
        <p><b>Status:</b> Menunggu pembayaran</p>`
    });
  }
  if (process.env.ADMIN_WA_NUMBER) {
    await sendWhatsApp({
      target: process.env.ADMIN_WA_NUMBER,
      message:
`Pendaftaran baru Next Leader

Order ID: ${order.orderId}
Nama: ${order.customer.name}
Email: ${order.customer.email}
WA: ${order.customer.phone}
Paket: ${order.packageName}
Total: Rp${formatRupiah(order.amount)}
Status: Menunggu pembayaran`
    });
  }
}

async function sendPaymentSuccessNotification(order) {
  const invoiceHtml = invoiceEmailTemplate(order);
  await sendEmail({
    to: order.customer.email,
    subject: `Invoice Pembayaran - ${order.orderId}`,
    html: invoiceHtml
  });
  if (process.env.ADMIN_EMAIL) {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Pembayaran Berhasil - ${order.customer.name}`,
      html: invoiceHtml
    });
  }
  await sendWhatsApp({
    target: order.customer.phone,
    message:
`Halo ${order.customer.name},

Pembayaran Anda untuk Business Presentation Next Leader sudah berhasil.

Order ID: ${order.orderId}
Paket: ${order.packageName}
Total: Rp${formatRupiah(order.amount)}

Terima kasih sudah mendaftar. Tim Next Leader akan menghubungi Anda.`
  });
  if (process.env.ADMIN_WA_NUMBER) {
    await sendWhatsApp({
      target: process.env.ADMIN_WA_NUMBER,
      message:
`Pembayaran berhasil Next Leader

Nama: ${order.customer.name}
Email: ${order.customer.email}
WA: ${order.customer.phone}
Order ID: ${order.orderId}
Total: Rp${formatRupiah(order.amount)}`
    });
  }
}

app.get("/api/config", (req, res) => {
  res.json({
    midtransClientKey: process.env.MIDTRANS_CLIENT_KEY || "",
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true"
  });
});

app.post("/api/create-transaction", async (req, res) => {
  try {
    const { packageType, name, email, phone } = req.body;
    const selectedPackage = PACKAGES[packageType];

    if (!selectedPackage) return res.status(400).json({ message: "Paket tidak valid" });
    if (!name || !email || !phone) {
      return res.status(400).json({ message: "Nama, email, dan WhatsApp wajib diisi" });
    }
    if (!process.env.MIDTRANS_SERVER_KEY || !process.env.MIDTRANS_CLIENT_KEY) {
      return res.status(500).json({ message: "MIDTRANS_SERVER_KEY atau MIDTRANS_CLIENT_KEY belum diset" });
    }

    const orderId = `NL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: selectedPackage.amount
      },
      customer_details: {
        first_name: name,
        email,
        phone: normalizePhone(phone)
      },
      item_details: [
        {
          id: packageType,
          price: selectedPackage.amount,
          quantity: selectedPackage.qty,
          name: selectedPackage.name
        }
      ],
      callbacks: {
        finish: process.env.PAYMENT_FINISH_URL || "http://localhost:3000/#daftar"
      }
    };

    const transaction = await snap.createTransaction(parameter);
    const order = {
      orderId,
      packageType,
      packageName: selectedPackage.name,
      amount: selectedPackage.amount,
      customer: { name, email, phone: normalizePhone(phone) },
      status: "pending",
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveOrder(order);
    await sendRegistrationNotification(order);
    res.json({ orderId, token: transaction.token, redirectUrl: transaction.redirect_url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal membuat transaksi payment gateway", error: error.message });
  }
});

app.post("/api/midtrans/notification", async (req, res) => {
  try {
    const statusResponse = await coreApi.transaction.notification(req.body);
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    let status = "pending";
    if (transactionStatus === "capture") status = fraudStatus === "accept" ? "paid" : "challenge";
    else if (transactionStatus === "settlement") status = "paid";
    else if (transactionStatus === "deny") status = "denied";
    else if (transactionStatus === "cancel" || transactionStatus === "expire") status = "expired";

    const existingOrder = updateOrder(orderId, {
      status,
      transactionStatus,
      fraudStatus,
      paymentType: statusResponse.payment_type || null,
      settlementTime: statusResponse.settlement_time || null,
      rawNotification: statusResponse
    });

    if (existingOrder && status === "paid" && !existingOrder.successNotificationSent) {
      await sendPaymentSuccessNotification({
        ...existingOrder,
        paymentType: statusResponse.payment_type || "-"
      });
      updateOrder(orderId, { successNotificationSent: true });
    }

    res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Webhook gagal diproses", error: error.message });
  }
});

app.get("/api/orders", (req, res) => {
  const adminToken = req.headers["x-admin-token"];
  if (adminToken !== process.env.ADMIN_DASHBOARD_TOKEN) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.json(readOrders());
});

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "API route not found" });
  }
  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Next Leader payment server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
