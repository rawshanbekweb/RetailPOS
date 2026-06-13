import Dexie, { type Table } from "dexie";

export interface LocalProduct {
  id:                  string;
  storeId:             string;
  sku:                 string;
  name:                string;
  price:               number;
  stockQuantity:       number;
  lowStockThreshold:   number;
  isActive:            boolean;
  updatedAt:           string;
}

export interface PendingSale {
  id:              string;
  storeId:         string;
  cashierId:       string;
  items:           PendingSaleItem[];
  subtotal:        number;
  discountTotal:   number;
  totalAmount:     number;
  paymentMethod:   "cash" | "card" | "mobile" | "mixed";
  createdAt:       string;
  synced:          boolean;
  syncAttempts:    number;
  syncError?:      string;
}

export interface PendingSaleItem {
  productId:      string;
  productName:    string;
  productSku:     string;
  unitPrice:      number;
  quantity:       number;
  discountAmount: number;
  lineTotal:      number;
}

export class RetailPOSDB extends Dexie {
  products!:     Table<LocalProduct,  string>;
  pendingSales!: Table<PendingSale,   string>;

  constructor() {
    super("RetailPOS");
    this.version(1).stores({
      products:     "id, storeId, sku, name, isActive",
      pendingSales: "id, storeId, synced, createdAt",
    });
  }
}

export const db = new RetailPOSDB();
