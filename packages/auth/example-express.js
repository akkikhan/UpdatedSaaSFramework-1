// Express.js Integration Example
const express = require('express');
const { SaaSAuth } = require('@saas-framework/auth');

const app = express();
app.use(express.json());

// Initialize the Auth SDK with your tenant's API key
const auth = new SaaSAuth({
  apiKey: 'auth_your-tenant-key-from-portal',
  baseUrl: 'https://your-saas-platform.com/api/v2/auth'
});

// Public route - login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const session = await auth.login(email, password);
    
    res.json({
      success: true,
      token: session.token,
      user: session.user,
      expiresAt: session.expiresAt
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// Protected routes - use auth middleware
app.use(auth.middleware());

app.get('/profile', async (req, res) => {
  // req.user is automatically populated by the middleware
  res.json({
    user: req.user,
    message: 'Access granted to protected resource'
  });
});

// Logout route
app.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (token) {
      await auth.logout(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Token refresh
app.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const newToken = await auth.refreshToken(refreshToken);
    
    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});