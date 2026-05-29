import { writable } from 'svelte/store';

// Global state for Obsidian Notes Explorer to persist across tab switches
export const vaultHandle = writable<any>(null);
export const isFallbackModeStore = writable<boolean>(false);
export const fallbackFilesStore = writable<any[]>([]);
export const vaultFilesListStore = writable<any[]>([]);
