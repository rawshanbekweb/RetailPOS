import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useAppStore }  from "../store/appStore";

export default function NavBar() {
  const navigate = useNavigate();
  const { user, store, logout } = useAuthStore();
  const { isOnline, isSyncing, pendingCount } = useAppStore();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav style={{
      background: "#1e293b", color: "#fff", padding: "0 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 52, position: "sticky", top: 0, zIndex: 100,
    }}>
      <div className="flex items-center gap-2" style={{ gap: 16 }}>
        <strong style={{ fontSize: 16 }}>🛒 {store?.name ?? "RetailPOS"}</strong>
        {user && (user.role === "owner" || user.role === "manager") && (
          <>
            <Link to="/pos"   style={{ color: "#94a3b8", fontSize: 14 }}>POS</Link>
            <Link to="/admin" style={{ color: "#94a3b8", fontSize: 14 }}>Admin</Link>
          </>
        )}
      </div>

      <div className="flex items-center" style={{ gap: 12 }}>
        {pendingCount > 0 && (
          <span className="badge badge-yellow">{pendingCount} pending</span>
        )}
        {isSyncing && <span style={{ fontSize: 12, color: "#94a3b8" }}>⟳ Syncing…</span>}
        <span className={`badge ${isOnline ? "badge-green" : "badge-red"}`}>
          {isOnline ? "Online" : "Offline"}
        </span>
        <span style={{ fontSize: 13, color: "#cbd5e1" }}>{user?.email}</span>
        <button onClick={handleLogout} className="btn-secondary btn-sm" style={{ background: "#334155", color: "#e2e8f0" }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
