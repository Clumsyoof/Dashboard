<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Palette } from 'lucide-svelte';
  import type { Theme } from '../types';

  export let activeTheme: Theme = 'tokyonight';

  const dispatch = createEventDispatcher<{
    change: Theme;
  }>();

  const themes: { id: Theme; name: string; color: string }[] = [
    { id: 'rosepine', name: 'Rōse Pine Retro', color: '#ebbcba' },
    { id: 'rosepinemoon', name: 'Rōse Pine Moon', color: '#ea9a97' },
    { id: 'rosepinedawn', name: 'Rōse Pine Dawn', color: '#d7827e' },
    { id: 'mocha', name: 'Catppuccin Mocha', color: '#cba6f7' },
    { id: 'macchiato', name: 'Catppuccin Macchiato', color: '#f5bde6' },
    { id: 'frappe', name: 'Catppuccin Frappé', color: '#f2d5cf' },
    { id: 'latte', name: 'Catppuccin Latte', color: '#8839ef' },
    { id: 'gruvboxsoft', name: 'Gruvbox Soft Retro', color: '#d8a657' },
    { id: 'gruvbox', name: 'Gruvbox Contrast', color: '#fabd2f' },
    { id: 'kanagawa', name: 'Kanagawa Dragon', color: '#e6c384' },
    { id: 'everforestsoft', name: 'Everforest Dark Soft', color: '#dbbc7f' },
    { id: 'everforest', name: 'Everforest Glade', color: '#a7c080' },
    { id: 'nordsoft', name: 'Nord Soft Cozy', color: '#88c0d0' },
    { id: 'nord', name: 'Nordic Ice', color: '#81a1c1' },
    { id: 'dracula', name: 'Dracula Cyber Dark', color: '#bd93f9' },
    { id: 'onedark', name: 'One Dark Pro', color: '#61afef' },
    { id: 'aura', name: 'Aura Minimal Space', color: '#a277ff' },
    { id: 'solarizeddark', name: 'Solarized Dark Retro', color: '#2aa198' },
    { id: 'tokyonight', name: 'Tokyo Night Deep', color: '#7dcfff' },
    { id: 'tokyonightstorm', name: 'Tokyo Night Storm', color: '#bb9af3' }
  ];

  function handleChange(event: Event) {
    const selected = (event.target as HTMLSelectElement).value as Theme;
    dispatch('change', selected);
  }

  $: activeThemeColor = themes.find(t => t.id === activeTheme)?.color || '#7dcfff';
</script>

<div class="material-theme-selector">
  <Palette size={14} class="theme-icon" style="color: {activeThemeColor}" />
  <label for="theme-drop">Palette:</label>
  <div class="dropdown-wrapper">
    <span class="theme-dot" style="background-color: {activeThemeColor}"></span>
    <select id="theme-drop" value={activeTheme} on:change={handleChange}>
      {#each themes as t}
        <option value={t.id}>{t.name}</option>
      {/each}
    </select>
  </div>
</div>

<style>
  .material-theme-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: var(--bg-panel);
    border: 1px solid var(--border);
    padding: 6px 14px;
    border-radius: 20px; /* MD3 rounded chips */
    font-size: 0.75rem;
    font-weight: bold;
    box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.05);
  }

  .theme-icon {
    transition: color 0.3s ease;
  }

  .material-theme-selector label {
    color: var(--text-muted);
  }

  .dropdown-wrapper {
    display: flex;
    align-items: center;
    position: relative;
    gap: 6px;
  }

  .theme-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
    transition: background-color 0.3s ease;
  }

  select {
    background: none !important;
    border: none !important;
    color: var(--text) !important;
    font-family: var(--font-family) !important;
    font-size: 0.75rem !important;
    font-weight: bold !important;
    cursor: pointer;
    padding: 0 16px 0 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }

  select:focus {
    outline: none !important;
  }

  /* Custom dropdown arrow */
  .dropdown-wrapper::after {
    content: "▼";
    font-size: 0.5rem;
    color: var(--text-muted);
    position: absolute;
    right: 0;
    pointer-events: none;
  }
</style>
