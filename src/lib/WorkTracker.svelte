<script lang="ts">
  import { 
    Plus, 
    Trash2, 
    ChevronRight, 
    ChevronLeft, 
    Folder, 
    Calendar,
    AlertCircle,
    CheckCircle,
    ListTodo
  } from 'lucide-svelte';
  import type { Task, Project, TaskStatus, TaskPriority, Subject } from '../types';

  export let tasks: Task[] = [];
  export let projects: Project[] = [];
  export let subjects: Subject[] = [];

  // Create Task State
  let newTitle = '';
  let newDesc = '';
  let newProjectId = '';
  let newSubjectId = '';
  let newPriority: TaskPriority = 'medium';
  let newDueDate = '';

  // Create Project State
  let newProjectName = '';
  let newProjectColor = '#7dcfff';
  let showProjectCreate = false;

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'todo', label: 'Backlog', color: '#565f89' },
    { id: 'inprogress', label: 'Active', color: '#7dcfff' },
    { id: 'review', label: 'Review', color: '#bb9af3' },
    { id: 'done', label: 'Done', color: '#9ece6a' },
  ];

  function addTask() {
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      projectId: newProjectId || undefined,
      subjectId: newSubjectId || undefined,
      status: 'todo',
      priority: newPriority,
      dueDate: newDueDate || undefined
    };

    tasks = [...tasks, newTask];
    newTitle = '';
    newDesc = '';
    newProjectId = '';
    newSubjectId = '';
    newPriority = 'medium';
    newDueDate = '';
  }

  function addProject() {
    if (!newProjectName.trim()) return;
    
    const newProj: Project = {
      id: crypto.randomUUID(),
      name: newProjectName.trim().toUpperCase(),
      color: newProjectColor
    };

    projects = [...projects, newProj];
    newProjectName = '';
    showProjectCreate = false;
  }

  function deleteProject(id: string) {
    if (confirm('Deleting this project will unassign all its tasks. Proceed?')) {
      projects = projects.filter(p => p.id !== id);
      tasks = tasks.map(t => t.projectId === id ? { ...t, projectId: undefined } : t);
    }
  }

  function deleteTask(id: string) {
    tasks = tasks.filter(t => t.id !== id);
  }

  function moveTask(id: string, direction: 'forward' | 'backward') {
    const statusOrder: TaskStatus[] = ['todo', 'inprogress', 'review', 'done'];
    tasks = tasks.map(t => {
      if (t.id === id) {
        const index = statusOrder.indexOf(t.status);
        let newIdx = index;
        if (direction === 'forward' && index < statusOrder.length - 1) {
          newIdx++;
        } else if (direction === 'backward' && index > 0) {
          newIdx--;
        }
        
        const nextStatus = statusOrder[newIdx];
        const completedDate = nextStatus === 'done' ? new Date().toISOString().split('T')[0] : undefined;

        return {
          ...t,
          status: nextStatus,
          completedDate
        };
      }
      return t;
    });
  }

  function getProject(id?: string) {
    return projects.find(p => p.id === id);
  }

  function getSubject(id?: string) {
    return subjects.find(s => s.id === id);
  }

  // Calculate project completeness stats
  $: totalCount = tasks.length;
  $: completedCount = tasks.filter(t => t.status === 'done').length;
  $: completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
</script>

