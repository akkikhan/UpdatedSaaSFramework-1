import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function PlatformAdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("platformAdminToken");
      if (token) {
        try {
          const response = await fetch("/api/platform/auth/verify", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            setLocation("/");
          } else {
            localStorage.removeItem("platformAdminToken");
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("platformAdminToken");
        }
      }
    };

    checkAuth();

    // Handle URL parameters (Azure AD callback)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const errorParam = urlParams.get("error");

    if (token) {
      localStorage.setItem("platformAdminToken", token);
      setSuccess("Login successful! Redirecting...");
      setTimeout(() => {
        setLocation("/");
      }, 1000);
    } else if (errorParam) {
      setError(
        errorParam === "unauthorized_email"
          ? "Your email is not authorized for platform administration"
          : `Login failed: ${errorParam.replace(/_/g, " ")}`
      );
    }
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/platform/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("platformAdminToken", data.token);
        setSuccess("Login successful! Redirecting...");

        setTimeout(() => {
          setLocation("/");
        }, 1000);
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-10 w-full max-w-md">
        {/* Clean top accent */}
        <div className="h-1 bg-blue-600 rounded-full mb-8"></div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900">Platform Administration</h1>
            <p className="text-gray-600">Sign in to manage your organization</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        {/* Microsoft Azure AD Login Button */}
        <a
          href="/api/platform/auth/azure/login"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 23 23" fill="currentColor">
            <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z" />
          </svg>
          <span>Continue with Microsoft</span>
        </a>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">or use administrator credentials</span>
          </div>
        </div>

        {/* Admin Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="group">
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-blue-600"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                required
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all duration-200 bg-gray-50/50 focus:bg-white hover:border-gray-400"
              />
            </div>
          </div>

          <div className="group">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-blue-600"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all duration-200 bg-gray-50/50 focus:bg-white hover:border-gray-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group w-full bg-gradient-to-r from-slate-800 via-gray-800 to-slate-900 hover:from-slate-900 hover:via-gray-900 hover:to-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-500/25 disabled:transform-none relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            {loading ? (
              <div className="flex items-center justify-center gap-3 relative z-10">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Authenticating...</span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce [animation-delay:300ms]"></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 relative z-10">
                <span>Sign In to Platform</span>
                <svg
                  className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        </form>

        <div className="text-center mt-10 space-y-4">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-medium">Secure</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="font-medium">Enterprise</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span className="font-medium">Multi-Tenant</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Platform Administration Portal • v2.0
          </div>
        </div>
      </div>
    </div>
  );
}
