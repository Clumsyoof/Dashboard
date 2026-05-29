import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function add(message: string, type: Toast['type'] = 'info', duration = 3000) {
    const id = crypto.randomUUID();
    update(t => [...t, { id, message, type, duration }]);
    setTimeout(() => remove(id), duration);
  }

  function remove(id: string) {
    update(t => t.filter(toast => toast.id !== id));
  }

  return { subscribe, add, remove };
}

export const toastStore = createToastStore();
