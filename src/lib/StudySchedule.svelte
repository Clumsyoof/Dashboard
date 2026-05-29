<script lang="ts">
  import type { Subject, ScheduleBlock, PomodoroConfig, PomodoroStatsLog } from '../types';
  import PomodoroTimer from './PomodoroTimer.svelte';
  import SchedulePlanner from './SchedulePlanner.svelte';

  export let subjects: Subject[] = [];
  export let schedule: ScheduleBlock[] = [];
  export let pomodoroLogs: PomodoroStatsLog[] = [];
  export let pomodoroConfig: PomodoroConfig = {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4
  };
</script>

<div class="schedule-pomodoro-layout">
  <PomodoroTimer bind:subjects bind:pomodoroConfig bind:pomodoroLogs />
  <SchedulePlanner bind:subjects bind:schedule />
</div>

<style>
  .schedule-pomodoro-layout {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: var(--gap);
  }

  .schedule-pomodoro-layout > * {
    min-width: 0;
  }

  @media (max-width: 1100px) {
    .schedule-pomodoro-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
