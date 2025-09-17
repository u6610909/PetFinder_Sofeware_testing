import { useEffect, useState } from "react";

export function uid(prefix = "ID") {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return (prefix + ts + rnd).toUpperCase();
}

export function fileToDataURL(file) {
  return new Promise((res, rej) => {
    if (!file) return res(null);
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function useLocalStore(key, seed) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(items)); } catch {}
  }, [key, items]);
  return [items, setItems];
}