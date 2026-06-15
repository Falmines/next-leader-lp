const API_BASE = window.location.origin;

const PACKAGES = {
  early_bird: {
    label: "Person",
    price: 190000,
    display: "Rp190.000"
  },
  group_3: {
    label: "Group",
    price: 490000,
    display: "Rp490.000"
  }
};

let snapLoaded = false;

async function readJsonSafe(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Response bukan JSON:", text);
    throw new Error(text || `Server error. Status: ${response.status}`);
  }
}

async function loadSnapScript() {
  if (snapLoaded) return;

  const res = await fetch(`${API_BASE}/api/config`);
  const config = await readJsonSafe(res);

  if (!res.ok) {
    throw new Error(config.message || "Gagal mengambil konfigurasi Midtrans");
  }

  if (!config.midtransClientKey) {
    throw new Error("MIDTRANS_CLIENT_KEY belum diset di Vercel Environment Variables");
  }

  const script = document.createElement("script");

  script.src = config.isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  script.setAttribute("data-client-key", config.midtransClientKey);

  document.body.appendChild(script);

  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = () => reject(new Error("Gagal load script Midtrans Snap"));
  });

  snapLoaded = true;
}

const modal = document.getElementById("paymentModal");
const closeBtn = document.getElementById("closePaymentModal");
const packageInput = document.getElementById("packageType");
const selectedPackageText = document.getElementById("selectedPackageText");
const paymentForm = document.getElementById("paymentForm");
const payButton = document.getElementById("payButton");

function setSelectedPackage(packageType) {
  if (!packageType || !PACKAGES[packageType]) {
    packageType = "early_bird";
  }

  const selected = PACKAGES[packageType];

  packageInput.value = packageType;
  selectedPackageText.textContent = `Paket: ${selected.label} — ${selected.display}`;
  payButton.textContent = `Bayar ${selected.display}`;

  return selected;
}

function openPaymentModal(packageType) {
  setSelectedPackage(packageType);
  modal.classList.add("active");
}

function closePaymentModal() {
  modal.classList.remove("active");
}

if (packageInput && selectedPackageText && payButton) {
  setSelectedPackage(packageInput.value || "early_bird");
}

document.querySelectorAll(".open-payment").forEach((button) => {
  button.addEventListener("click", () => {
    const packageType = button.getAttribute("data-package") || "early_bird";
    openPaymentModal(packageType);
  });
});

if (closeBtn) {
  closeBtn.addEventListener("click", closePaymentModal);
}

if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closePaymentModal();
  });
}

if (paymentForm) {
  paymentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    payButton.disabled = true;
    payButton.textContent = "Memproses pembayaran...";

    try {
      await loadSnapScript();

      const payload = {
        packageType: packageInput.value || "early_bird",
        name: document.getElementById("customerName").value.trim(),
        email: document.getElementById("customerEmail").value.trim(),
        phone: document.getElementById("customerPhone").value.trim()
      };

      const res = await fetch(`${API_BASE}/api/create-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.error || data.message || "Gagal membuat transaksi");
      }

      if (!data.token) {
        throw new Error("Token Midtrans tidak ditemukan dari server");
      }

      window.snap.pay(data.token, {
        onSuccess: function () {
          alert("Pembayaran berhasil. Notifikasi akan dikirim ke email dan WhatsApp.");
          closePaymentModal();
        },
        onPending: function () {
          alert("Pembayaran menunggu penyelesaian. Silakan selesaikan pembayaran Anda.");
          closePaymentModal();
        },
        onError: function () {
          alert("Pembayaran gagal. Silakan coba lagi.");
        },
        onClose: function () {
          console.log("Customer closed payment popup");
        }
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      payButton.disabled = false;
      setSelectedPackage(packageInput.value || "early_bird");
    }
  });
}