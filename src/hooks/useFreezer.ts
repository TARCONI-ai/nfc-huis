import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../services/freezer';
import { FreezerError } from '../services/freezer';
import type { FreezerItem, FreezerItemDraft, FreezerLocation } from '../types/freezer';

/** Al volver a la pestaña sólo refrescamos si los datos ya están algo viejos. */
const STALE_AFTER_MS = 30_000;

export interface FreezerState {
  locations: FreezerLocation[];
  items: FreezerItem[];
  loading: boolean;
  /** Error de la carga inicial: la pantalla no puede mostrar nada. */
  loadError: FreezerError | null;
  /** Error de una mutación: los datos siguen en pantalla. */
  actionError: FreezerError | null;
  busyIds: ReadonlySet<string>;
  reload: () => Promise<void>;
  dismissActionError: () => void;
  changeQuantity: (item: FreezerItem, delta: number) => Promise<void>;
  addItem: (draft: FreezerItemDraft) => Promise<void>;
  editItem: (id: string, patch: Partial<FreezerItemDraft>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export function useFreezer(): FreezerState {
  const [locations, setLocations] = useState<FreezerLocation[]>([]);
  const [items, setItems] = useState<FreezerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<FreezerError | null>(null);
  const [actionError, setActionError] = useState<FreezerError | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

  const loadedAt = useRef(0);
  const hasData = useRef(false);

  const reload = useCallback(async () => {
    try {
      const [nextLocations, nextItems] = await Promise.all([
        api.fetchLocations(),
        api.fetchItems(),
      ]);
      setLocations(nextLocations);
      setItems(nextItems);
      setLoadError(null);
      hasData.current = true;
      loadedAt.current = Date.now();
    } catch (error) {
      // Un fallo de red no debe vaciar un inventario ya visible.
      if (!hasData.current) setLoadError(error as FreezerError);
      else setActionError(error as FreezerError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Refresco al recuperar el foco, para ver los cambios hechos desde otro móvil.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - loadedAt.current < STALE_AFTER_MS) return;
      void reload();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [reload]);

  const withBusy = useCallback(async (id: string, action: () => Promise<void>) => {
    setBusyIds((current) => new Set(current).add(id));
    try {
      await action();
      setActionError(null);
    } catch (error) {
      setActionError(error as FreezerError);
      await reload(); // volvemos al estado real del servidor
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, [reload]);

  const changeQuantity = useCallback(
    async (item: FreezerItem, delta: number) => {
      const quantity = Math.max(0, item.quantity + delta);
      if (quantity === item.quantity) return;

      // Optimista: el botón responde al instante aunque la red tarde.
      setItems((current) =>
        current.map((it) => (it.id === item.id ? { ...it, quantity } : it)),
      );
      await withBusy(item.id, async () => {
        const saved = await api.setQuantity(item.id, quantity);
        setItems((current) => current.map((it) => (it.id === saved.id ? saved : it)));
        loadedAt.current = Date.now();
      });
    },
    [withBusy],
  );

  const addItem = useCallback(
    async (draft: FreezerItemDraft) => {
      await withBusy('new', async () => {
        const saved = await api.createItem(draft);
        setItems((current) =>
          [...current, saved].sort((a, b) => a.name.localeCompare(b.name, 'nl')),
        );
        loadedAt.current = Date.now();
      });
    },
    [withBusy],
  );

  const editItem = useCallback(
    async (id: string, patch: Partial<FreezerItemDraft>) => {
      await withBusy(id, async () => {
        const saved = await api.updateItem(id, patch);
        setItems((current) =>
          current
            .map((it) => (it.id === saved.id ? saved : it))
            .sort((a, b) => a.name.localeCompare(b.name, 'nl')),
        );
        loadedAt.current = Date.now();
      });
    },
    [withBusy],
  );

  const removeItem = useCallback(
    async (id: string) => {
      await withBusy(id, async () => {
        await api.deleteItem(id);
        setItems((current) => current.filter((it) => it.id !== id));
        loadedAt.current = Date.now();
      });
    },
    [withBusy],
  );

  return {
    locations,
    items,
    loading,
    loadError,
    actionError,
    busyIds,
    reload,
    dismissActionError: useCallback(() => setActionError(null), []),
    changeQuantity,
    addItem,
    editItem,
    removeItem,
  };
}
