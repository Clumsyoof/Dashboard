<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Play, Pause, RotateCcw, Trash2, Settings, Volume2 } from 'lucide-svelte';
  import type { Subject, PomodoroConfig, PomodoroStatsLog } from '../types';
  import { toastStore } from './toast';

  export let subjects: Subject[] = [];
  export let pomodoroConfig: PomodoroConfig;
  export let pomodoroLogs: PomodoroStatsLog[];

  // ── Timer State ──────────────────────────────────────────────────────────────
  let mode: 'work' | 'shortBreak' | 'longBreak' = 'work';
  let isRunning = false;
  let timeLeft = pomodoroConfig.workMinutes * 60;
  let totalDuration = pomodoroConfig.workMinutes * 60;
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let selectedSubjectId = '';
  $: completedIntervalsCount = pomodoroLogs.length;

  let customWorkMins = pomodoroConfig.workMinutes;
  let customShortMins = pomodoroConfig.shortBreakMinutes;
  let customLongMins = pomodoroConfig.longBreakMinutes;
  let showCustomSchema = false;

  // ── Inline delete confirmation ────────────────────────────────────────────────
  let pendingDeleteLogId: string | null = null;

  // ── Sessions chart state ─────────────────────────────────────────────────────
  let selectedChartSubjectId = '';
  let selectedChartRange: 'week' | 'month' | 'year' | 'all' = 'week';
  let scrollContainer: HTMLDivElement;

  onMount(() => { resetTimer(); });
  onDestroy(() => { stopTimer(); });

  // ── Timer functions ──────────────────────────────────────────────────────────
  function applyCustomTimeScheme() {
    pomodoroConfig = { ...pomodoroConfig, workMinutes: customWorkMins, shortBreakMinutes: customShortMins, longBreakMinutes: customLongMins };
    resetTimer();
    showCustomSchema = false;
    toastStore.add('Custom timer scheme applied!', 'success');
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    timerInterval = setInterval(() => { timeLeft > 0 ? timeLeft-- : timerCompleted(); }, 1000);
  }

  function stopTimer() {
    isRunning = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function resetTimer() {
    stopTimer();
    const mins = mode === 'work' ? pomodoroConfig.workMinutes
      : mode === 'shortBreak' ? pomodoroConfig.shortBreakMinutes
      : pomodoroConfig.longBreakMinutes;
    timeLeft = totalDuration = mins * 60;
  }

  function switchMode(newMode: typeof mode) { mode = newMode; resetTimer(); }

  function playAlertSound() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const note = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.start(start); osc.stop(start + dur);
      };
      const t = ctx.currentTime;
      note(523.25, t, 0.15); note(659.25, t + 0.15, 0.15);
      note(783.99, t + 0.3, 0.15); note(1046.5, t + 0.45, 0.3);
    } catch (e) { console.error('Audio error:', e); }
  }

  function timerCompleted() {
    stopTimer();
    playAlertSound();
    if (mode === 'work') {
      const nextCount = pomodoroLogs.length + 1;
      const sub = subjects.find(s => s.id === selectedSubjectId);
      pomodoroLogs = [{
        id: crypto.randomUUID(),
        subjectId: selectedSubjectId || undefined,
        subjectName: sub ? sub.name : 'General Study',
        durationMinutes: pomodoroConfig.workMinutes,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now()
      }, ...pomodoroLogs];
      document.dispatchEvent(new CustomEvent('workspace_activity_logged'));
      mode = nextCount % pomodoroConfig.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
    } else {
      mode = 'work';
    }
    resetTimer();
    toastStore.add(`Session complete — entering ${mode.toUpperCase()}.`, 'success', 4500);
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function updateLogSubject(logId: string, subjectId: string) {
    const sub = subjects.find(s => s.id === subjectId);
    pomodoroLogs = pomodoroLogs.map(log =>
      log.id === logId ? { ...log, subjectId: subjectId || undefined, subjectName: sub ? sub.name : 'General Study' } : log
    );
  }

  function deletePomodoroLog(logId: string) {
    if (pendingDeleteLogId === logId) {
      pomodoroLogs = pomodoroLogs.filter(l => l.id !== logId);
      pendingDeleteLogId = null;
    } else {
      pendingDeleteLogId = logId;
    }
  }

  // ── Sessions chart computation ───────────────────────────────────────────────
  $: chartData = (() => {
    const now = new Date();
    let startDate = new Date(), isDaily = true, numBins = 7;
    if (selectedChartRange === 'week') { startDate.setDate(now.getDate() - 6); numBins = 7; }
    else if (selectedChartRange === 'month') { startDate.setDate(now.getDate() - 29); numBins = 30; }
    else if (selectedChartRange === 'year') { startDate.setFullYear(now.getFullYear() - 1); isDaily = false; numBins = 12; }
    else {
      isDaily = false;
      const oldest = pomodoroLogs.length ? new Date(Math.min(...pomodoroLogs.map(l => l.timestamp))) : new Date(now.getFullYear() - 1, 0, 1);
      numBins = Math.max(12, (now.getFullYear() - oldest.getFullYear()) * 12 + (now.getMonth() - oldest.getMonth()) + 1);
      startDate = new Date(now.getFullYear(), now.getMonth() - (numBins - 1), 1);
    }
    startDate.setHours(0, 0, 0, 0);
    const filtered = pomodoroLogs.filter(l => (!selectedChartSubjectId || l.subjectId === selectedChartSubjectId) && l.timestamp >= startDate.getTime());
    const bins: { label: string; count: number }[] = [];
    if (isDaily) {
      for (let i = 0; i < numBins; i++) {
        const d = new Date(startDate); d.setDate(startDate.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        bins.push({ label: selectedChartRange === 'week' ? d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0,3) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), count: filtered.filter(l => l.date === ds).length });
      }
    } else {
      for (let i = numBins - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        bins.push({ label: d.toLocaleDateString(undefined, selectedChartRange === 'year' ? { month: 'short' } : { month: 'short', year: '2-digit' }), count: filtered.filter(l => { const ld = new Date(l.timestamp); return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth(); }).length });
      }
    }
    return bins;
  })();

  $: chartWidth = Math.max(340, chartData.length * (selectedChartRange === 'month' ? 14 : 24));
  $: if (scrollContainer && chartData) setTimeout(() => { scrollContainer && (scrollContainer.scrollLeft = scrollContainer.scrollWidth); }, 50);
