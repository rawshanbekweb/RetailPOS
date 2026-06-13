import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const navigate  = useNavigate();
  const setAuth   = useAuthStore(s => s.setAuth);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setAuth(data.access_token, data.refresh_token, data.user as any, data.store as any);
      navigate(data.user.role === "cashier" ? "/pos" : "/admin");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="card" style={{ width: 360 }}>
        <h2 className="text-center" style={{ marginBottom: 24 }}>POS Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mt-3">
            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="mt-3">
            <input type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary btn-full mt-4" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-center text-sm text-gray mt-4">
          New here? <Link to="/register">Create a store</Link>
        </p>
      </div>
    </div>
  );
}
