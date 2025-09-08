# Quickstart

Follow these steps to get a demo tenant running in minutes:

1. **Create a tenant** in the Platform Admin Portal and note the generated tenant ID.
2. **Configure authentication** by registering your application with Azure AD or enabling email/password login.
3. **Install the SDKs** you plan to use:
   ```bash
   npm install @saas-framework/auth-client @saas-framework/rbac @saas-framework/logging @saas-framework/email
   ```
4. **Initialize the services** in your app and verify access with the sample code from each module's guide.
5. **Explore advanced features** such as custom RBAC policies or log sinks once basic integration works.
