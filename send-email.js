require("dotenv").config();
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendMail() {
  try {
    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "fakhruddinnaufal2003@gmail.com",
      subject: "Invoice Pembayaran",
      html: "<h1>Pembayaran Berhasil 🎉</h1>"
    });

    console.log(result);
  } catch (err) {
    console.error(err);
  }
}

sendMail();