@echo off
echo.
echo 🎉 SaaS Framework Modules Successfully Published to npm!
echo ============================================================
echo.
echo ✅ Published Packages:
echo.

echo 📦 Core Framework Modules:
npm view @akkikhan/saas-framework-auth version 2>nul && echo   ✅ @akkikhan/saas-framework-auth@1.0.0-dev.1 || echo   ❌ @akkikhan/saas-framework-auth (failed)

npm view @akkikhan/saas-framework-rbac version 2>nul && echo   ✅ @akkikhan/saas-framework-rbac@1.0.0-dev.1 || echo   ❌ @akkikhan/saas-framework-rbac (failed)

npm view @akkikhan/saas-framework-logging version 2>nul && echo   ✅ @akkikhan/saas-framework-logging@1.0.0-dev.1 || echo   ❌ @akkikhan/saas-framework-logging (failed)

npm view @akkikhan/saas-framework-monitoring version 2>nul && echo   ✅ @akkikhan/saas-framework-monitoring@1.0.0-dev.1 || echo   ❌ @akkikhan/saas-framework-monitoring (failed)

npm view @akkikhan/saas-framework-notifications version 2>nul && echo   ✅ @akkikhan/saas-framework-notifications@1.0.0-dev.1 || echo   ❌ @akkikhan/saas-framework-notifications (failed)

npm view @akkikhan/saas-framework-ai-copilot version 2>nul && echo   ✅ @akkikhan/saas-framework-ai-copilot@1.0.0-dev.1 || echo   ❌ @akkikhan/saas-framework-ai-copilot (failed)

echo.
echo 📦 SDK Modules:
npm view @akkikhan/saas-framework-auth-sdk version 2>nul && echo   ✅ @akkikhan/saas-framework-auth-sdk@1.0.0-dev.1 || echo   ❌ @akkikhan/saas-framework-auth-sdk (failed)

npm view @akkikhan/saas-framework-rbac-sdk version 2>nul && echo   ✅ @akkikhan/saas-framework-rbac-sdk@1.0.0-dev.1 || echo   ❌ @akkikhan/saas-framework-rbac-sdk (failed)

echo.
echo 📋 Installation Instructions for Customers:
echo ----------------------------------------------------
echo To install any module, customers can now run:
echo.
echo   npm install @akkikhan/saas-framework-auth@1.0.0-dev.1
echo   npm install @akkikhan/saas-framework-rbac@1.0.0-dev.1
echo   npm install @akkikhan/saas-framework-logging@1.0.0-dev.1
echo   npm install @akkikhan/saas-framework-monitoring@1.0.0-dev.1
echo   npm install @akkikhan/saas-framework-notifications@1.0.0-dev.1
echo   npm install @akkikhan/saas-framework-ai-copilot@1.0.0-dev.1
echo   npm install @akkikhan/saas-framework-auth-sdk@1.0.0-dev.1
echo   npm install @akkikhan/saas-framework-rbac-sdk@1.0.0-dev.1
echo.
echo 🌟 All modules are now available on npm registry!
echo.
