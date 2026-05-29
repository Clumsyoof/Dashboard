<script lang="ts">
  import { onMount } from 'svelte';
  import type { 
    Theme, 
    Subject, 
    ScheduleBlock, 
    Project, 
    Task, 
    PomodoroConfig, 
    PomodoroStatsLog,
    DashboardBackup 
  } from './types';

  // Import Components
  import Sidebar from './lib/Sidebar.svelte';
  import ThemeSelector from './lib/ThemeSelector.svelte';
  import GDriveSync from './lib/GDriveSync.svelte';
  import DashboardView from './lib/DashboardView.svelte';
  import NotesExplorer from './lib/NotesExplorer.svelte';
  import AttendanceTracker from './lib/AttendanceTracker.svelte';
  import StudySchedule from './lib/StudySchedule.svelte';
  import WorkTracker from './lib/WorkTracker.svelte';
  import ToastContainer from './lib/ToastContainer.svelte';

  // State Management
  let activeTab: 'dashboard' | 'attendance' | 'schedule' | 'tasks' | 'notes' = 'dashboard';
  let theme: Theme = 'tokyonight';

  // Productivity State
  let subjects: Subject[] = [];
  let schedule: ScheduleBlock[] = [];
  let projects: Project[] = [];
  let tasks: Task[] = [];
  let pomodoroConfig: PomodoroConfig = {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4
  };
  let pomodoroLogs: PomodoroStatsLog[] = [];
  let contributions: Record<string, number> = {};

  let syncComponent: { requestBackup: () => void };

  onMount(() => {
    // 1. Theme Configuration
    theme = (localStorage.getItem('workspace_theme') as Theme) || 'tokyonight';
    applyThemeClass(theme);

    // 2. Load Dashboard State from localStorage
    try {
      const savedSubjects = localStorage.getItem('workspace_subjects');
      if (savedSubjects) subjects = JSON.parse(savedSubjects);

      const savedSchedule = localStorage.getItem('workspace_schedule');
      if (savedSchedule) schedule = JSON.parse(savedSchedule);

      const savedProjects = localStorage.getItem('workspace_projects');
      if (savedProjects) projects = JSON.parse(savedProjects);

      const savedTasks = localStorage.getItem('workspace_tasks');
      if (savedTasks) tasks = JSON.parse(savedTasks);

      const savedPomoConfig = localStorage.getItem('workspace_pomo_config');
      if (savedPomoConfig) pomodoroConfig = JSON.parse(savedPomoConfig);

      const savedPomoLogs = localStorage.getItem('workspace_pomo_logs');
      if (savedPomoLogs) pomodoroLogs = JSON.parse(savedPomoLogs);

      const savedContributions = localStorage.getItem('workspace_contributions');
      if (savedContributions) contributions = JSON.parse(savedContributions);
    } catch (e) {
      console.error('Failed to load localStorage dashboard data:', e);
    }

    // 3. Register global activity listener to increment contribution matrix cells
    document.addEventListener('workspace_activity_logged', incrementContribution);
    
    return () => {
      document.removeEventListener('workspace_activity_logged', incrementContribution);
    };
  });

  function incrementContribution() {
    const todayStr = new Date().toISOString().split('T')[0];
    contributions[todayStr] = (contributions[todayStr] || 0) + 1;
    contributions = { ...contributions }; // trigger Svelte reactivity
  }

  // Watchers to trigger automatic backups on local state changes
  $: {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspace_subjects', JSON.stringify(subjects));
      syncComponent?.requestBackup();
    }
  }
  $: {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspace_schedule', JSON.stringify(schedule));
      syncComponent?.requestBackup();
    }
  }
  $: {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspace_projects', JSON.stringify(projects));
      syncComponent?.requestBackup();
    }
  }
  $: {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspace_tasks', JSON.stringify(tasks));
      syncComponent?.requestBackup();
    }
  }
  $: {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspace_pomo_config', JSON.stringify(pomodoroConfig));
      syncComponent?.requestBackup();
    }
  }
  $: {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspace_pomo_logs', JSON.stringify(pomodoroLogs));
      syncComponent?.requestBackup();
    }
  }
  $: {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspace_contributions', JSON.stringify(contributions));
      syncComponent?.requestBackup();
    }
  }

  function handleThemeChange(event: CustomEvent<Theme>) {
    theme = event.detail;
    localStorage.setItem('workspace_theme', theme);
    applyThemeClass(theme);
  }

  function applyThemeClass(selectedTheme: Theme) {
    const body = document.body;
    // Remove old themes
    body.className = '';
    // Apply new theme class
    body.classList.add(`theme-${selectedTheme}`);
  }

  // Backup Data packaging
  function getBackupData(): DashboardBackup {
    return {
      subjects,
      schedule,
      projects,
      tasks,
      pomodoroConfig,
      pomodoroLogs,
      theme,
      contributions,
      googleClientId: localStorage.getItem('gdrive_client_id') || undefined
    };
  }

  // Restore Data unpacking
  function handleRestore(data: DashboardBackup) {
    if (data.subjects) subjects = data.subjects;
    if (data.schedule) schedule = data.schedule;
    if (data.projects) projects = data.projects;
    if (data.tasks) tasks = data.tasks;
    if (data.pomodoroConfig) pomodoroConfig = data.pomodoroConfig;
    if (data.pomodoroLogs) pomodoroLogs = data.pomodoroLogs;
    if (data.contributions) contributions = data.contributions;
    if (data.theme) {
      theme = data.theme;
      applyThemeClass(theme);
    }
    if (data.googleClientId) {
      localStorage.setItem('gdrive_client_id', data.googleClientId);
    }
  }
</script>

<ToastContainer />
<div class="app-container">
  <!-- Left Side Bar -->
  <Sidebar bind:activeTab />

  <!-- Main view core -->
  <main class="main-content">
    
    <!-- Top Hub Sync / Theme selector bar -->
    <header class="top-status-bar mb-4">
      <div class="top-status-left">
        <span class="path-indicator">{activeTab}</span>
      </div>
      <div class="top-status-actions">
        <ThemeSelector activeTheme={theme} on:change={handleThemeChange} />
      </div>
    </header>

    <div class="view-content-wrapper">
      {#if activeTab === 'dashboard'}
        <DashboardView {subjects} {tasks} {schedule} {contributions} />
      {:else if activeTab === 'notes'}
        <NotesExplorer />
      {:else if activeTab === 'attendance'}
        <AttendanceTracker bind:subjects />
      {:else if activeTab === 'schedule'}
        <StudySchedule 
          bind:subjects={subjects}
          bind:schedule={schedule}
          bind:pomodoroConfig={pomodoroConfig}
          bind:pomodoroLogs={pomodoroLogs}
        />
      {:else if activeTab === 'tasks'}
        <WorkTracker bind:tasks bind:projects bind:subjects />
      {/if}
    </div>

    <!-- Bottom GDrive Backup panel -->
    <footer class="bottom-footer mt-4">
      <GDriveSync bind:this={syncComponent} onRestore={handleRestore} onGetBackupData={getBackupData} />
    </footer>
  </main>
</div>

<style>
  .top-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px double var(--border);
    padding-bottom: 8px;
  }

  @media (max-width: 768px) {
    .top-status-bar {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }

  .path-indicator {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 0.05em;
    text-transform: capitalize;
  }

  .top-status-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .view-content-wrapper {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .bottom-footer {
    border-top: 1px dashed var(--border);
    padding-top: 14px;
  }
</style>
