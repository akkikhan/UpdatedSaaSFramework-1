# Troubleshooting

Common issues and fixes:

- **Login loop** – ensure the callback URL in Azure matches your app's URL exactly.
- **Invalid token** – confirm the server's `AUTH_SECRET` matches the client configuration.
- **Clock skew** – sync system time on both client and server when tokens appear expired.
