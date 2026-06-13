import { db } from "../db/schema";
import { salesApi, productsApi } from "./api";
import { useAppStore } from "../store/appStore";
import { useAuthStore } from "../store/authStore";

let syncTimer: ReturnType<typeof setInterval> | null = null;

export async function syncProducts() {
  const storeId = useAuthStore.getState().store?.id;
  if (!storeId) return;

  try {
    const { products, synced_at } = await productsApi.list();
    await db.products.bulkPut(
      products.map(p => ({
        id:                p.id,
        storeId:           p.store_id,
        sku:               p.sku,
        name:              p.name,
        price:             parseFloat(p.price),
        stockQuantity:     p.stock_quantity,
        lowStockThreshold: p.low_stock_threshold,
        isActive:          p.is_active,
        updatedAt:         p.updated_at,
      }))
    );
    localStorage.setItem("products_synced_at", synced_at);
  } catch {
    // Offline — keep using cached data
  }
}

export async function syncPendingSales() {
  const { setOnline, setSyncing, setPendingCount } = useAppStore.getState();

  const pending = await db.pendingSales
    .where("synced").equals(0 as unknown as boolean)
    .toArray();

  setPendingCount(pending.length);
  if (pending.length === 0) return;

  setSyncing(true);
  try {
    const payload = pending.slice(0, 20).map(s => ({
      sale_id:           s.id,
      cashier_id:        s.cashierId,
      items:             s.items.map(i => ({
        product_id:      i.productId,
        product_name:    i.productName,
        product_sku:     i.productSku,
        unit_price:      i.unitPrice,
        quantity:        i.quantity,
        discount_amount: i.discountAmount,
        line_total:      i.lineTotal,
      })),
      subtotal:          s.subtotal,
      discount_total:    s.discountTotal,
      total_amount:      s.totalAmount,
      payment_method:    s.paymentMethod,
      client_created_at: s.createdAt,
    }));

    const { results } = await salesApi.batch(payload);

    for (const r of results) {
      if (r.status === "accepted" || r.status === "already_processed") {
        await db.pendingSales.update(r.sale_id, { synced: true });
      } else {
        const sale = pending.find(s => s.id === r.sale_id);
        if (sale) {
          await db.pendingSales.update(r.sale_id, {
            syncAttempts: (sale.syncAttempts ?? 0) + 1,
            syncError:    r.error,
          });
        }
      }
    }

    setOnline(true);
  } catch {
    setOnline(false);
  } finally {
    setSyncing(false);
    const remaining = await db.pendingSales.where("synced").equals(0 as unknown as boolean).count();
    setPendingCount(remaining);
  }
}

export function startSyncEngine() {
  syncProducts();
  syncPendingSales();

  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    if (useAppStore.getState().isOnline) {
      syncPendingSales();
      syncProducts();
    }
  }, 30_000);
}
