<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Folder, 
    FileText, 
    FileImage, 
    BookOpen, 
    Save, 
    Plus, 
    Terminal, 
    Link,
    FileCheck
  } from 'lucide-svelte';
  import { vaultHandle, isFallbackModeStore, vaultFilesListStore } from './stores';

  interface VaultFile {
    name: string;
    path: string;
    kind: 'file' | 'directory';
    handle?: FileSystemFileHandle;
    file?: File;
    extension: string;
  }


  let searchQuery = '';
  $: filteredFilesList = $vaultFilesListStore.filter(f => f.path.toLowerCase().includes(searchQuery.toLowerCase()));
  let selectedFile: VaultFile | null = null;
  let editorContent = '';
  let previewMode = false;
  let status: 'idle' | 'loading' | 'success' | 'error' | 'saving' = 'idle';
  let message = '';
  let pdfUrl = '';
  let imageUrl = '';
  let newFileName = '';
  let showCreateInput = false;

  // Render LaTeX inline and block basic math
  function parseMarkdown(text: string): string {
    if (!text) return '';
    
    // Escape HTML to prevent XSS
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // LaTeX blocks: $$ ... $$
    html = html.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, math) => {
      return `<div class="latex-block">⚡ [Math Block] ⚡<br><code>${math.trim()}</code></div>`;
    });

    // LaTeX inline: $ ... $
    html = html.replace(/\$([^\$]+)\$/g, (_, math) => {
      return `<code class="latex-inline">$${math}</code>`;
    });

    // Markdown headers
    html = html.replace(/^# (.*?)$/gm, '<h1># $1</h1>');
    html = html.replace(/^## (.*?)$/gm, '<h2>## $1</h2>');
    html = html.replace(/^### (.*?)$/gm, '<h3>### $1</h3>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Checkboxes
    html = html.replace(/- \[ \]/g, '<span class="md-check">[ ]</span>');
    html = html.replace(/- \[x\]/g, '<span class="md-check-done">[x]</span>');

    // Bullet list items
    html = html.replace(/^- (.*?)$/gm, '<li class="md-li">&bull; $1</li>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  async function linkVault() {
    try {
      status = 'loading';
      message = 'Requesting directory access...';
      
      if ('showDirectoryPicker' in window) {
        $vaultHandle = await (window as any).showDirectoryPicker();
        if ($vaultHandle) {
          $isFallbackModeStore = false;
          await scanVault();
          status = 'success';
          message = 'Obsidian Vault linked successfully!';
        }
      } else {
        // Fallback for Firefox/Safari
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        
        input.onchange = (e: any) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            $isFallbackModeStore = true;
            $vaultHandle = {} as any; // Dummy handle
            processFallbackFiles(files);
            status = 'success';
            message = 'Vault linked (Read-Only Mode for Firefox/Safari)!';
          } else {
            status = 'error';
            message = 'No files selected.';
          }
        };
        input.click();
      }
    } catch (err: any) {
      status = 'error';
      message = err.name === 'AbortError' ? 'Access request cancelled.' : `Error: ${err.message}`;
      $vaultHandle = null;
    }
  }

  function processFallbackFiles(files: FileList) {
    const list: VaultFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (['md', 'tex', 'pdf', 'png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
        list.push({
          name: file.name,
          path: file.webkitRelativePath || file.name,
          kind: 'file',
          file: file,
          extension: ext
        });
      }
    }
    $vaultFilesListStore = list.sort((a, b) => a.path.localeCompare(b.path));
  }

  async function scanVault() {
    if (!$vaultHandle) return;
    $vaultFilesListStore = await getFilesRecursively($vaultHandle);
  }

  async function getFilesRecursively(directory: FileSystemDirectoryHandle, path = ''): Promise<VaultFile[]> {
    const list: VaultFile[] = [];
    for await (const entry of (directory as any).values()) {
      const relPath = path ? `${path}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        const ext = entry.name.split('.').pop()?.toLowerCase() || '';
        if (['md', 'tex', 'pdf', 'png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
          list.push({
            name: entry.name,
            path: relPath,
            kind: 'file',
            handle: entry,
            extension: ext
          });
        }
      } else if (entry.kind === 'directory') {
        const subList = await getFilesRecursively(entry, relPath);
        list.push(...subList);
      }
    }
    return list.sort((a, b) => a.path.localeCompare(b.path));
  }

  async function selectFile(file: VaultFile) {
    // Clear old URLs
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      pdfUrl = '';
    }
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      imageUrl = '';
    }

    selectedFile = file;
    status = 'loading';
    previewMode = false;
    showCreateInput = false;

    try {
      let f: File;
      if (file.handle) {
        f = await file.handle.getFile();
      } else if (file.file) {
        f = file.file;
      } else {
        throw new Error('No file handle or object');
      }
      
      if (['md', 'tex'].includes(file.extension)) {
        editorContent = await f.text();
        status = 'idle';
      } else if (file.extension === 'pdf') {
        pdfUrl = URL.createObjectURL(f);
        status = 'idle';
      } else if (['png', 'jpg', 'jpeg', 'gif'].includes(file.extension)) {
        imageUrl = URL.createObjectURL(f);
        status = 'idle';
      }
    } catch (err: any) {
      status = 'error';
      message = `Failed to load file: ${err.message}`;
    }
  }

  async function saveFile() {
    if (!selectedFile) return;
    if ($isFallbackModeStore) {
      const blob = new Blob([editorContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.name;
      a.click();
      URL.revokeObjectURL(url);
      
      status = 'success';
      message = 'File downloaded! Please save it over your original file.';
      setTimeout(() => {
        if (status === 'success') status = 'idle';
      }, 3000);
      return;
    }
    status = 'saving';
    message = 'Saving file directly to local folder...';

    try {
      const writable = await (selectedFile.handle as any).createWritable();
      await writable.write(editorContent);
      await writable.close();
      
      status = 'success';
      message = 'Saved successfully to local disk!';
      setTimeout(() => {
        if (status === 'success') status = 'idle';
      }, 2000);
    } catch (err: any) {
      status = 'error';
      message = `Failed to save: ${err.message}`;
    }
  }

  async function createNewFile() {
    if (!$vaultHandle || !newFileName.trim()) return;
    
    let fileName = newFileName.trim();
    if (!fileName.endsWith('.md') && !fileName.endsWith('.tex')) {
      fileName += '.md'; // Default to Markdown
    }

    if ($isFallbackModeStore) {
      const newContent = '# ' + fileName.slice(0, -3) + '\n\n';
      const blob = new Blob([newContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      showCreateInput = false;
      newFileName = '';
      status = 'success';
      message = 'New file downloaded! Move it into your local folder.';
      setTimeout(() => {
        if (status === 'success') status = 'idle';
      }, 3000);
      return;
    }

    try {
      status = 'loading';
      const fileHandle = await $vaultHandle.getFileHandle(fileName, { create: true });
      showCreateInput = false;
      newFileName = '';
      
      await scanVault();
      
      // Auto select the new file
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const newVaultFile: VaultFile = {
        name: fileName,
        path: fileName,
        kind: 'file',
        handle: fileHandle,
        extension: ext
      };
      
      editorContent = '# ' + fileName.slice(0, -3) + '\n\n';
      selectedFile = newVaultFile;
      await saveFile();
      await scanVault();
    } catch (err: any) {
      status = 'error';
      message = `Failed to create file: ${err.message}`;
    }
  }
</script>

<div class="notes-explorer-container">
  {#if !$vaultHandle}
    <div class="unlinked-panel tiling-panel">
      <div class="panel-header">
        <div class="panel-title">OBSIDIAN / SYNCTHING VAULT</div>
      </div>
      <div class="unlinked-body">
        <Folder size={48} class="accent-icon mb-4" />
        <h3>Link Local Notes Directory</h3>
        <p class="mb-4">
          Directly select your local Obsidian / Syncthing notes folder. The dashboard reads, previews, and writes notes locally without using any server.
        </p>
        <button class="primary btn-large" on:click={linkVault}>
          <Link size={16} />
          <span>LINK NOTES FOLDER</span>
        </button>
      </div>
    </div>
  {:else}
    <div class="vault-workspace">
      <!-- File Tree Sidebar -->
      <div class="vault-sidebar tiling-panel">
        <div class="panel-header">
          <div class="panel-title">VAULT FILES</div>
          <button class="action-btn" title="Create New Note" on:click={() => showCreateInput = !showCreateInput}>
            <Plus size={14} />
          </button>
        </div>

        {#if showCreateInput}
          <div class="create-input-box mb-2">
            <input 
              type="text" 
              placeholder="note-name.md..." 
              bind:value={newFileName} 
              on:keydown={(e) => e.key === 'Enter' && createNewFile()}
            />
            <button class="primary" on:click={createNewFile}>CREATE</button>
          </div>
        {/if}

        <div class="search-box mb-2">
          <input type="text" placeholder="Search notes..." bind:value={searchQuery} style="width: 100%; font-size: 0.75rem; padding: 6px;" />
        </div>

        <div class="file-list">
          {#each filteredFilesList as file}
            <button 
              class="file-item {selectedFile?.path === file.path ? 'active' : ''}"
              on:click={() => selectFile(file)}
            >
              {#if ['md', 'tex'].includes(file.extension)}
                <FileText size={14} class="file-icon" />
              {:else if ['png', 'jpg', 'jpeg', 'gif'].includes(file.extension)}
                <FileImage size={14} class="image-icon" />
              {:else}
                <FileCheck size={14} class="pdf-icon" />
              {/if}
              <span class="file-name-span">{file.path}</span>
            </button>
          {/each}
          {#if filteredFilesList.length === 0}
            <div class="empty-list">No files found matching criteria.</div>
          {/if}
        </div>

        <button class="relink-btn mt-4" on:click={linkVault}>
          <Link size={12} />
          <span>RE-LINK FOLDER</span>
        </button>
      </div>

      <!-- Editor / Preview Area -->
      <div class="vault-body tiling-panel">
        {#if selectedFile}
          <div class="panel-header">
            <div class="panel-title">{selectedFile.name.toUpperCase()}</div>
            <div class="editor-actions">
              {#if ['md', 'tex'].includes(selectedFile.extension)}
                <button on:click={() => previewMode = !previewMode}>
                  <BookOpen size={14} />
                  <span>{previewMode ? 'EDIT' : 'PREVIEW'}</span>
                </button>
                <button class="primary" on:click={saveFile} disabled={status === 'saving'}>
                  <Save size={14} />
                  <span>{status === 'saving' ? 'SAVING...' : 'SAVE TO DISK'}</span>
                </button>
              {/if}
            </div>
          </div>

          <div class="content-viewport">
            {#if ['md', 'tex'].includes(selectedFile.extension)}
              {#if previewMode}
                <div class="markdown-preview">
                  {@html parseMarkdown(editorContent)}
                </div>
              {:else}
                <textarea 
                  class="monospace-editor" 
                  bind:value={editorContent} 
                  placeholder="Type your notes here..."
                ></textarea>
              {/if}
            {:else if selectedFile.extension === 'pdf'}
              {#if pdfUrl}
                <iframe src={pdfUrl} title="PDF Preview" class="pdf-viewer"></iframe>
              {/if}
            {:else if ['png', 'jpg', 'jpeg', 'gif'].includes(selectedFile.extension)}
              {#if imageUrl}
                <div class="image-viewer-container">
                  <img src={imageUrl} alt={selectedFile.name} class="image-preview" />
                </div>
              {/if}
            {/if}
          </div>
        {:else}
          <div class="empty-editor">
            <Terminal size={32} class="text-muted mb-2" />
            <p>SELECT A FILE FROM THE VAULT BAR TO EDIT OR VIEW</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if message}
    <div class="status-popup {status}">
      <span>{message}</span>
    </div>
  {/if}
</div>

<style>
  .notes-explorer-container {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 100%;
  }

  .unlinked-panel {
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px;
    max-width: 500px;
    margin: 40px auto;
  }

  .unlinked-body {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .btn-large {
    padding: 10px 20px;
    font-size: 0.95rem;
  }

  .vault-workspace {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: var(--gap);
    height: calc(100vh - 120px);
  }

  @media (max-width: 768px) {
    .vault-workspace {
      grid-template-columns: 1fr;
      height: auto;
    }
  }

  .vault-sidebar {
    overflow-y: auto;
    height: 100%;
  }

  .action-btn {
    padding: 4px;
    background: none;
    border-color: var(--border);
  }

  .create-input-box {
    display: flex;
    gap: 4px;
  }

  .create-input-box input {
    flex-grow: 1;
    font-size: 0.75rem;
    padding: 4px 6px;
  }

  .create-input-box button {
    padding: 4px 8px;
    font-size: 0.75rem;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-grow: 1;
    overflow-y: auto;
  }

  .file-item {
    background: none;
    border: 1px solid transparent;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: var(--border-radius);
    text-align: left;
    width: 100%;
    cursor: pointer;
    font-size: 0.75rem;
    justify-content: flex-start;
    box-shadow: none !important;
  }

  .file-item:hover {
    background-color: var(--focus);
    border-color: var(--border);
  }

  .file-item.active {
    background-color: var(--focus);
    border-color: var(--accent);
    font-weight: bold;
    color: var(--accent);
  }

  .file-name-span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-icon { color: var(--accent-quaternary); }
  .image-icon { color: var(--accent-tertiary); }
  .pdf-icon { color: var(--accent-secondary); }

  .empty-list {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-align: center;
    margin-top: 20px;
  }

  .relink-btn {
    font-size: 0.7rem;
    padding: 4px 8px;
    align-self: center;
  }

  .vault-body {
    height: 100%;
    overflow: hidden;
  }

  .content-viewport {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
  }

  .monospace-editor {
    flex-grow: 1;
    width: 100%;
    background-color: var(--bg);
    border: none;
    color: var(--text);
    font-family: var(--font-family);
    padding: 12px;
    font-size: 0.85rem;
    resize: none;
    outline: none;
    line-height: 1.4;
  }

  .pdf-viewer {
    width: 100%;
    height: 100%;
    border: none;
  }

  .image-viewer-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    height: 100%;
    overflow: auto;
  }

  .image-preview {
    max-width: 100%;
    max-height: 100%;
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    object-fit: contain;
  }

  .empty-editor {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
    color: var(--text-muted);
    font-weight: bold;
    font-size: 0.8rem;
  }

  .markdown-preview {
    flex-grow: 1;
    overflow-y: auto;
    padding: 16px;
    color: var(--text);
    font-family: var(--font-family);
    line-height: 1.6;
    font-size: 0.85rem;
    background-color: var(--bg);
  }

  :global(.markdown-preview h1) {
    font-size: 1.4rem;
    border-bottom: 2px double var(--border);
    margin-top: 0;
    margin-bottom: 12px;
    color: var(--accent);
  }

  :global(.markdown-preview h2) {
    font-size: 1.15rem;
    border-bottom: 1px solid var(--border);
    margin-top: 14px;
    margin-bottom: 10px;
    color: var(--accent-quaternary);
  }

  :global(.markdown-preview h3) {
    font-size: 0.95rem;
    margin-top: 10px;
    margin-bottom: 6px;
    color: var(--accent-tertiary);
  }

  :global(.markdown-preview .latex-block) {
    background-color: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: 10px;
    margin: 12px 0;
    text-align: center;
    font-family: var(--font-family);
  }

  :global(.markdown-preview .latex-inline) {
    background-color: var(--bg-panel);
    color: var(--accent-quaternary);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: var(--font-family);
  }

  :global(.markdown-preview .md-check) {
    color: var(--accent-secondary);
    font-family: var(--font-family);
    font-weight: bold;
    margin-right: 4px;
  }

  :global(.markdown-preview .md-check-done) {
    color: var(--accent-tertiary);
    font-family: var(--font-family);
    font-weight: bold;
    margin-right: 4px;
  }

  :global(.markdown-preview .md-li) {
    list-style: none;
    padding-left: 10px;
    margin-bottom: 4px;
  }

  .status-popup {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 8px 16px;
    border-radius: var(--border-radius);
    font-size: 0.8rem;
    font-weight: bold;
    border: 1px solid var(--border);
    background-color: var(--bg-panel);
    box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  }

  .status-popup.success {
    border-color: var(--accent-tertiary);
    color: var(--accent-tertiary);
  }

  .status-popup.error {
    border-color: var(--accent-secondary);
    color: var(--accent-secondary);
  }

  .status-popup.saving, .status-popup.loading {
    border-color: var(--accent-quaternary);
    color: var(--accent-quaternary);
  }
</style>
