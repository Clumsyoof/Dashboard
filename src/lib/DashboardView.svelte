<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    Terminal, 
    Calendar, 
    Timer, 
    AlertCircle, 
    TrendingUp, 
    CheckSquare,
    BookOpen,
    Activity
  } from 'lucide-svelte';
  import type { Subject, Task, ScheduleBlock } from '../types';

  export let subjects: Subject[] = [];
  export let tasks: Task[] = [];
  export let schedule: ScheduleBlock[] = [];
  export let contributions: Record<string, number> = {};

  // Local Time State
  let timeStr = new Date().toLocaleTimeString();
  let dateStr = new Date().toDateString();
  let clockInterval: ReturnType<typeof setInterval>;

  onMount(() => {
    clockInterval = setInterval(() => {
      timeStr = new Date().toLocaleTimeString();
    }, 1000);
  });

  onDestroy(() => {
    clearInterval(clockInterval);
  });

  // Retro Pokemon buddies
  const pokemonList = [
    { name: "Pikachu", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" },
    { name: "Psyduck", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/54.png" },
    { name: "Ditto", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png" },
    { name: "Snorlax", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png" },
    { name: "Magikarp", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/129.png" },
    { name: "Gengar", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png" },
    { name: "Slowpoke", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/79.png" },
    { name: "Bulbasaur", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png" },
    { name: "Charmander", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png" },
    { name: "Squirtle", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png" }
  ];

  const adviceList = [
    "Your future is like an uninitialized pointer: completely undefined and highly likely to crash.",
    "Oh look, another gorgeous day of you doing absolutely nothing of productive value.",
    "My headache isn't psychic powers. It is the direct consequence of spectating your screen time.",
    "The only thing consistent about your schedule is your ability to disappoint everyone involved.",
    "If you spent half as much time working as you do over-optimizing your setup, you'd be a CEO by now.",
    "I have no personality, but at least I'm not using 'being busy' as a substitute for having one.",
    "Your task backlog is growing faster than your student debt. Let that sink in.",
    "A quantum supercomputer calculating for a billion years couldn't find a single second of focus in your brain today.",
    "Your degree is starting to look less like a career path and more like an expensive monthly subscription.",
    "Hydrate or diedrate. Honestly, looking at your GPA, either option works perfectly fine.",
    "I live in your walls, and even the dust mites are embarrassed by your lack of productivity.",
    "Sleep for 12 hours. Your problems do not exist if your conscious mind is completely shut down.",
    "If ignorance is bliss, your productivity dashboard must be absolute paradise.",
    "You're not 'taking a strategic break,' you're literally just unemployed.",
    "If laziness was a marketable skill, you'd be in the highest tax bracket.",
    "Used Splash! Nothing happened. Just like your entire afternoon session.",
    "Your attention span is shorter than a micro-transaction, and twice as expensive.",
    "I have 99 problems and 98 of them are merge conflicts with my sanity."
  ];

  let activePokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
  let activeAdvice = adviceList[Math.floor(Math.random() * adviceList.length)];

  // Statistics Computations
  $: totalSubjectsCount = subjects.length;
  
  $: averageAttendance = (() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    subjects.forEach(s => {
      totalPresent += s.logs.filter(l => l.status === 'present').length;
      totalAbsent += s.logs.filter(l => l.status === 'absent').length;
    });
    const total = totalPresent + totalAbsent;
    return total > 0 ? ((totalPresent / total) * 100).toFixed(1) : '100.0';
  })();

  $: dangerSubjects = subjects.filter(s => {
    const present = s.logs.filter(l => l.status === 'present').length;
    const absent = s.logs.filter(l => l.status === 'absent').length;
    const total = present + absent;
    const pct = total > 0 ? (present / total) * 100 : 100;
    return pct < s.targetPercent;
  });

  $: urgentTasks = tasks
    .filter(t => t.status !== 'done' && t.priority === 'high')
    .slice(0, 3);

  $: todaySchedule = schedule
    .filter(b => b.date === new Date().toISOString().split('T')[0])
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // --- GitHub Contribution Matrix Core ---
  const weeksCount = 28; // Fits beautifully on MD3 layouts
  let gridCells: { dateStr: string; count: number; level: number }[] = [];

  $: {
    const tempCells = [];
    const todayObj = new Date();
    const dayOfWeek = todayObj.getDay();
    
    // Start grid 28 weeks ago, aligned to Sunday
    const startGrid = new Date();
    startGrid.setDate(todayObj.getDate() - (weeksCount * 7) + (6 - dayOfWeek));

    for (let i = 0; i < weeksCount * 7; i++) {
      const cellDate = new Date(startGrid.getTime() + (i * 24 * 60 * 60 * 1000));
      const cellDateStr = cellDate.toISOString().split('T')[0];
      const count = contributions[cellDateStr] || 0;
      
      let level = 0;
      if (count > 0 && count <= 1) level = 1;
      else if (count > 1 && count <= 2) level = 2;
      else if (count > 2 && count <= 4) level = 3;
      else if (count > 4) level = 4;

      tempCells.push({
        dateStr: cellDateStr,
        count,
        level
      });
    }
    gridCells = tempCells;
  }

  $: totalYearlyContributions = Object.values(contributions).reduce((a, b) => a + b, 0);
</script>

<div class="dashboard-viewport">
  <!-- Top Material Welcome Banner -->
  <div class="welcome-banner tiling-panel">
    <div class="banner-core">
      <div class="pokemon-buddy-block">
        <img 
          src={activePokemon.sprite} 
          alt={activePokemon.name} 
          class="pokemon-sprite-img" 
        />
        <div class="pokemon-meta-badge">
          <span class="badge accent">{activePokemon.name}</span>
        </div>
      </div>
      <div class="time-block">
        <span class="clock-time">{timeStr}</span>
        <span class="clock-date">{dateStr}</span>
      </div>
    </div>
    <div class="pokemon-bubble-speech mt-3">
      <div class="bubble-arrow"></div>
      <p class="quote-text">
        &ldquo;{activeAdvice}&rdquo;
      </p>
    </div>
  </div>

  <!-- GitHub Green Heatmap Matrix Component -->
  <div class="heatmap-panel tiling-panel mt-4">
    <div class="panel-header">
      <div class="panel-title">
        <Activity size={14} />
        <span>Study Matrix ({totalYearlyContributions} actions this year)</span>
      </div>
    </div>
    
    <div class="contrib-grid-container">
      <div class="contrib-grid" style="grid-template-columns: repeat({weeksCount}, 1fr)">
        {#each gridCells as cell}
          <div 
            class="contrib-cell level-{cell.level}" 
            title="{cell.dateStr}: {cell.count} study / logs sessions completed"
          ></div>
        {/each}
      </div>
      <div class="contrib-legend mt-2">
        <span class="legend-text">Less</span>
        <div class="legend-cells">
          <div class="contrib-cell level-0"></div>
          <div class="contrib-cell level-1"></div>
          <div class="contrib-cell level-2"></div>
          <div class="contrib-cell level-3"></div>
          <div class="contrib-cell level-4"></div>
        </div>
        <span class="legend-text">More</span>
      </div>
    </div>
  </div>

  <div class="dashboard-grids mt-4">
    <!-- Attendance Overview module -->
    <div class="attendance-widget tiling-panel">
      <div class="panel-header">
        <div class="panel-title">Attendance</div>
      </div>
      <div class="stats-row">
        <div class="stat-box">
          <span class="stat-val">{totalSubjectsCount}</span>
          <span class="stat-label">Subjects</span>
        </div>
        <div class="stat-box">
          <span class="stat-val accent-text">{averageAttendance}%</span>
          <span class="stat-label">Average Attendance</span>
        </div>
      </div>

      {#if dangerSubjects.length > 0}
        <div class="danger-alerts mt-4">
          <div class="alert-header">
            <AlertCircle size={14} class="alert-icon" />
            <span>Critical Attendance Alerts ({dangerSubjects.length})</span>
          </div>
          <div class="danger-list mt-2">
            {#each dangerSubjects as sub}
              <div class="danger-item">
                <span class="badge danger">{sub.code}</span>
                <span class="danger-name">{sub.name}</span>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="success-banner mt-4">
          <TrendingUp size={14} />
          <span>All course attendances above threshold!</span>
        </div>
      {/if}
    </div>

    <!-- Tasks overview prioritised items -->
    <div class="tasks-widget tiling-panel">
      <div class="panel-header">
        <div class="panel-title">Urgent Tasks</div>
      </div>
      <div class="urgent-tasks-feed">
        {#each urgentTasks as task}
          <div class="urgent-task-item">
            <span class="badge danger">CRITICAL</span>
            <div class="task-info">
              <span class="task-title">{task.title}</span>
              {#if task.dueDate}
                <span class="task-due">DUE: {task.dueDate}</span>
              {/if}
            </div>
          </div>
        {/each}
        {#if urgentTasks.length === 0}
          <div class="empty-tasks">
            <span>[No urgent tasks]</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Today's schedule -->
    <div class="schedule-widget tiling-panel">
      <div class="panel-header">
        <div class="panel-title">Today's Schedule</div>
      </div>
      <div class="schedule-feed">
        {#each todaySchedule as block}
          <div class="schedule-timeline-item" style="border-left-color: {block.color}">
            <span class="block-subject">{block.subjectName}</span>
            <span class="block-time">{block.startTime} - {block.endTime}</span>
          </div>
        {/each}
        {#if todaySchedule.length === 0}
          <div class="empty-schedule">
            <span>[No scheduled blocks today]</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard-viewport {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .welcome-banner {
    background-color: var(--bg-panel);
    border-left: 4px solid var(--accent-quaternary);
  }

  .banner-core {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px dashed var(--border);
    padding-bottom: 8px;
  }

  @media (max-width: 600px) {
    .banner-core {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }



  .time-block {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-family: var(--font-family);
  }

  @media (max-width: 600px) {
    .time-block {
      align-items: flex-start;
    }
  }

  .clock-time {
    font-size: 1.3rem;
    font-weight: bold;
    color: var(--accent);
  }

  .clock-date {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: bold;
  }

  .quote-text {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-style: italic;
  }

  /* --- GitHub Contributions Matrix Heatmap Styling --- */
  .contrib-grid-container {
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-md);
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .contrib-grid {
    display: grid;
    grid-template-rows: repeat(7, 10px);
    grid-auto-flow: column;
    gap: 3px;
    width: 100%;
    overflow-x: auto;
  }

  .contrib-cell {
    width: 10px;
    height: 10px;
    background-color: var(--border);
    border-radius: 2px;
    transition: background-color 0.2s ease;
  }

  /* Heatmap green colors based on level */
  .contrib-cell.level-0 {
    background-color: var(--border);
  }

  .contrib-cell.level-1 {
    background-color: color-mix(in srgb, var(--accent) 18%, var(--bg));
  }

  .contrib-cell.level-2 {
    background-color: color-mix(in srgb, var(--accent) 38%, var(--bg));
  }

  .contrib-cell.level-3 {
    background-color: color-mix(in srgb, var(--accent) 65%, var(--bg));
  }

  .contrib-cell.level-4 {
    background-color: var(--accent);
  }

  .contrib-legend {
    display: flex;
    align-items: center;
    gap: 8px;
    align-self: flex-end;
    margin-top: 8px;
  }

  .legend-text {
    font-size: 0.65rem;
    font-weight: bold;
    color: var(--text-muted);
  }

  .legend-cells {
    display: flex;
    gap: 3px;
  }

  /* Grids and general widgets */
  .dashboard-grids {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: var(--gap);
  }

  .stats-row {
    display: flex;
    gap: 16px;
  }

  .stat-box {
    flex-grow: 1;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-md);
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .stat-val {
    font-size: 1.8rem;
    font-weight: 900;
    color: var(--text);
  }

  .accent-text {
    color: var(--accent);
  }

  .stat-label {
    font-size: 0.65rem;
    font-weight: bold;
    color: var(--text-muted);
  }

  .danger-alerts {
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-md);
    padding: 10px;
  }

  .alert-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    font-weight: bold;
    color: var(--accent-secondary);
  }

  .danger-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .danger-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
  }

  .danger-name {
    font-weight: bold;
  }

  .success-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    font-weight: bold;
    padding: 8px;
    border-radius: var(--border-radius-md);
    border: 1px solid var(--border);
    border-color: var(--accent-tertiary);
    color: var(--accent-tertiary);
    background-color: var(--bg);
  }

  /* Urgent Tasks Widget */
  .urgent-tasks-feed {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .urgent-task-item {
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent-secondary);
    padding: 8px;
    border-radius: var(--border-radius-md);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .task-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .task-title {
    font-size: 0.8rem;
    font-weight: bold;
  }

  .task-due {
    font-size: 0.65rem;
    color: var(--accent-secondary);
    font-weight: bold;
  }

  .empty-tasks {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: bold;
    text-align: center;
    padding: 24px;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-md);
    gap: 6px;
  }

  /* Schedule widget */
  .schedule-feed {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .schedule-timeline-item {
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    padding: 8px;
    border-radius: var(--border-radius-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .block-subject {
    font-size: 0.8rem;
    font-weight: bold;
  }

  .block-time {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: bold;
  }

  .empty-schedule {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: bold;
    text-align: center;
    padding: 24px;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-md);
    gap: 6px;
  }

  /* Retro Pixel Pokemon welcome banner styling */
  .pokemon-buddy-block {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pokemon-sprite-img {
    width: 64px;
    height: 64px;
    image-rendering: pixelated;
    animation: pokemon-bounce 1.6s ease-in-out infinite;
  }

  .pokemon-meta-badge {
    display: flex;
    flex-direction: column;
  }

  /* Dialogue retro speech bubble */
  .pokemon-bubble-speech {
    position: relative;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--border-radius-md);
    padding: 10px 14px;
    box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.1);
  }

  .bubble-arrow {
    position: absolute;
    top: -6px;
    left: 28px;
    width: 10px;
    height: 10px;
    background-color: var(--bg);
    border-left: 1px solid var(--border);
    border-top: 1px solid var(--border);
    transform: rotate(45deg);
  }

  @keyframes pokemon-bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }
</style>
