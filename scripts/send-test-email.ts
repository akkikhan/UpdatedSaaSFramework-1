import { emailService } from "../server/services/email";

async function main() {
  const to = process.argv[2] || "";
  if (!to) {
    console.error("Usage: tsx scripts/send-test-email.ts <recipient>");
    process.exit(1);
  }
  console.log(`Sending test email to: ${to}`);
  const ok = await emailService.sendSimpleTestEmail(to, "SMTP Test - SaaS Framework");
  console.log(ok ? "Email sent successfully" : "Email send failed");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

