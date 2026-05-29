<script lang="ts">
  import { Plus, Trash2, Settings, Check, RefreshCw } from 'lucide-svelte';
  import type { Subject, ScheduleBlock } from '../types';
  import { typeColors, pushEventToGoogleAPI, deleteGoogleEvent, syncGoogleCalendar } from './googleCalendar';

  export let subjects: Subject[] = [];
  export let schedule: ScheduleBlock[] = [];

  // ── Schedule block form state ────────────────────────────────────────────────
  let newBlockSubjectName = '';
  let newBlockSubjectId = '';
  let newBlockDate = new Date().toISOString().split('T')[0];
  let editingBlockId: string | null = null;
  let newBlockType: NonNullable<ScheduleBlock['type']> = 'study';
  let newBlockIsRecurring = false;
  let newBlockRecurrenceType = 'weekly';

  // ── Calendar / sync state ────────────────────────────────────────────────────
  let isSyncing = false;
  let syncMessage = '';
  let expandedHolidayIds: string[] = [];
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();

  // ── Custom 24-hour time picker ───────────────────────────────────────────────
  let startHour = '09', startMin = '00', endHour = '10', endMin = '30';
  $: newBlockStart = `${startHour.padStart(2,'0')}:${startMin.padStart(2,'0')}`;
  $: newBlockEnd   = `${endHour.padStart(2,'0')}:${endMin.padStart(2,'0')}`;

  const daysOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const hoursTimeline = Array.from({ length: 15 }, (_, i) => i + 8);

  // ── Reactive calendar data ───────────────────────────────────────────────────
  $: daysInMonth    = new Date(currentYear, currentMonth + 1, 0).getDate();
  $: firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  $: calendarDays   = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    if (day > 0 && day <= daysInMonth) {
      const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      return { day, date: dateStr, blocks: schedule.filter(b => b.date === dateStr).sort((a,b) => a.startTime.localeCompare(b.startTime)) };
    }
    return null;
  });
  $: todayDateStr = new Date().toISOString().split('T')[0];
  $: todayBlocks  = schedule.filter(b => b.date === todayDateStr).sort((a,b) => a.startTime.localeCompare(b.startTime));

  // ── Time picker handlers ─────────────────────────────────────────────────────
  function handleHourInput(type: 'start'|'end', e: Event) {
    const inp = e.target as HTMLInputElement;
    let v = inp.value.replace(/\D/g,'').slice(0,2);
    if (parseInt(v) > 23) v = '23';
    if (type === 'start') startHour = v; else endHour = v;
    if (v.length === 2) (inp.nextElementSibling?.nextElementSibling as HTMLInputElement)?.focus();
  }
  function handleMinInput(type: 'start'|'end', e: Event) {
    const inp = e.target as HTMLInputElement;
    let v = inp.value.replace(/\D/g,'').slice(0,2);
    if (parseInt(v) > 59) v = '59';
    if (type === 'start') startMin = v; else endMin = v;
  }
  function formatTimeOnBlur(type: 'start'|'end', field: 'hour'|'min') {
    if (type === 'start') { if (field === 'hour') startHour = (startHour||'00').padStart(2,'0'); else startMin = (startMin||'00').padStart(2,'0'); }
    else                  { if (field === 'hour') endHour   = (endHour  ||'00').padStart(2,'0'); else endMin   = (endMin  ||'00').padStart(2,'0'); }
  }
  function toggleHoliday(e: Event, id: string) {
    e.stopPropagation();
    expandedHolidayIds = expandedHolidayIds.includes(id) ? expandedHolidayIds.filter(i => i !== id) : [...expandedHolidayIds, id];
  }

  // ── Schedule CRUD ────────────────────────────────────────────────────────────
  async function addScheduleBlock() {
    let name = newBlockSubjectName.trim();
    if (newBlockSubjectId) { const s = subjects.find(s => s.id === newBlockSubjectId); if (s) name = s.name; }
    if (!name) return;
    const newBlock: ScheduleBlock = {
      id: crypto.randomUUID(),
      subjectId: newBlockSubjectId || undefined,
      subjectName: name,
      date: newBlockDate,
      startTime: newBlockStart,
      endTime: newBlockEnd,
      color: typeColors[newBlockType] ?? `hsl(${Math.floor(Math.random()*360)},65%,70%)`,
      type: newBlockType,
      isRecurring: newBlockIsRecurring,
      recurrenceRule: newBlockIsRecurring ? `RRULE:FREQ=${newBlockRecurrenceType.toUpperCase()}` : undefined
    };
    schedule = [...schedule, newBlock];
    newBlockSubjectName = ''; newBlockSubjectId = ''; newBlockIsRecurring = false;
    // Fire-and-forget push to Google
    const token = sessionStorage.getItem('gdrive_access_token');
    if (token) {
      try {
        const googleId = await pushEventToGoogleAPI(newBlock, token);
        if (googleId) schedule = schedule.map(b => b.id === newBlock.id ? { ...b, googleEventId: googleId } : b);
      } catch { /* best-effort */ }
    }
  }

  async function deleteScheduleBlock(id: string) {
    if (editingBlockId === id) cancelEditBlock();
    const block = schedule.find(b => b.id === id);
    if (block?.googleEventId) deleteGoogleEvent(block.googleEventId);
    schedule = schedule.filter(b => b.id !== id);
  }

  function editScheduleBlock(block: ScheduleBlock) {
    editingBlockId = block.id;
    newBlockSubjectId = block.subjectId || '';
    newBlockSubjectName = block.subjectId ? '' : block.subjectName;
    newBlockDate = block.date;
    [startHour, startMin] = (block.startTime || '09:00').split(':');
    [endHour,   endMin  ] = (block.endTime   || '10:00').split(':');
  }

  function saveScheduleBlock() {
    let name = newBlockSubjectName.trim();
    if (newBlockSubjectId) { const s = subjects.find(s => s.id === newBlockSubjectId); if (s) name = s.name; }
    if (!name) return;
    schedule = schedule.map(b => b.id === editingBlockId ? { ...b, subjectId: newBlockSubjectId || undefined, subjectName: name, date: newBlockDate, startTime: newBlockStart, endTime: newBlockEnd } : b);
    cancelEditBlock();
  }

  function cancelEditBlock() {
    editingBlockId = null; newBlockSubjectName = ''; newBlockSubjectId = '';
    newBlockDate = new Date().toISOString().split('T')[0];
    startHour = '09'; startMin = '00'; endHour = '10'; endMin = '30';
  }

  function getPositionProps(block: ScheduleBlock) {
    const [sH, sM] = block.startTime.split(':').map(Number);
    const [eH, eM] = block.endTime.split(':').map(Number);
    const top    = Math.max(0, sH * 60 + sM - 8 * 60);
    const height = Math.max(35, eH * 60 + eM - (sH * 60 + sM));
    return `top: ${top}px; height: ${height}px; border-left-color: ${block.color};`;
  }

  async function doSync() {
    await syncGoogleCalendar(
      schedule,
      (s) => { schedule = s; },
      (_syncing, msg) => { isSyncing = _syncing; syncMessage = msg; },
      currentYear,
      currentMonth
    );
  }
