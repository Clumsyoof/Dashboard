<script lang="ts">
  import { 
    LayoutDashboard, 
    CalendarCheck, 
    Timer, 
    ListTodo, 
    FolderOpen,
    Terminal
  } from 'lucide-svelte';

  export let activeTab: 'dashboard' | 'attendance' | 'schedule' | 'tasks' | 'notes' = 'dashboard';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'schedule', label: 'Schedule', icon: Timer },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'notes', label: 'Notes', icon: FolderOpen },
  ] as const;

  function selectTab(id: typeof activeTab) {
    activeTab = id;
  }
</script>

<aside class="sidebar">
  <div class="brand">
    <Terminal size={18} class="brand-icon" />
    <span class="brand-text">Clumsy Dashboard</span>
  </div>

  <nav class="nav-menu">
    {#each menuItems as item}
      <button 
        class="nav-item {activeTab === item.id ? 'active' : ''}" 
        on:click={() => selectTab(item.id)}
      >
        <span class="active-indicator"></span>
        <svelte:component this={item.icon} size={16} class="nav-icon" />
        <span class="nav-label">{item.label}</span>
      </button>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <span class="status-indicator"></span>
    <span class="status-text">System: OK</span>
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 200px;
    background-color: var(--bg-panel);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    z-index: 100;
    padding: 16px 0;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 18px 24px;
    border-bottom: 1px double var(--border);
    margin-bottom: 16px;
  }

  :global(.brand-icon) {
    color: var(--accent);
  }

  .brand-text {
    font-weight: 900;
    font-size: 1rem;
    color: var(--text);
    letter-spacing: 0.1em;
  }

  .nav-menu {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-grow: 1;
  }

  .nav-item {
    background: none;
    border: none;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    width: 100%;
    text-align: left;
    position: relative;
    border-radius: 0;
    box-shadow: none !important;
    justify-content: flex-start;
  }

  .nav-item:hover {
    color: var(--accent);
    background-color: var(--focus);
    transform: none;
  }

  .nav-item.active {
    color: var(--accent);
    background-color: var(--bg);
    font-weight: 800;
  }

  .active-indicator {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: transparent;
  }

  .nav-item.active .active-indicator {
    background-color: var(--accent);
  }

  :global(.nav-icon) {
    color: inherit;
    transition: color 0.15s ease;
  }

  .nav-label {
    /* No uppercase styling */
  }

  .sidebar-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    font-size: 0.7rem;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    margin-top: auto;
  }

  .status-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--accent-tertiary);
    box-shadow: 0 0 4px var(--accent-tertiary);
  }

  .status-text {
    font-weight: bold;
    letter-spacing: 0.05em;
  }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      width: 100%;
      flex-direction: row;
      padding: 0;
      border-right: none;
      border-top: 1px solid var(--border);
      background-color: color-mix(in srgb, var(--bg-panel) 85%, transparent);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.15);
      z-index: 1000;
    }

    .brand {
      display: none;
    }

    .nav-menu {
      flex-direction: row;
      justify-content: space-around;
      align-items: center;
      width: 100%;
      height: 100%;
    }

    .nav-item {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px 0;
      height: 100%;
      width: 20%;
      text-align: center;
    }

    .nav-label {
      display: block !important;
      font-size: 0.62rem;
      font-weight: bold;
    }

    .active-indicator {
      display: none;
    }

    .sidebar-footer {
      display: none;
    }
  }
</style>