<div class="work-tracker-container">
  <div class="tracker-sidebar-layout">
    <!-- Sidebar Projects list -->
    <div class="tracker-projects tiling-panel">
      <div class="panel-header">
        <div class="panel-title">Projects</div>
        <button class="action-btn" title="Create Project" on:click={() => showProjectCreate = !showProjectCreate}>
          <Plus size={14} />
        </button>
      </div>

      {#if showProjectCreate}
        <div class="project-form mb-4">
          <input type="text" placeholder="Project Name" bind:value={newProjectName} />
          <div class="color-picker-row mt-2">
            <label for="proj-col">Color:</label>
            <input id="proj-col" type="color" bind:value={newProjectColor} />
            <button class="primary" on:click={addProject}>Save</button>
          </div>
        </div>
      {/if}

      <div class="project-list">
        {#each projects as proj}
          <div class="project-item" style="border-left-color: {proj.color}">
            <div class="item-left">
              <Folder size={12} style="color: {proj.color}" />
              <span class="project-name">{proj.name}</span>
            </div>
            <button class="delete-proj-btn" on:click={() => deleteProject(proj.id)}>
              <Trash2 size={10} />
            </button>
          </div>
        {/each}
        {#if projects.length === 0}
          <span class="empty-text">[No custom projects]</span>
        {/if}
      </div>

      <!-- Simple visual SVG completion stats -->
      <div class="progress-block mt-4">
        <div class="flex-between mb-2">
          <span class="progress-label">Progress</span>
          <span class="pct-val">{completionRate.toFixed(0)}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width: {completionRate}%"></div>
        </div>
        <div class="counts-row mt-2">
          <span class="badge success">{completedCount} Done</span>
          <span class="badge warning">{totalCount - completedCount} Pending</span>
        </div>
      </div>
    </div>

    <!-- Task workspace Kanban board -->
    <div class="tracker-board">
      <!-- Task Scaffolder Form -->
      <div class="task-creator tiling-panel mb-4">
        <div class="panel-header">
          <div class="panel-title">New Task</div>
        </div>
        <div class="creator-inputs">
          <input type="text" placeholder="Task Title" bind:value={newTitle} class="title-input" />
          <input type="text" placeholder="Notes" bind:value={newDesc} class="desc-input" />
          
          <div class="metadata-row">
            <select bind:value={newProjectId}>
              <option value="">No Project</option>
              {#each projects as p}
                <option value={p.id}>{p.name}</option>
              {/each}
            </select>

            <select bind:value={newSubjectId}>
              <option value="">No Subject</option>
              {#each subjects as s}
                <option value={s.id}>{s.code} - {s.name}</option>
              {/each}
            </select>

            <select bind:value={newPriority}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            <input type="date" bind:value={newDueDate} />
            
            <button class="primary add-task-btn" on:click={addTask}>
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Kanban Column Grid -->
      <div class="kanban-board">
        {#each columns as col}
          {@const colTasks = tasks.filter(t => t.status === col.id)}
          <div class="kanban-column" style="border-top-color: {col.color}">
            <div class="column-header">
              <span class="badge" style="border-color: {col.color}; color: {col.color}">{col.label}</span>
              <span class="col-count">{colTasks.length}</span>
            </div>

            <div class="tasks-feed">
              {#each colTasks as task}
                {@const proj = getProject(task.projectId)}
                {@const sub = getSubject(task.subjectId)}
                <div class="task-card" style="border-left-color: {proj ? proj.color : 'var(--border)'}">
                  <div class="card-top">
                    {#if proj}
                      <span class="badge proj-tag" style="border-color: {proj.color}; color: {proj.color}">
                        {proj.name}
                      </span>
                    {/if}
                    {#if sub}
                      <span class="badge sub-tag">{sub.code}</span>
                    {/if}
                    <span class="badge priority-tag {task.priority}">{task.priority}</span>
                  </div>

                  <h4 class="task-card-title">{task.title}</h4>
                  {#if task.description}
                    <p class="task-card-desc">{task.description}</p>
                  {/if}

                  {#if task.dueDate}
                    <div class="task-due-row">
                      <Calendar size={10} />
                      <span>Due: {task.dueDate}</span>
                    </div>
                  {/if}

                  <div class="card-bottom mt-2">
                    <button class="icon-btn" on:click={() => moveTask(task.id, 'backward')} disabled={col.id === 'todo'}>
                      <ChevronLeft size={12} />
                    </button>
                    <button class="danger-icon-btn" on:click={() => deleteTask(task.id)}>
                      <Trash2 size={10} />
                    </button>
                    <button class="icon-btn" on:click={() => moveTask(task.id, 'forward')} disabled={col.id === 'done'}>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              {/each}
              {#if colTasks.length === 0}
                <div class="empty-col">No Tasks</div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .work-tracker-container {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .tracker-sidebar-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: var(--gap);
  }

  @media (max-width: 900px) {
    .tracker-sidebar-layout {
      grid-template-columns: 1fr;
    }
  }

  .action-btn {
    padding: 4px;
    background: none;
    border-color: var(--border);
  }

  .project-form {
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: 10px;
  }

  .project-form input[type="text"] {
    width: 100%;
  }

  .color-picker-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .color-picker-row input[type="color"] {
    border: none;
    background: none;
    width: 28px;
    height: 24px;
    cursor: pointer;
  }

  .project-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .project-item {
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    padding: 6px 10px;
    border-radius: var(--border-radius);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .project-name {
    font-size: 0.75rem;
    font-weight: bold;
    color: var(--text);
  }

  .delete-proj-btn {
    background: none;
    border: none;
    padding: 2px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .delete-proj-btn:hover {
    color: var(--accent-secondary);
  }

  .empty-text {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-align: center;
    margin-top: 10px;
  }

  /* Progress tracker */
  .progress-block {
    border-top: 1px dashed var(--border);
    padding-top: 14px;
  }

  .progress-label {
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--text-muted);
  }

  .progress-track {
    width: 100%;
    height: 6px;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background-color: var(--accent-tertiary);
    transition: width 0.3s ease;
  }

  .counts-row {
    display: flex;
    gap: 6px;
  }

  .counts-row span {
    font-size: 0.65rem;
  }

  /* Task Creator */
  .task-creator {
    background-color: var(--bg-panel);
  }

  .creator-inputs {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .title-input {
    font-size: 0.85rem;
    font-weight: bold;
  }

  .desc-input {
    font-size: 0.8rem;
  }

  .metadata-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) auto;
    gap: 6px;
    align-items: center;
  }

  .add-task-btn {
    height: 30px;
    font-size: 0.75rem;
  }

  /* Kanban Board columns */
  .kanban-board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--gap);
    align-items: flex-start;
  }

  @media (max-width: 1200px) {
    .kanban-board {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .kanban-board {
      /* On mobile, scroll horizontally through columns - much better UX than squashing */
      display: flex;
      overflow-x: auto;
      gap: var(--gap);
      padding-bottom: 8px;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
    }
    .kanban-column {
      min-width: 260px;
      scroll-snap-align: start;
      flex-shrink: 0;
    }
    .metadata-row {
      grid-template-columns: 1fr 1fr;
    }
    .kanban-column {
      min-height: 300px;
    }
  }

  .kanban-column {
    background-color: var(--bg-panel);
    border: 1px solid var(--border);
    border-top: 3px solid var(--border);
    border-radius: var(--border-radius);
    padding: 10px;
    min-height: 450px;
    display: flex;
    flex-direction: column;
  }

  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
    margin-bottom: 10px;
  }

  .col-count {
    font-size: 0.75rem;
    font-weight: bold;
    color: var(--text-muted);
  }

  .tasks-feed {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    flex-grow: 1;
  }

  .task-card {
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-left: 3px solid var(--border);
    border-radius: var(--border-radius);
    padding: 10px;
    box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card-top {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .proj-tag {
    font-size: 0.6rem;
  }

  .sub-tag {
    font-size: 0.6rem;
    color: var(--text);
  }

  .priority-tag {
    font-size: 0.6rem;
  }

  .priority-tag.high {
    border-color: var(--accent-secondary);
    color: var(--accent-secondary);
  }

  .priority-tag.medium {
    border-color: var(--accent-quaternary);
    color: var(--accent-quaternary);
  }

  .priority-tag.low {
    border-color: var(--accent-tertiary);
    color: var(--accent-tertiary);
  }

  .task-card-title {
    font-size: 0.8rem;
    font-weight: bold;
    color: var(--text);
  }

  .task-card-desc {
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.3;
  }

  .task-due-row {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.65rem;
    color: var(--accent-secondary);
    font-weight: bold;
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px dashed var(--border);
    padding-top: 6px;
  }

  .icon-btn {
    padding: 3px;
    background: none;
    border: 1px solid var(--border);
  }

  .danger-icon-btn {
    background: none;
    border: none;
    padding: 2px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .danger-icon-btn:hover {
    color: var(--accent-secondary);
  }

  .empty-col {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-align: center;
    margin: auto 0;
    font-style: italic;
  }
</style>
