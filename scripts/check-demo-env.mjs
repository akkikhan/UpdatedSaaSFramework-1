const required = ['LOGGING_API_KEY', 'EMAIL_API_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required demo environment variables: ${missing.join(', ')}`);
  process.exit(1);
} else {
  console.log('All required demo environment variables are set.');
}