</script>

<div class="pomodoro-panel tiling-panel">
  <div class="panel-header">
    <div class="panel-title">Pomodoro</div>
    <div class="header-actions">
      <button class="icon-btn-md3" title="Custom Timer Scheme" on:click={() => showCustomSchema = !showCustomSchema}>
        <Settings size={14} />
      </button>
      <button class="icon-btn-md3" title="Test Volume" on:click={playAlertSound}>
        <Volume2 size={14} />
      </button>
    </div>
  </div>

  {#if showCustomSchema}
    <div class="custom-schema-form mb-4">
      <span class="form-title">Custom Times</span>
      <div class="schema-inputs">
        <div class="schema-field"><label for="cw">Work</label><input id="cw" type="number" min="1" max="180" bind:value={customWorkMins} /></div>
        <div class="schema-field"><label for="cs">S-Break</label><input id="cs" type="number" min="1" max="60" bind:value={customShortMins} /></div>
        <div class="schema-field"><label for="cl">L-Break</label><input id="cl" type="number" min="1" max="120" bind:value={customLongMins} /></div>
      </div>
      <button class="primary apply-schema-btn mt-2" on:click={applyCustomTimeScheme}>Apply</button>
    </div>
  {/if}

  <div class="mode-tabs">
    <button class={mode === 'work' ? 'active' : ''} on:click={() => switchMode('work')}>Work</button>
    <button class={mode === 'shortBreak' ? 'active' : ''} on:click={() => switchMode('shortBreak')}>Short Break</button>
    <button class={mode === 'longBreak' ? 'active' : ''} on:click={() => switchMode('longBreak')}>Long Break</button>
  </div>

  <div class="timer-dial-container">
    <div class="timer-dial">
      <span class="timer-label">{mode.toUpperCase()}</span>
      <span class="timer-countdown">{formatTime(timeLeft)}</span>
      <span class="timer-pct-bar" style="width: {(timeLeft / totalDuration) * 100}%"></span>
    </div>
  </div>

  {#if mode === 'work'}
    <div class="subject-picker mb-4">
      <label for="pomo-sub">Tag Subject:</label>
      <select id="pomo-sub" bind:value={selectedSubjectId}>
        <option value="">General</option>
        {#each subjects as sub}<option value={sub.id}>{sub.code} - {sub.name}</option>{/each}
      </select>
    </div>
  {/if}

  <div class="timer-controls">
    {#if !isRunning}
      <button class="primary play-btn" on:click={startTimer}><Play size={16} /><span>Start</span></button>
    {:else}
      <button class="pause-btn" on:click={stopTimer}><Pause size={16} /><span>Pause</span></button>
    {/if}
    <button class="reset-btn" on:click={resetTimer}><RotateCcw size={16} /><span>Reset</span></button>
  </div>

  <!-- Sessions Chart -->
  <div class="sessions-chart-section mt-4 pt-3">
    <div class="chart-header flex-between mb-2">
      <span class="chart-section-title">Sessions Log</span>
      <div class="chart-filters">
        <select class="chart-sub-picker" bind:value={selectedChartSubjectId}>
          <option value="">Total</option>
          {#each subjects as sub}<option value={sub.id}>{sub.name}</option>{/each}
        </select>
        <div class="chart-range-tabs">
          {#each ['week','month','year','all'] as r}
            <button class={selectedChartRange === r ? 'active' : ''} on:click={() => selectedChartRange = r as typeof selectedChartRange}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
          {/each}
        </div>
      </div>
    </div>
    {#if chartData.length > 0}
      {@const maxCount = Math.max(...chartData.map(d => d.count), 1)}
      <div class="chart-scroll-viewport" bind:this={scrollContainer}>
        <div class="chart-container" style="width: {chartWidth}px;">
          <svg class="chart-svg" viewBox="0 0 {chartWidth} 110" preserveAspectRatio="none">
            <line x1="0" y1="10" x2={chartWidth} y2="10" stroke="var(--border)" stroke-dasharray="2 4" stroke-opacity="0.3" />
            <line x1="0" y1="50" x2={chartWidth} y2="50" stroke="var(--border)" stroke-dasharray="2 4" stroke-opacity="0.3" />
            <line x1="0" y1="90" x2={chartWidth} y2="90" stroke="var(--border)" stroke-opacity="0.3" />
            {#each chartData as d, i}
              {@const bw = chartWidth / chartData.length}
              {@const bp = selectedChartRange === 'month' ? 1.5 : 6}
              {@const x = i * bw + bp}
              {@const w = Math.max(2, bw - bp * 2)}
              {@const h = (d.count / maxCount) * 80}
              <rect class="chart-rect" {x} y={90 - h} width={w} height={h} rx={w > 6 ? 2 : 0.5} fill="var(--accent)" fill-opacity={d.count > 0 ? '0.85' : '0.15'}>
                <title>{d.label}: {d.count} sessions</title>
              </rect>
            {/each}
          </svg>
          <div class="chart-labels">
            {#each chartData as d, i}
              <span class="chart-label-text" style="width: {100 / chartData.length}%">{selectedChartRange !== 'month' || i % 5 === 0 ? d.label : ''}</span>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Session Log History -->
  <div class="pomo-logs-panel mt-4">
    <span class="stats-label">Sessions:</span>
    <span class="badge accent">{completedIntervalsCount}</span>
    {#if pomodoroLogs.length > 0}
      <div class="pomo-history mt-2">
        <span class="history-title">History (Last 4):</span>
        <div class="history-list">
          {#each pomodoroLogs.slice(0, 4) as log}
            <div class="history-row-item">
              <div class="hist-left">
                <select class="hist-subject-select" value={log.subjectId || ''} on:change={(e) => updateLogSubject(log.id, (e.target as HTMLSelectElement).value)}>
                  <option value="">General Study</option>
                  {#each subjects as sub}<option value={sub.id}>{sub.name}</option>{/each}
                </select>
              </div>
              <div class="hist-right">
                <span class="hist-duration">{log.durationMinutes}m</span>
                {#if pendingDeleteLogId === log.id}
                  <button class="hist-confirm-yes" on:click={() => deletePomodoroLog(log.id)}>Yes</button>
                  <button class="hist-confirm-no" on:click={() => pendingDeleteLogId = null}>No</button>
                {:else}
                  <button class="hist-delete-btn" on:click={() => deletePomodoroLog(log.id)} title="Remove Session">
                    <Trash2 size={10} />
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .header-actions { display: flex; gap: 6px; }
  .icon-btn-md3 { padding: 6px; background: none; border: 1px solid var(--border); border-radius: 50%; color: var(--text-muted); }
  .icon-btn-md3:hover { color: var(--accent); border-color: var(--accent); }

  .custom-schema-form { background-color: var(--bg); border: 1px solid var(--border); border-radius: var(--border-radius-md); padding: 12px; }
  .form-title { font-size: 0.7rem; font-weight: 800; color: var(--accent); display: block; margin-bottom: 8px; letter-spacing: 0.05em; }
  .schema-inputs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .schema-field { display: flex; flex-direction: column; gap: 4px; }
  .schema-field label { font-size: 0.6rem; font-weight: bold; color: var(--text-muted); }
  .schema-field input { text-align: center; padding: 6px; }
  .apply-schema-btn { width: 100%; font-size: 0.75rem; padding: 6px; }

  .mode-tabs { display: flex; border: 1px solid var(--border); border-radius: 20px; overflow: hidden; margin-bottom: 20px; background-color: var(--bg); }
  .mode-tabs button { flex-grow: 1; border: none; background: none; font-size: 0.75rem; padding: 8px; border-radius: 0; color: var(--text-muted); }
  .mode-tabs button.active { background-color: var(--accent); color: var(--bg-panel); font-weight: bold; border-radius: 20px; }

  .timer-dial-container { display: flex; justify-content: center; margin-bottom: 20px; }
  .timer-dial { width: 220px; height: 120px; border: 1px solid var(--border); border-radius: var(--border-radius-lg); background-color: var(--bg); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; }
  .timer-label { font-size: 0.75rem; color: var(--text-muted); font-weight: bold; letter-spacing: 0.05em; }
  .timer-countdown { font-size: 2.8rem; font-weight: bold; color: var(--accent); line-height: 1.1; }
  .timer-pct-bar { position: absolute; bottom: 0; left: 0; height: 4px; background-color: var(--accent-quaternary); transition: width 1s linear; }

  .subject-picker { display: flex; flex-direction: column; gap: 4px; }
  .subject-picker label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); }
  .timer-controls { display: flex; gap: 8px; }
  .timer-controls button { flex-grow: 1; padding: 10px; font-size: 0.85rem; }

  .sessions-chart-section { border-top: 1px dashed var(--border); }
  .chart-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  .chart-section-title { font-size: 0.72rem; font-weight: 800; color: var(--text-muted); letter-spacing: 0.05em; }
  .chart-filters { display: flex; align-items: center; gap: 6px; }
  .chart-sub-picker { background: var(--bg) !important; border: 1px solid var(--border) !important; color: var(--text) !important; font-family: var(--font-family) !important; font-size: 0.68rem !important; font-weight: bold !important; padding: 2px 20px 2px 8px !important; border-radius: 12px !important; cursor: pointer; outline: none; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23a9b1d6' stroke-width='2' viewBox='0 0 24 24'><path d='m6 9 6 6 6-6'/></svg>") !important; background-repeat: no-repeat !important; background-position: right 8px center !important; }
  .chart-range-tabs { display: flex; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background-color: var(--bg); }
  .chart-range-tabs button { border: none; background: none; font-size: 0.62rem; padding: 2px 6px; color: var(--text-muted); cursor: pointer; border-radius: 0; }
  .chart-range-tabs button.active { background-color: var(--accent); color: var(--bg-panel); font-weight: bold; }
  .chart-container { display: flex; flex-direction: column; width: 100%; margin-top: 4px; }
  .chart-svg { width: 100%; height: 70px; overflow: visible; }
  .chart-rect { transition: fill-opacity 0.2s ease, fill 0.2s ease; cursor: pointer; }
  .chart-rect:hover { fill-opacity: 1; fill: var(--accent-secondary); }
  .chart-labels { display: flex; justify-content: space-between; width: 100%; margin-top: 4px; border-top: 1px solid var(--border); padding-top: 4px; }
  .chart-label-text { font-size: 0.55rem; color: var(--text-muted); font-weight: bold; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chart-scroll-viewport { width: 100%; overflow-x: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
  .chart-scroll-viewport::-webkit-scrollbar { height: 4px; }
  .chart-scroll-viewport::-webkit-scrollbar-track { background: transparent; }
  .chart-scroll-viewport::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .pomo-logs-panel { border-top: 1px dashed var(--border); padding-top: 14px; }
  .stats-label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); margin-right: 6px; }
  .pomo-history { background-color: var(--bg); border: 1px solid var(--border); border-radius: var(--border-radius-md); padding: 8px; }
  .history-title { font-size: 0.65rem; font-weight: bold; color: var(--text-muted); display: block; margin-bottom: 4px; }
  .history-list { display: flex; flex-direction: column; gap: 4px; }
  .history-row-item { display: flex; justify-content: space-between; align-items: center; background-color: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--border-radius-sm); padding: 6px 8px; font-size: 0.7rem; gap: 8px; margin-bottom: 4px; transition: border-color 0.2s ease; }
  .history-row-item:hover { border-color: var(--accent); }
  .hist-left { display: flex; align-items: center; flex-grow: 1; }
  .hist-subject-select { background: none; border: none; font-size: 0.7rem; font-weight: bold; color: var(--accent); padding: 0; margin: 0; cursor: pointer; max-width: 140px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
  .hist-subject-select:focus { outline: none; }
  .hist-right { display: flex; align-items: center; gap: 8px; }
  .hist-duration { color: var(--text-muted); font-weight: bold; }
  .hist-delete-btn { background: none; border: none; padding: 2px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; border-radius: var(--border-radius-sm); transition: color 0.2s ease, background-color 0.2s ease; }
  .hist-delete-btn:hover { color: var(--accent-secondary); background-color: var(--border); }
  .hist-confirm-yes, .hist-confirm-no { font-size: 0.6rem; padding: 2px 6px; border-radius: 8px; font-weight: bold; cursor: pointer; }
  .hist-confirm-yes { border-color: var(--accent-secondary); color: var(--accent-secondary); background: none; }
  .hist-confirm-yes:hover { background-color: var(--accent-secondary); color: var(--bg-panel); }
  .hist-confirm-no { border-color: var(--border); color: var(--text-muted); background: none; }
  .hist-confirm-no:hover { border-color: var(--text); color: var(--text); }
</style>
