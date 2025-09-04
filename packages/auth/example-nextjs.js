// Next.js Full-Stack Integration Example

/*
 * This file contains multiple example components and API routes for Next.js integration.
 * Each section is commented and can be copied to appropriate files in your Next.js project.
 */

/* ==== API ROUTES ==== */

// File: pages/api/auth/login.js
/*
import { SaaSAuth } from '@saas-framework/auth';

const auth = new SaaSAuth({
  apiKey: process.env.SAAS_AUTH_API_KEY,
  baseUrl: process.env.SAAS_AUTH_BASE_URL
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;
    const session = await auth.login(email, password);
    
    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', [
      `token=${session.token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict`,
      `user=${JSON.stringify(session.user)}; Path=/; Max-Age=3600; SameSite=Strict`
    ]);
    
    res.json({
      success: true,
      user: session.user
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
}
*/

// File: pages/api/auth/logout.js
/*
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Clear cookies
  res.setHeader('Set-Cookie', [
    'token=; HttpOnly; Path=/; Max-Age=0',
    'user=; Path=/; Max-Age=0'
  ]);
  
  res.json({ success: true });
}
*/

/* ==== MIDDLEWARE ==== */

// File: middleware.js (Next.js 12+ middleware)
/*
import { NextResponse } from 'next/server';
import { SaaSAuth } from '@saas-framework/auth';

const auth = new SaaSAuth({
  apiKey: process.env.SAAS_AUTH_API_KEY,
  baseUrl: process.env.SAAS_AUTH_BASE_URL
});

export async function middleware(request) {
  // Protect routes that start with /dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try {
      const isValid = await auth.verifyToken(token);
      if (!isValid) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*'
};
*/

/* ==== HOOKS AND CONTEXT ==== */

// File: hooks/useAuth.js
/*
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on page load
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user='));
    
    if (userCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse user cookie:', error);
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (data.success) {
      setUser(data.user);
      router.push('/dashboard');
    } else {
      throw new Error(data.message);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
*/

/* ==== PAGE COMPONENTS ==== */

// File: pages/login.js
/*
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
*/

// File: pages/dashboard.js
/*
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
*/
