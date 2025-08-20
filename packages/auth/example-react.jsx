// React Frontend Integration Example
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export function AuthProvider({ children, config }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Initialize auth client
  const authClient = {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    
    async login(email, password) {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({ email, password, apiKey: this.apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      return response.json();
    },

    async verifyToken(token) {
      const response = await fetch(`${this.baseUrl}/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': this.apiKey,
        },
      });

      return response.ok;
    },

    async getCurrentUser(token) {
      const response = await fetch(`${this.baseUrl}/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) throw new Error('Invalid token');
      
      const result = await response.json();
      return result.user;
    },

    async logout(token) {
      await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': this.apiKey,
        },
      });
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const session = await authClient.login(email, password);
      
      setToken(session.token);
      setUser(session.user);
      localStorage.setItem('token', session.token);
      
      return session;
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await authClient.logout(token);
      }
      
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Verify token on mount
  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const isValid = await authClient.verifyToken(token);
        
        if (isValid) {
          const userData = await authClient.getCurrentUser(token);
          setUser(userData);
        } else {
          // Token is invalid
          setToken(null);
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        setToken(null);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, [token]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected Route Component
export function ProtectedRoute({ children, fallback }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return fallback || <div>Please log in to access this page.</div>;
  }

  return children;
}

// Login Form Component
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

// User Profile Component
export function UserProfile() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h2>Welcome, {user.email}!</h2>
      <p>User ID: {user.id}</p>
      <p>Tenant: {user.tenantId}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// App Component Example
export function App() {
  const authConfig = {
    apiKey: 'auth_your-tenant-key',
    baseUrl: 'https://your-saas-platform.com/api/v2/auth'
  };

  return (
    <AuthProvider config={authConfig}>
      <div className="app">
        <ProtectedRoute fallback={<LoginForm />}>
          <UserProfile />
        </ProtectedRoute>
      </div>
    </AuthProvider>
  );
}