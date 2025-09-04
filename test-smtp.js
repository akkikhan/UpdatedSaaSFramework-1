import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

async function main() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USERNAME || process.env.FROM_EMAIL;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_APP_PASSWORD;
  const to = process.env.ADMIN_EMAIL || "akki@primussoft.com";

  console.log("SMTP config:", { host, port, user, to: to });

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false },
  });

  try {
    console.log("Verifying connection...");
    await transporter.verify();
    console.log("SMTP connection OK");
  } catch (err) {
    console.error("SMTP verify failed:", err && err.message ? err.message : err);
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME || "SaaS Platform"}" <${process.env.FROM_EMAIL || user}>`,
      to,
      subject: "SMTP Test from SaaS Framework",
      text: "This is a test email sent by the local demo server to verify SMTP settings.",
      html: `<p>This is a test email sent by the local demo server to verify SMTP settings.</p><p>Time: ${new Date().toISOString()}</p>`,
    });

    console.log("sendMail result:", info);
  } catch (err) {
    console.error("sendMail failed:", err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
