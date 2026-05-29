<script lang="ts">
  import { 
    Plus, 
    Trash2, 
    Check, 
    X, 
    BookOpen,
    Smile,
    Activity,
    Award
  } from 'lucide-svelte';
  import type { Subject, AttendanceLog, AttendanceStatus } from '../types';

  export let subjects: Subject[] = [];

  // Toggle Mode: 'course' or 'self'
  let activeTab: 'course' | 'self' = 'course';

  // Academic Class Form State
  let newCode = '';
  let newClassName = '';
  let newTarget = 75;

  // Self-Study Form State
  let newSelfName = '';
  let newSelfColor = '#7dcfff';

  function addAcademic() {
    if (!newClassName.trim() || !newCode.trim()) return;
    const newSub: Subject = {
      id: crypto.randomUUID(),
      name: newClassName.trim(),
      code: newCode.trim().toUpperCase(),
      targetPercent: newTarget,
      logs: [],
      isCourse: true,
      color: `hsl(${Math.floor(Math.random() * 360)}, 65%, 70%)`
    };
    subjects = [...subjects, newSub];
    newCode = '';
    newClassName = '';
    newTarget = 75;
  }

  function addSelfStudy() {
    if (!newSelfName.trim()) return;
    const newSub: Subject = {
      id: crypto.randomUUID(),
      name: newSelfName.trim(),
      code: 'SELF',
      targetPercent: 0,
      logs: [],
      isCourse: false,
      color: newSelfColor
    };
    subjects = [...subjects, newSub];
    newSelfName = '';
  }

  function deleteSubject(id: string) {
    if (confirm('Delete this category?')) {
      subjects = subjects.filter(s => s.id !== id);
    }
  }

  function logAttendance(subjectId: string, status: AttendanceStatus) {
    subjects = subjects.map(s => {
      if (s.id === subjectId) {
        const newLog: AttendanceLog = {
          id: crypto.randomUUID(),
          date: new Date().toISOString().split('T')[0],
          status
        };
        return {
          ...s,
          logs: [newLog, ...s.logs]
        };
      }
      return s;
    });
    document.dispatchEvent(new CustomEvent('workspace_activity_logged'));
  }

  function deleteLog(subjectId: string, logId: string) {
    subjects = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          logs: s.logs.filter(l => l.id !== logId)
        };
      }
      return s;
    });
  }

  function calculateMetrics(sub: Subject) {
    const present = sub.logs.filter(l => l.status === 'present').length;
    const absent = sub.logs.filter(l => l.status === 'absent').length;
    const total = present + absent;
    const percentage = total > 0 ? (present / total) * 100 : 100;
    const isSafe = percentage >= sub.targetPercent;
    
    let classesToSkip = 0;
    let classesToAttend = 0;
    
    if (isSafe) {
      const targetRatio = sub.targetPercent / 100;
      classesToSkip = Math.floor((present / targetRatio) - total);
      classesToSkip = Math.max(0, classesToSkip);
    } else {
      const targetRatio = sub.targetPercent / 100;
      classesToAttend = Math.ceil((targetRatio * total - present) / (1 - targetRatio));
      classesToAttend = Math.max(0, classesToAttend);
    }

    return {
      percentage: percentage.toFixed(1),
      total,
      present,
      absent,
      isSafe,
      classesToSkip,
      classesToAttend
    };
  }

  // Filter Categories
  $: enrolledClasses = subjects.filter(s => s.isCourse !== false);
  $: selfStudies = subjects.filter(s => s.isCourse === false);
</script>