</script>

<div class="schedule-planner tiling-panel">
  <div class="panel-header">
    <div class="panel-title">Planner</div>
  </div>

  <!-- Block Scaffolder Form -->
  <div class="block-form mb-4">
    <div class="form-inputs">
      <div class="input-field">
        <label>Type</label>
        <select bind:value={newBlockType}>
          <option value="study">Study</option>
          <option value="exam">Exam</option>
          <option value="conference">Conference</option>
          <option value="task">Task Deadline</option>
        </select>
      </div>
      <div class="input-field">
        <label for="sched-sub">Subject</label>
        <select id="sched-sub" bind:value={newBlockSubjectId}>
          <option value="">Custom...</option>
          {#each subjects as s}<option value={s.id}>{s.code} - {s.name}</option>{/each}
        </select>
      </div>
      {#if !newBlockSubjectId}
        <div class="input-field">
          <label for="sched-custom">Topic</label>
          <input id="sched-custom" type="text" placeholder="Algorithms..." bind:value={newBlockSubjectName} />
        </div>
      {/if}
      <div class="input-field">
        <label for="sched-date">Date</label>
        <input id="sched-date" type="date" bind:value={newBlockDate} style="padding:6px;font-size:0.75rem;" />
      </div>
      <div class="input-field">
        <label>Start (24h)</label>
        <div class="time-picker-glass">
          <input type="text" class="time-picker-input-field" maxlength="2" placeholder="09" bind:value={startHour} on:input={(e) => handleHourInput('start',e)} on:blur={() => formatTimeOnBlur('start','hour')} />
          <span class="time-picker-separator">:</span>
          <input type="text" class="time-picker-input-field" maxlength="2" placeholder="00" bind:value={startMin} on:input={(e) => handleMinInput('start',e)} on:blur={() => formatTimeOnBlur('start','min')} />
        </div>
      </div>
      <div class="input-field">
        <label>End (24h)</label>
        <div class="time-picker-glass">
          <input type="text" class="time-picker-input-field" maxlength="2" placeholder="10" bind:value={endHour} on:input={(e) => handleHourInput('end',e)} on:blur={() => formatTimeOnBlur('end','hour')} />
          <span class="time-picker-separator">:</span>
          <input type="text" class="time-picker-input-field" maxlength="2" placeholder="30" bind:value={endMin} on:input={(e) => handleMinInput('end',e)} on:blur={() => formatTimeOnBlur('end','min')} />
        </div>
      </div>
      <div class="input-field" style="display:flex;flex-direction:column;justify-content:center;">
        <label class="check-label mt-2" style="font-size:0.75rem;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;gap:6px;">
          <input type="checkbox" bind:checked={newBlockIsRecurring} /> Recurring?
        </label>
        {#if newBlockIsRecurring}
          <select bind:value={newBlockRecurrenceType} style="margin-top:4px;">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        {/if}
      </div>
    </div>
    {#if editingBlockId}
      <div style="display:flex;gap:8px;" class="mt-2">
        <button class="primary add-block-btn" on:click={saveScheduleBlock}><Check size={14} /><span>Update</span></button>
        <button style="background:none;border:1px solid var(--border);color:var(--text-muted);" class="add-block-btn" on:click={cancelEditBlock}><span>Cancel</span></button>
      </div>
    {:else}
      <button class="primary add-block-btn mt-2" on:click={addScheduleBlock}><Plus size={14} /><span>Add</span></button>
    {/if}
  </div>

  <div class="planner-dual-view">
    <!-- Day Timeline -->
    <div class="teams-day-timeline-card">
      <span class="timeline-title-badge">Today</span>
      <div class="teams-hour-scroller">
        <div class="teams-timeline-grid-relative">
          {#each hoursTimeline as hour}
            <div class="teams-hour-slot">
              <span class="teams-hour-label-text">{hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}</span>
              <div class="teams-slot-line"></div>
            </div>
          {/each}
          {#each todayBlocks as block}
            <div class="teams-scheduled-event-card" style={getPositionProps(block)}>
              <span class="event-title">{block.subjectName}</span>
              <span class="event-time">{block.startTime} - {block.endTime}</span>
              <div style="position:absolute;right:4px;top:4px;display:flex;gap:4px;">
                <button class="event-delete-btn" on:click={() => editScheduleBlock(block)} title="Edit"><Settings size={10} /></button>
                <button class="event-delete-btn" on:click={() => deleteScheduleBlock(block.id)} title="Delete"><Trash2 size={10} /></button>
              </div>
            </div>
          {/each}
          {#if todayBlocks.length === 0}
            <div class="empty-timeline-watermark"><span>[Empty]</span></div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Monthly Calendar -->
    <div class="monthly-calendar-view">
      <div class="calendar-header flex-between mb-2">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="monthly-title-badge">{new Date(currentYear, currentMonth).toLocaleString('default',{month:'long',year:'numeric'})}</span>
          {#if isSyncing}
            <span style="font-size:0.7rem;color:var(--accent);display:flex;align-items:center;gap:4px;"><RefreshCw size={12} class="spin" /> {syncMessage}</span>
          {:else if syncMessage}
            <span style="font-size:0.7rem;color:var(--accent-tertiary);">{syncMessage}</span>
          {/if}
          <button class="icon-btn" on:click={doSync} title="Sync Google Calendar" style="background:none;border:1px solid var(--border);padding:4px;border-radius:4px;cursor:pointer;color:var(--text-muted);"><RefreshCw size={14} /></button>
        </div>
        <div class="calendar-nav">
          <button on:click={() => { if(currentMonth===0){currentMonth=11;currentYear--;}else currentMonth--; }}>&lt;</button>
          <button on:click={() => {currentMonth=new Date().getMonth();currentYear=new Date().getFullYear();}}>Today</button>
          <button on:click={() => { if(currentMonth===11){currentMonth=0;currentYear++;}else currentMonth++; }}>&gt;</button>
        </div>
      </div>
      <div class="calendar-grid">
        {#each daysOfWeek as d}<div class="calendar-day-header">{d}</div>{/each}
        {#each calendarDays as day}
          {#if day}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="calendar-day {day.date === todayDateStr ? 'is-today' : ''}" on:click={() => newBlockDate = day.date}>
              <span class="day-number">{day.day}</span>
              <div class="calendar-blocks">
                {#each day.blocks as block}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div class="cal-block-item" style="border-left-color:{block.color};" title="{block.startTime} - {block.endTime}"
                    on:click={(e) => { if(block.type==='holiday') toggleHoliday(e, block.id); }}>
                    {#if block.startTime}<span class="cal-block-time">{block.startTime}</span>{/if}
                    <span class="cal-block-title" style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
                      {#if block.type === 'holiday'}
                        {#if expandedHolidayIds.includes(block.id)}<span>{block.subjectName}</span>{/if}
                        <span class="badge" style="border-color:{block.color};color:{block.color};font-size:0.5rem;background:rgba(255,255,255,0.1);">holiday</span>
                      {:else}
                        <span>{block.subjectName}</span>
                        {#if block.type && block.type !== 'study'}<span class="badge" style="border-color:{block.color};color:{block.color};font-size:0.5rem;">{block.type}</span>{/if}
                      {/if}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="calendar-day empty-day-slot"></div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  .block-form { background-color: var(--bg); border: 1px solid var(--border); border-radius: var(--border-radius-md); padding: 14px; }
  .form-inputs { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
  .input-field { display: flex; flex-direction: column; gap: 4px; }
  .input-field label { font-size: 0.65rem; font-weight: bold; color: var(--text-muted); }
  .add-block-btn { width: 100%; }

  .planner-dual-view { display: grid; grid-template-columns: 320px 1fr; gap: var(--gap); margin-top: var(--gap); }
  @media (max-width: 950px) { .planner-dual-view { grid-template-columns: 1fr; } }

  .teams-day-timeline-card { background-color: var(--bg); border: 1px solid var(--border); border-radius: var(--border-radius-md); padding: 12px; display: flex; flex-direction: column; height: 480px; }
  .timeline-title-badge { font-size: 0.7rem; font-weight: 800; color: var(--accent); letter-spacing: 0.05em; display: block; margin-bottom: 12px; text-align: center; }
  .teams-hour-scroller { flex-grow: 1; overflow-y: auto; position: relative; padding-left: 65px; border-left: 1px dashed var(--border); }
  .teams-timeline-grid-relative { position: relative; height: 900px; }
  .teams-hour-slot { height: 60px; position: relative; border-bottom: 1px dashed var(--border); }
  .teams-hour-label-text { position: absolute; left: -65px; top: 4px; font-size: 0.65rem; font-weight: bold; color: var(--text-muted); width: 55px; text-align: right; }
  .teams-slot-line { width: 100%; height: 1px; }
  .teams-scheduled-event-card { position: absolute; left: 4px; right: 4px; background-color: var(--bg-panel); border: 1px solid var(--border); border-left: 4px solid var(--accent); border-radius: var(--border-radius-sm); padding: 6px 10px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0px 4px 8px rgba(0,0,0,0.12); z-index: 10; transition: var(--transition); }
  .teams-scheduled-event-card:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: 0px 6px 12px rgba(0,0,0,0.18); }
  .event-title { font-size: 0.75rem; font-weight: 800; color: var(--text); }
  .event-time { font-size: 0.65rem; color: var(--text-muted); font-weight: bold; }
  .event-delete-btn { background: none; border: none; padding: 2px; color: var(--text-muted); cursor: pointer; }
  .event-delete-btn:hover { color: var(--accent-secondary); }
  .empty-timeline-watermark { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .empty-timeline-watermark span { font-size: 0.8rem; color: var(--text-muted); font-weight: bold; letter-spacing: 0.05em; opacity: 0.6; }

  .monthly-calendar-view { display: flex; flex-direction: column; }
  .calendar-header { display: flex; align-items: center; }
  .monthly-title-badge { font-size: 0.85rem; font-weight: 800; color: var(--accent); letter-spacing: 0.05em; }
  .calendar-nav button { background: var(--bg); border: 1px solid var(--border); padding: 4px 10px; font-size: 0.7rem; cursor: pointer; color: var(--text); }
  .calendar-nav button:hover { background: var(--focus); }
  .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
  .calendar-day-header { text-align: center; font-size: 0.65rem; font-weight: bold; color: var(--text-muted); padding: 4px 0; }
  .calendar-day { background-color: var(--bg); border: 1px solid var(--border); border-radius: var(--border-radius-sm); min-height: 80px; padding: 4px; display: flex; flex-direction: column; cursor: pointer; transition: background-color 0.2s; }
  .calendar-day:hover { background-color: var(--focus); }
  .calendar-day.is-today { border-color: var(--accent); background-color: var(--bg-panel); }
  .empty-day-slot { background-color: transparent; border: 1px dashed var(--border); opacity: 0.5; cursor: default; min-height: 80px; }
  .day-number { font-size: 0.7rem; font-weight: bold; color: var(--text-muted); margin-bottom: 4px; align-self: flex-end; }
  .calendar-blocks { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; max-height: 60px; }
  .cal-block-item { font-size: 0.55rem; background-color: var(--bg-panel); border: 1px solid var(--border); border-left-width: 3px; border-left-style: solid; padding: 2px 4px; border-radius: 2px; display: flex; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cal-block-time { font-weight: bold; color: var(--text-muted); }
  .cal-block-title { overflow: hidden; text-overflow: ellipsis; }

  .time-picker-glass { display: flex; align-items: center; justify-content: center; background-color: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--border-radius-sm); padding: 2px 6px; height: 38px; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
  .time-picker-glass:focus-within { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .time-picker-input-field { background: none !important; border: none !important; padding: 0 !important; width: 24px !important; text-align: center !important; font-size: 0.85rem !important; font-weight: bold !important; color: var(--text) !important; }
  .time-picker-input-field:focus { outline: none !important; color: var(--accent) !important; }
  .time-picker-separator { color: var(--text-muted); font-weight: bold; padding: 0 2px; }
</style>
