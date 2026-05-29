<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    CloudLightning, 
    LogOut, 
    Trash2, 
    FileJson, 
    CheckCircle2, 
    AlertTriangle,
    RefreshCw,
    Settings
  } from 'lucide-svelte';
  import type { DashboardBackup } from '../types';

  export let onRestore: (data: DashboardBackup) => void;
  export let onGetBackupData: () => DashboardBackup;

  let clientId = '';
  let tokenClient: any = null;
  let accessToken = '';
  let status: 'idle' | 'authorizing' | 'success' | 'error' | 'syncing' = 'idle';
  let message = '';
  let showAdvanced = false;
  
  onMount(() => {
    clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    accessToken = sessionStorage.getItem('gdrive_access_token') || '';
    if (clientId) {
      initTokenClient();
    }
    
    // Auto-restore on startup if already signed in
    if (accessToken) {
      triggerRestore(true);
    }
  });

  function initTokenClient() {
    try {
      if (typeof window !== 'undefined' && (window as any).google) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
          callback: (resp: any) => {
            if (resp.error) {
              status = 'error';
              message = 'Failed';
              return;
            }
            accessToken = resp.access_token;
            sessionStorage.setItem('gdrive_access_token', accessToken);
            // Immediately restore data on new authorization
            triggerRestore(true);
          }
        });
      }
    } catch (e: any) {
      status = 'error';
      message = 'Failed';
    }
  }

  function handleAuthorize() {
    if (!clientId) {
      message = 'Missing VITE_GOOGLE_CLIENT_ID in .env';
      status = 'error';
      return;
    }
    if (!tokenClient) initTokenClient();

    if (tokenClient) {
      status = 'authorizing';
      message = 'Authorizing';
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      status = 'error';
      message = 'Offline';
    }
  }

  async function findBackupFile(): Promise<string | null> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='workspace_backup.json' and trashed=false`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) {
      if (response.status === 401) {
        handleLogout();
        throw new Error('Unauthorized');
      }
      throw new Error('Sync Failed');
    }
    const data = await response.json();
    return (data.files && data.files.length > 0) ? data.files[0].id : null;
  }

  let backupTimeout: ReturnType<typeof setTimeout>;

  export function requestBackup() {
    if (!accessToken || status === 'authorizing') return;
    clearTimeout(backupTimeout);
    // 1 second debounce for immediate but safe backup
    backupTimeout = setTimeout(() => {
      if (accessToken) triggerBackup(true);
    }, 1000); 
  }

  async function triggerBackup(silent = false) {
    if (!accessToken) return;

    if (!silent) {
      status = 'syncing';
      message = 'Syncing...';
    }

    try {
      const backupData = onGetBackupData();
      const fileId = await findBackupFile();
      const metadata = { name: 'workspace_backup.json', mimeType: 'application/json' };
      const boundary = 'foo_bar_baz';
      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (fileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
      }

      const multipartRequestBody =
        `\r\n--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        JSON.stringify(backupData) +
        `\r\n--${boundary}--`;

      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!response.ok) throw new Error('Failed');

      if (!silent) {
        status = 'success';
        message = 'Saved';
      }
    } catch (err: any) {
      if (!silent) {
        status = 'error';
        message = 'Failed';
      }
    }
  }

  async function triggerRestore(silent = false) {
    if (!accessToken) return;

    if (!silent) {
      status = 'syncing';
      message = 'Restoring...';
    }

    try {
      const fileId = await findBackupFile();
      if (!fileId) {
        if (!silent) {
          status = 'success';
          message = 'New Cloud Profile'; // No file yet, which is fine
          setTimeout(() => { if (status === 'success') status = 'idle'; }, 2000);
        }
        return;
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) throw new Error('Failed');

      const restoreData = await response.json();
      onRestore(restoreData);
      if (!silent) {
        status = 'success';
        message = 'Restored';
      }
    } catch (err: any) {
      if (!silent) {
        status = 'error';
        message = 'Failed';
      }
    }
  }

  // --- New Data Management Features ---

  function handleLogout() {
    if (accessToken && typeof window !== 'undefined' && (window as any).google) {
      (window as any).google.accounts.oauth2.revoke(accessToken, () => {
        // Token formally revoked on Google's end
      });
    }
    sessionStorage.removeItem('gdrive_access_token');
    accessToken = '';
    status = 'idle';
    message = '';
    showAdvanced = false;
  }

  function handleViewData() {
    const data = onGetBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace_preview_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDeleteData() {
    if (!accessToken) return;
    if (!confirm('Are you sure you want to permanently delete your cloud backup? Your local data will remain intact.')) return;
    
    status = 'syncing';
    message = 'Deleting...';
    
    try {
      const fileId = await findBackupFile();
      if (fileId) {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          { 
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` } 
          }
        );
        if (!response.ok) throw new Error('Failed to delete');
      }
      status = 'success';
      message = 'Cloud Data Deleted';
      setTimeout(() => { if (status === 'success') status = 'idle'; }, 3000);
    } catch (err) {
      status = 'error';
      message = 'Delete Failed';
    }
  }
</script>

<div class="gdrive-sync-panel">
  <div class="sync-header">
    <div class="header-left">
      <CloudLightning size={16} class="accent-icon" />
      <span class="title">Cloud Sync</span>
    </div>
  </div>

  <div class="sync-controls mt-2">
    {#if !accessToken}
      <button class="primary auth-btn" on:click={handleAuthorize}>
        <RefreshCw size={14} />
        <span>Authorize with Google</span>
      </button>
    {:else}
      {#if !showAdvanced}
        <button class="manage-btn advanced-btn" on:click={() => showAdvanced = true}>
          <Settings size={14} />
          <span>Manage Cloud Data</span>
        </button>
      {:else}
        <div class="manage-actions">
          <button class="manage-btn view-btn" on:click={handleViewData}>
            <FileJson size={14} />
            <span>Download Current Data</span>
          </button>
          <button class="manage-btn logout-btn" on:click={handleLogout}>
            <LogOut size={14} />
            <span>Disconnect Drive</span>
          </button>
          <button class="manage-btn delete-btn" on:click={handleDeleteData}>
            <Trash2 size={14} />
            <span>Delete Cloud Backup</span>
          </button>
          <button class="manage-btn collapse-btn" on:click={() => showAdvanced = false}>
            <span>Cancel</span>
          </button>
        </div>
      {/if}
    {/if}
  </div>

  {#if message}
    <div class="status-msg mt-3 {status}">
      {#if status === 'success'}
        <CheckCircle2 size={12} />
      {:else if status === 'error'}
        <AlertTriangle size={12} />
      {:else}
        <span class="spinner"></span>
      {/if}
      <span>{message}</span>
    </div>
  {/if}
</div>

<style>
  .gdrive-sync-panel {
    background-color: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: 14px;
    box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.15);
  }

  .sync-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .title {
    font-weight: bold;
    font-size: 0.85rem;
    color: var(--accent);
    letter-spacing: 0.05em;
  }

  .sync-controls {
    display: flex;
    justify-content: center;
  }

  .auth-btn {
    width: 100%;
    font-size: 0.75rem;
  }

  .manage-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .manage-btn {
    width: 100%;
    font-size: 0.75rem;
    justify-content: flex-start;
  }
  
  .logout-btn {
    border-color: var(--border);
    color: var(--text-muted);
  }
  .logout-btn:hover {
    color: var(--text);
    border-color: var(--text);
    background-color: transparent;
  }

  .delete-btn {
    border-color: var(--accent-secondary);
    color: var(--accent-secondary);
  }
  .delete-btn:hover {
    background-color: var(--accent-secondary);
    color: var(--bg-panel);
  }

  .view-btn {
    border-color: var(--accent);
    color: var(--accent);
  }
  .view-btn:hover {
    background-color: var(--accent);
    color: var(--bg-panel);
  }

  .advanced-btn {
    border-color: var(--border);
    color: var(--text);
  }
  .advanced-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .collapse-btn {
    border-color: var(--border);
    color: var(--text-muted);
  }
  .collapse-btn:hover {
    color: var(--text);
    background-color: transparent;
  }

  .status-msg {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: bold;
    padding: 6px 10px;
    border-radius: var(--border-radius);
    border: 1px solid var(--border);
    background-color: var(--bg);
  }

  .status-msg.success {
    border-color: var(--accent-tertiary);
    color: var(--accent-tertiary);
  }

  .status-msg.error {
    border-color: var(--accent-secondary);
    color: var(--accent-secondary);
  }

  .status-msg.syncing, .status-msg.authorizing {
    border-color: var(--accent-quaternary);
    color: var(--accent-quaternary);
  }

  .spinner {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 2px solid var(--accent-quaternary);
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
