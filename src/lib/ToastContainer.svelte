<script lang="ts">
  import { toastStore, type Toast } from './toast';
  import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-svelte';

  const icons: Record<Toast['type'], any> = {
    success: CheckCircle2,
    error: AlertTriangle,
    warning: AlertCircle,
    info: Info
  };
</script>

<div class="toast-container" aria-live="polite">
  {#each $toastStore as toast (toast.id)}
    <div class="toast toast-{toast.type}">
      <svelte:component this={icons[toast.type]} size={14} />
      <span class="toast-msg">{toast.message}</span>
      <button class="toast-dismiss" on:click={() => toastStore.remove(toast.id)}>
        <X size={12} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 9999;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background-color: var(--bg-panel);
    backdrop-filter: blur(12px);
    font-size: 0.82rem;
    font-weight: 700;
    font-family: var(--font-family);
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    pointer-events: all;
    min-width: 220px;
    max-width: 360px;
    animation: toast-in 0.2s ease;
  }

  @keyframes toast-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .toast-success { border-color: var(--accent-tertiary);   color: var(--accent-tertiary); }
  .toast-error   { border-color: var(--accent-secondary);  color: var(--accent-secondary); }
  .toast-warning { border-color: var(--accent-quaternary); color: var(--accent-quaternary); }
  .toast-info    { border-color: var(--accent);            color: var(--accent); }

  .toast-msg { flex-grow: 1; }

  .toast-dismiss {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: inherit;
    opacity: 0.6;
    min-width: unset;
    border-radius: 4px;
    line-height: 1;
  }
  .toast-dismiss:hover { opacity: 1; background: none; }
</style>
