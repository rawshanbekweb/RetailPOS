import { create } from "zustand";

export interface CartItem {
  productId:      string;
  productName:    string;
  productSku:     string;
  unitPrice:      number;
  quantity:       number;
  discountAmount: number;
  lineTotal:      number;
}

interface CartState {
  items:         CartItem[];
  discountTotal: number;
  addItem:        (item: Omit<CartItem, "lineTotal" | "discountAmount">) => void;
  removeItem:     (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  setDiscount:    (productId: string, amount: number) => void;
  clearCart:      () => void;
  subtotal:       () => number;
  total:          () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discountTotal: 0,

  addItem: (item) => {
    const existing = get().items.find(i => i.productId === item.productId);
    if (existing) {
      set(s => ({
        items: s.items.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * i.unitPrice - i.discountAmount }
            : i
        )
      }));
    } else {
      set(s => ({
        items: [...s.items, {
          ...item,
          discountAmount: 0,
          lineTotal: item.unitPrice,
        }]
      }));
    }
  },

  removeItem: (productId) =>
    set(s => ({ items: s.items.filter(i => i.productId !== productId) })),

  updateQuantity: (productId, qty) => {
    if (qty <= 0) { get().removeItem(productId); return; }
    set(s => ({
      items: s.items.map(i =>
        i.productId === productId
          ? { ...i, quantity: qty, lineTotal: qty * i.unitPrice - i.discountAmount }
          : i
      )
    }));
  },

  setDiscount: (productId, amount) =>
    set(s => ({
      items: s.items.map(i =>
        i.productId === productId
          ? { ...i, discountAmount: amount, lineTotal: i.quantity * i.unitPrice - amount }
          : i
      )
    })),

  clearCart: () => set({ items: [], discountTotal: 0 }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
  total:    () => get().items.reduce((sum, i) => sum + i.lineTotal, 0),
}));
