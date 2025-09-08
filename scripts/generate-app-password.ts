import crypto from "crypto";

const password = crypto
  .randomBytes(12)
  .toString("base64")
  .replace(/[^a-zA-Z0-9]/g, "")
  .slice(0, 16);

console.log(`Generated app password: ${password}`);
console.log("Add this value to your .env as SMTP_APP_PASSWORD or SMTP_PASSWORD.");
