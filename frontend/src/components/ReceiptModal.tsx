import { useAuthStore } from "../store/authStore";
import type { CartItem } from "../store/cartStore";

interface Props {
  items:         CartItem[];
  total:         number;
  subtotal:      number;
  discountTotal: number;
  paymentMethod: string;
  onClose:       () => void;
}

export default function ReceiptModal({ items, total, subtotal, discountTotal, paymentMethod, onClose }: Props) {
  const store = useAuthStore(s => s.store);
  const now   = new Date().toLocaleString();
  const cur   = store?.currency ?? "UZS";
  const fmt   = (n: number) => `${cur} ${n.toLocaleString()}`;

  function handlePrint() { window.print(); }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="text-center mb-4">
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>{store?.name ?? "RetailPOS"}</h3>
          <p className="text-sm text-gray">{now}</p>
        </div>

        <hr style={{ margin: "12px 0", borderColor: "#e5e7eb" }} />

        {items.map(item => (
          <div key={item.productId} className="flex justify-between mt-2">
            <span className="text-sm">{item.productName} × {item.quantity}</span>
            <span className="text-sm font-bold">{fmt(item.lineTotal)}</span>
          </div>
        ))}

        <hr style={{ margin: "12px 0", borderColor: "#e5e7eb" }} />

        <div className="flex justify-between text-sm">
          <span>Subtotal</span><span>{fmt(subtotal)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between text-sm text-red">
            <span>Discount</span><span>-{fmt(discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold mt-2" style={{ fontSize: 17 }}>
          <span>TOTAL</span><span>{fmt(total)}</span>
        </div>
        <p className="text-sm text-gray mt-2">Payment: {paymentMethod.toUpperCase()}</p>

        <hr style={{ margin: "16px 0", borderColor: "#e5e7eb" }} />
        <p className="text-center text-sm text-gray">Thank you for your purchase!</p>

        <div className="flex mt-4" style={{ gap: 10 }}>
          <button className="btn-secondary btn-full" onClick={handlePrint}>Print</button>
          <button className="btn-primary   btn-full" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