<div class="attendance-tracker-layout">
  <!-- Unified Category Scaffolder Card -->
  <div class="create-subject-card tiling-panel mb-4">
    <div class="category-tabs mb-4">
      <button class={activeTab === 'course' ? 'active' : ''} on:click={() => activeTab = 'course'}>Classes</button>
      <button class={activeTab === 'self' ? 'active' : ''} on:click={() => activeTab = 'self'}>Self-Study</button>
    </div>

    {#if activeTab === 'course'}
      <!-- Academic course creator -->
      <div class="form-grid">
        <div class="form-group">
          <label for="sub-code">Code</label>
          <input id="sub-code" type="text" placeholder="CS-301" bind:value={newCode} />
        </div>
        <div class="form-group">
          <label for="sub-name">Class Name</label>
          <input id="sub-name" type="text" placeholder="Data Structures" bind:value={newClassName} />
        </div>
        <div class="form-group">
          <label for="sub-target">Target %</label>
          <input id="sub-target" type="number" min="0" max="100" bind:value={newTarget} />
        </div>
      </div>
      <button class="primary mt-4" on:click={addAcademic}>
        <Plus size={14} />
        <span>Add</span>
      </button>
    {:else}
      <!-- Custom self-study category creator -->
      <div class="form-grid-self">
        <div class="form-group">
          <label for="self-name">Category Name</label>
          <input id="self-name" type="text" placeholder="Go Programming" bind:value={newSelfName} />
        </div>
        <div class="form-group">
          <label for="self-color">Color</label>
          <div class="color-picker-row">
            <input id="self-color" type="color" bind:value={newSelfColor} class="color-box-input" />
            <span class="color-val-label">{newSelfColor.toUpperCase()}</span>
          </div>
        </div>
      </div>
      <button class="primary mt-4" on:click={addSelfStudy}>
        <Plus size={14} />
        <span>Add</span>
      </button>
    {/if}
  </div>

  <!-- Active List -->
  <div class="categories-container-grid">
    
    <!-- Enrolled Classes Column -->
    <div class="class-column">
      <h3 class="col-title"><BookOpen size={16} /> Classes ({enrolledClasses.length})</h3>
      
      <div class="cards-feed mt-2">
        {#each enrolledClasses as sub}
          {@const metrics = calculateMetrics(sub)}
          <div class="subject-card tiling-panel mb-3" style="border-left-color: {metrics.isSafe ? 'var(--success)' : 'var(--danger)'}">
            <div class="subject-card-header">
              <div class="sub-meta">
                <span class="badge accent">{sub.code}</span>
                <h4 class="sub-name mt-1">{sub.name}</h4>
              </div>
              <button class="delete-sub-btn" on:click={() => deleteSubject(sub.id)}>
                <Trash2 size={12} />
              </button>
            </div>

            <div class="subject-card-body mt-3">
              <div class="percentage-dial">
                <span class="pct-num {metrics.isSafe ? 'safe-text' : 'danger-text'}">{metrics.percentage}%</span>
                <span class="pct-label">Attended</span>
              </div>
              
              <div class="quick-logs">
                <div class="quick-actions-row">
                  <button class="success-btn" on:click={() => logAttendance(sub.id, 'present')}>
                    <Check size={12} />
                    <span>Present</span>
                  </button>
                  <button class="danger-btn" on:click={() => logAttendance(sub.id, 'absent')}>
                    <X size={12} />
                    <span>Absent</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Smart Forecast -->
            <div class="smart-buffer-box mt-3 {metrics.isSafe ? 'safe-bg' : 'danger-bg'}">
              {#if metrics.isSafe}
                <span class="buffer-desc">Skip Buffer: {metrics.classesToSkip}</span>
              {:else}
                <span class="buffer-desc danger">Deficit: {metrics.classesToAttend}</span>
              {/if}
            </div>

            <!-- Mini logs -->
            {#if sub.logs.length > 0}
              <div class="mini-logs mt-3">
                <div class="mini-list">
                  {#each sub.logs.slice(0, 3) as log}
                    <div class="mini-row">
                      <span class="log-date">{log.date}</span>
                      <span class="badge {log.status === 'present' ? 'success' : 'danger'}">{log.status}</span>
                      <button class="delete-log-btn" on:click={() => deleteLog(sub.id, log.id)}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
        {#if enrolledClasses.length === 0}
          <div class="empty-placeholder">[No classes registered]</div>
        {/if}
      </div>
    </div>

    <!-- Self-Study Column -->
    <div class="self-column">
      <h3 class="col-title"><Activity size={16} /> Self-Study Topics ({selfStudies.length})</h3>
      
      <div class="cards-feed mt-2">
        {#each selfStudies as sub}
          <div class="self-study-card tiling-panel mb-3" style="border-left-color: {sub.color}">
            <div class="self-card-header">
              <div class="self-meta">
                <span class="self-dot" style="background-color: {sub.color}"></span>
                <h4 class="self-name">{sub.name}</h4>
              </div>
              <button class="delete-sub-btn" on:click={() => deleteSubject(sub.id)}>
                <Trash2 size={12} />
              </button>
            </div>
            <div class="self-card-footer mt-2">
              <span class="self-stats-desc">[Active]</span>
            </div>
          </div>
        {/each}
        {#if selfStudies.length === 0}
          <div class="empty-placeholder">[No custom study categories]</div>
        {/if}
      </div>
    </div>

  </div>
</div>

<style>
  .attendance-tracker-layout {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .category-tabs {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }

  .category-tabs button {
    border: none;
    background: none;
    border-radius: 0;
    padding: 6px 12px;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .category-tabs button.active {
    color: var(--accent);
    border-bottom: 2px solid var(--accent);
    font-weight: bold;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 12px;
  }

  .form-grid-self {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 12px;
  }

  @media (max-width: 600px) {
    .form-grid-self {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-group label {
    font-size: 0.68rem;
    font-weight: bold;
    color: var(--text-muted);
  }

  .color-picker-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-box-input {
    width: 32px;
    height: 32px;
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    background: none;
    padding: 0;
  }

  .color-val-label {
    font-size: 0.75rem;
    font-weight: bold;
    color: var(--text-muted);
  }

  .categories-container-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--gap);
  }

  @media (max-width: 900px) {
    .categories-container-grid {
      grid-template-columns: 1fr;
    }
  }

  .col-title {
    font-size: 0.95rem;
    font-weight: bold;
    color: var(--accent);
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px dashed var(--border);
    padding-bottom: 6px;
  }

  .subject-card {
    border-left: 4px solid var(--border);
  }

  .subject-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .sub-name {
    margin-bottom: 0;
  }

  .delete-sub-btn {
    background: none;
    border: none;
    padding: 4px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .delete-sub-btn:hover {
    color: var(--accent-secondary);
  }

  .subject-card-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .percentage-dial {
    display: flex;
    flex-direction: column;
  }

  .pct-num {
    font-size: 1.8rem;
    font-weight: 900;
    line-height: 1.1;
  }

  .pct-num.safe-text {
    color: var(--accent-tertiary);
  }

  .pct-num.danger-text {
    color: var(--accent-secondary);
  }

  .pct-label {
    font-size: 0.6rem;
    color: var(--text-muted);
    font-weight: bold;
  }

  .quick-actions-row {
    display: flex;
    gap: 6px;
  }

  .success-btn {
    border-color: var(--success);
    color: var(--success);
  }

  .success-btn:hover {
    background-color: var(--success);
    color: var(--bg-panel);
  }

  .danger-btn {
    border-color: var(--danger);
    color: var(--danger);
  }

  .danger-btn:hover {
    background-color: var(--danger);
    color: var(--bg-panel);
  }

  .smart-buffer-box {
    border-radius: var(--border-radius-md);
    padding: 6px 10px;
    font-size: 0.72rem;
    border: 1px solid var(--border);
  }

  .smart-buffer-box.safe-bg {
    background-color: rgba(163, 190, 140, 0.05);
    border-color: rgba(163, 190, 140, 0.2);
    color: var(--accent-tertiary);
  }

  .smart-buffer-box.danger-bg {
    background-color: rgba(191, 97, 106, 0.05);
    border-color: rgba(191, 97, 106, 0.2);
    color: var(--accent-secondary);
  }

  .mini-logs {
    border-top: 1px dashed var(--border);
    padding-top: 8px;
  }

  .mini-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mini-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.68rem;
  }

  .delete-log-btn {
    background: none;
    border: none;
    padding: 2px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .delete-log-btn:hover {
    color: var(--accent-secondary);
  }

  .empty-placeholder {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: center;
    padding: 16px;
    background-color: var(--bg-panel);
    border: 1px dashed var(--border);
    border-radius: var(--border-radius-md);
  }

  /* Self study card specs */
  .self-study-card {
    border-left: 4px solid var(--border);
  }

  .self-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .self-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .self-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .self-name {
    margin-bottom: 0;
  }

  .self-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.68rem;
    color: var(--text-muted);
  }
</style>
