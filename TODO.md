# Publish readiness to-do

- [x] Remove local file dependencies (e.g., auth-client) and depend on published versions
- [ ] Generate build artifacts for all packages (`npm run packages:build`)
- [x] Add unit and integration tests for authentication, RBAC, and logging modules
- [ ] Ensure `npm install` completes on clean environment and update lockfiles
- [x] Document usage and configuration for all auth providers and modules
- [x] Verify runtime dependencies (e.g., fetch, WebSocket) are declared
- [x] Set up CI workflow to run lint, build, and tests
- [x] Provide examples demonstrating RBAC and logging integrations
