import { useAppStore } from "../store/appStore";

async function probe(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/health", { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export function startNetworkMonitor() {
  const { setOnline } = useAppStore.getState();

  window.addEventListener("online",  () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));

  setInterval(async () => {
    const online = await probe();
    useAppStore.getState().setOnline(online);
  }, 15_000);
}
