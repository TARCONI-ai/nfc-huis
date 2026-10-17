import { useCallback, useEffect, useRef, useState } from 'react';
import type { InventoryApi, InventoryError } from '../services/inventory';
import { freezerApi } from '../services/freezer';
import { pantryApi } from '../services/pantry';
import type { FreezerItem, FreezerItemDraft, FreezerLocation } from '../types/freezer';
import type { PantryItem, PantryItemDraft, PantryLocation } from '../types/pantry';

/** Al volver a la pestaña sólo refrescamos si los datos ya están algo viejos. */
const STALE_AFTER_MS = 30_000;

interface BaseItem {
  id: string;
  name: string;
  quantity: number;
}

export interface InventoryState<TLocation, TItem, TDraft> {
  locations: TLocation[];
  items: TItem[];
  loading: boolean;
  /** Error de la carga inicial: la pantalla no puede mostrar nada. */
  loadError: InventoryError | null;
  /** Error de una mutación: los datos siguen en pantalla. */
  actionError: InventoryError | null;
  busyIds: ReadonlySet<string>;
  reload: () => Promise<void>;
  dismissActionError: () => void;
  changeQuantity: (item: TItem, delta: number) => Promise<void>;
  /** Devuelven `false` si no se pudo guardar, para que el formulario siga abierto. */
  addItem: (draft: TDraft) => Promise<boolean>;
  editItem: (id: string, patch: Partial<TDraft>) => Promise<boolean>;
  removeItem: (id: string) => Promise<boolean>;
}

const byName = <T extends BaseItem>(a: T, b: T) => a.name.localeCompare(b.name, 'nl');

function useInventory<TLocation, TItem extends BaseItem, TDraft>(
  api: InventoryApi<TLocation, TItem, TDraft>,
): InventoryState<TLocation, TItem, TDraft> {
  const [locations, setLocations] = useState<TLocation[]>([]);
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<InventoryError | null>(null);
  const [actionError, setActionError] = useState<InventoryError | null>(null);
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
      if (!hasData.current) setLoadError(error as InventoryError);
      else setActionError(error as InventoryError);
    } finally {
      setLoading(false);
    }
  }, [api]);

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
      return true;
    } catch (error) {
      setActionError(error as InventoryError);
      await reload(); // volvemos al estado real del servidor
      return false;
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, [reload]);

  const changeQuantity = useCallback(
    async (item: TItem, delta: number) => {
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
    [api, withBusy],
  );

  const addItem = useCallback(
    async (draft: TDraft) =>
      withBusy('new', async () => {
        const saved = await api.createItem(draft);
        setItems((current) => [...current, saved].sort(byName));
        loadedAt.current = Date.now();
      }),
    [api, withBusy],
  );

  const editItem = useCallback(
    async (id: string, patch: Partial<TDraft>) =>
      withBusy(id, async () => {
        const saved = await api.updateItem(id, patch);
        setItems((current) =>
          current.map((it) => (it.id === saved.id ? saved : it)).sort(byName),
        );
        loadedAt.current = Date.now();
      }),
    [api, withBusy],
  );

  const removeItem = useCallback(
    async (id: string) =>
      withBusy(id, async () => {
        await api.deleteItem(id);
        setItems((current) => current.filter((it) => it.id !== id));
        loadedAt.current = Date.now();
      }),
    [api, withBusy],
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

export type FreezerState = InventoryState<FreezerLocation, FreezerItem, FreezerItemDraft>;
export type PantryState = InventoryState<PantryLocation, PantryItem, PantryItemDraft>;

export function useFreezer(): FreezerState {
  return useInventory(freezerApi);
}

export function usePantry(): PantryState {
  return useInventory(pantryApi);
}
