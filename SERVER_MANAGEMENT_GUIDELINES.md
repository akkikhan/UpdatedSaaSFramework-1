# Server Management Guidelines

## 🚨 CRITICAL RULE: Minimize Server Restarts

### **NEVER restart server unless absolutely necessary**

**✅ WHEN TO RESTART:**

- Syntax errors in code that prevent compilation
- Environment variable changes (like PORT, DATABASE_URL)
- Package.json dependency changes requiring npm install
- Server crash/exit with no recovery possible

**❌ WHEN NOT TO RESTART:**

- Adding console.log() statements (hot reload handles this)
- Route modifications (express picks up changes automatically)
- Minor code fixes and debugging additions
- Function logic changes within existing files

### **CHECK FIRST - RESTART LAST**

**Before killing any process:**

1. Check if changes are reflected with hot reload
2. Test endpoints to see if modifications work
3. Look for compilation errors in existing terminal
4. Only restart if hot reload fails or server crashed

**Process Management Best Practices:**

```bash
# ✅ GOOD: Check existing processes first
Get-Process -Name "node" | Select-Object Id,Name,CPU

# ✅ GOOD: Check if server responds before killing
curl -X GET "http://localhost:3001/health" -v

# ❌ BAD: Immediately killing without checking
Stop-Process -Name "node" -Force

# ❌ BAD: Starting new server when one exists
npm run dev  # when server already running
```

### **Hot Reload Workflow**

1. Make code changes in editor
2. Save file (Ctrl+S)
3. Wait 2-3 seconds for hot reload
4. Test endpoint/functionality
5. If working - continue development
6. If not working - check terminal for errors
7. Only restart if terminal shows critical errors

### **Port Management**

- **Single Port Policy**: One service per port (3001 for main server)
- **Check Before Start**: Always verify port is free or server exists
- **Reuse Existing**: Connect to running server instead of creating new one
- **Clean Shutdown**: Use Ctrl+C instead of force kill when possible

### **Development Efficiency**

- **Save Time**: Hot reload typically 2-3 seconds vs restart 15-30 seconds
- **Preserve State**: Keep database connections, session state intact
- **Faster Debugging**: Immediate feedback on code changes
- **Less Resource Usage**: Avoid unnecessary CPU/memory allocation

### **Emergency Restart Checklist**

Before restarting, verify:

- [ ] Hot reload not working for this change type
- [ ] Terminal shows compilation/syntax errors
- [ ] Server not responding to health checks
- [ ] Environment changes require restart
- [ ] No other active development sessions affected

**Remember**: A running server is a productive server. Keep it running!
