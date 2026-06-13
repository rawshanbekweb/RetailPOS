import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import LoginPage    from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import POSPage      from "./pages/POSPage";
import AdminPage    from "./pages/AdminPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "cashier") return <Navigate to="/pos" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pos"      element={<PrivateRoute><POSPage /></PrivateRoute>} />
        <Route path="/admin"    element={<PrivateRoute><AdminRoute><AdminPage /></AdminRoute></PrivateRoute>} />
        <Route path="*"         element={<Navigate to="/pos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
