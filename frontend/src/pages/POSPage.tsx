import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db, type LocalProduct } from "../db/schema";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { useAppStore }  from "../store/appStore";
import { syncProducts, startSyncEngine } from "../services/syncEngine";
import { startNetworkMonitor } from "../services/networkMonitor";
import NavBar         from "../components/NavBar";
import ReceiptModal   from "../components/ReceiptModal";
import { v4 as uuidv4 } from "uuid";

type PayMethod = "cash" | "card" | "mobile" | "mixed";

export default function POSPage() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const { addItem, removeItem, updateQuantity, clearCart, items, subtotal, total } = useCartStore();
  const pendingCount = useAppStore(s => s.pendingCount);

  const [products,   setProducts]   = useState<LocalProduct[]>([]);
  const [search,     setSearch]     = useState("");
  const [payMethod,  setPayMethod]  = useState<PayMethod>("cash");
  const [receipt,    setReceipt]    = useState<null | { items: typeof items; total: number; subtotal: number; discountTotal: number; paymentMethod: string }>(null);
  const [checkoutMsg, setCheckoutMsg] = useState("");

  useEffect(() => {
    startNetworkMonitor();
    startSyncEngine();
  }, []);

  const loadProducts = useCallback(async () => {
    const all = await db.products.where("isActive").equals(1 as unknown as boolean).toArray();
    setProducts(all);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCheckout() {
    if (items.length === 0) return;
    const sub = subtotal();
    const tot = total();
    const discountTotal = items.reduce((s, i) => s + i.discountAmount, 0);

    const sale = {
      id:            uuidv4(),
      storeId:       useAuthStore.getState().store!.id,
      cashierId:     user!.id,
      items:         items.map(i => ({
        productId: i.productId, productName: i.productName, productSku: i.productSku,
        unitPrice: i.unitPrice, quantity: i.quantity, discountAmount: i.discountAmount, lineTotal: i.lineTotal,
      })),
      subtotal:      sub,
      discountTotal,
      totalAmount:   tot,
      paymentMethod: payMethod,
      createdAt:     new Date().toISOString(),
      synced:        false,
      syncAttempts:  0,
    };

    await db.pendingSales.add(sale);

    setReceipt({ items: [...items], total: tot, subtotal: sub, discountTotal, paymentMethod: payMethod });
    clearCart();
    setCheckoutMsg("");

    // Try immediate sync
    const { syncPendingSales } = await import("../services/syncEngine");
    syncPendingSales();
  }

  const discountTotal = items.reduce((s, i) => s + i.discountAmount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <NavBar />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Product search */}
        <div style={{ flex: 1, padding: 16, overflowY: "auto", borderRight: "1px solid #e5e7eb" }}>
          <input
            placeholder="Search by name or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => addItem({ productId: p.id, productName: p.name, productSku: p.sku, unitPrice: p.price, quantity: 1 })}
                style={{
                  background: p.stockQuantity === 0 ? "#f3f4f6" : "#fff",
                  border: "1px solid #e5e7eb", borderRadius: 8, padding: 12,
                  textAlign: "left", cursor: p.stockQuantity === 0 ? "not-allowed" : "pointer",
                  opacity: p.stockQuantity === 0 ? 0.6 : 1,
                }}
                disabled={p.stockQuantity === 0}
              >
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{p.sku}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#2196f3", marginTop: 6 }}>
                  {parseFloat(String(p.price)).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: p.stockQuantity <= p.lowStockThreshold ? "#ef4444" : "#6b7280", marginTop: 2 }}>
                  Stock: {p.stockQuantity}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-gray text-sm" style={{ gridColumn: "1/-1", padding: 20, textAlign: "center" }}>
                No products found
              </p>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div style={{ width: 340, display: "flex", flexDirection: "column", background: "#fff" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", fontWeight: 700 }}>
            Cart ({items.length} items)
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
            {items.length === 0 ? (
              <p className="text-gray text-sm text-center" style={{ marginTop: 40 }}>Cart is empty</p>
            ) : items.map(item => (
              <div key={item.productId} style={{ borderBottom: "1px solid #f3f4f6", padding: "10px 0" }}>
                <div className="flex justify-between">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.productName}</span>
                  <button onClick={() => removeItem(item.productId)} style={{ background: "none", color: "#ef4444", padding: 0, fontSize: 16 }}>×</button>
                </div>
                <div className="flex items-center mt-2" style={{ gap: 8 }}>
                  <button className="btn-secondary btn-sm" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>−</button>
                  <span style={{ minWidth: 28, textAlign: "center" }}>{item.quantity}</span>
                  <button className="btn-secondary btn-sm" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                  <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: 14 }}>
                    {item.lineTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 16, borderTop: "1px solid #e5e7eb" }}>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span><span>{subtotal().toLocaleString()}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-sm text-red mt-1">
                <span>Discount</span><span>-{discountTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold mt-2" style={{ fontSize: 18 }}>
              <span>TOTAL</span><span>{total().toLocaleString()}</span>
            </div>

            <div className="flex mt-3" style={{ gap: 6 }}>
              {(["cash","card","mobile"] as PayMethod[]).map(m => (
                <button key={m} onClick={() => setPayMethod(m)}
                  style={{ flex: 1, background: payMethod === m ? "#2196f3" : "#e5e7eb", color: payMethod === m ? "#fff" : "#374151", borderRadius: 6, padding: "6px 0", fontSize: 12, fontWeight: 600 }}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {checkoutMsg && <p className="error-msg mt-2">{checkoutMsg}</p>}

            <button
              className="btn-success btn-full mt-3"
              disabled={items.length === 0}
              onClick={handleCheckout}
              style={{ fontSize: 16, padding: "12px 0" }}
            >
              Checkout
            </button>

            {items.length > 0 && (
              <button className="btn-secondary btn-full mt-2 btn-sm" onClick={clearCart}>Clear Cart</button>
            )}
          </div>
        </div>
      </div>

      {receipt && (
        <ReceiptModal
          items={receipt.items}
          total={receipt.total}
          subtotal={receipt.subtotal}
          discountTotal={receipt.discountTotal}
          paymentMethod={receipt.paymentMethod}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
