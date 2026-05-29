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
  <div class="pomodoro-wrapper">
    <PomodoroTimer bind:subjects bind:pomodoroConfig bind:pomodoroLogs />
  </div>
  <div class="planner-wrapper">
    <SchedulePlanner bind:subjects bind:schedule />
  </div>
</div>

<style>
  .schedule-pomodoro-layout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--gap);
    width: 100%;
  }

  .pomodoro-wrapper {
    flex: 1 1 340px;
    min-width: 300px;
    max-width: 100%;
  }

  .planner-wrapper {
    flex: 2 1 500px;
    min-width: 0;
    max-width: 100%;
  }
</style>
