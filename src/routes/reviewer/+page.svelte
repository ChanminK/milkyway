<!--import { toLowerCase } from "zod";
  import { handle } from "../../hooks.server";
-->
<script lang="ts">
  export let data: any;
  export let form: any;

  let user = data.user ?? {};
  let submissions = Array.isArray(data.submissions) ? data.submissions : [];

  let selectedId: string | null = submissions[0]?.id ?? null;
  let loadingAction: 'approve' | 'reject' | null = null;
  let message = '';

  $: selected = submissions.find((s: any) => s.id === selectedId) ?? null;

  function formatDate(dt: string | null | undefined) {
    if (!dt) return '';
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  async function handleApprove() {
    if (!selected) return;
    loadingAction = 'approve';
    message = '';

    try {
      const res = await fetch('/api/blackhole/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selected.id,
          reviewer: user.username ?? 'reviewer'
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to approve');
      }

      const updated = await res.json();
      submissions = submissions.filter((x: any) => x.id !== selected.id);
      message = `Approved submission ${updated.id}`;

      // move selection to next
      selectedId = submissions[0]?.id ?? null;
    } catch (err) {
      const e = err as Error;
      message = e.message ?? 'Error approving';
    } finally {
      loadingAction = null;
    }
  }

  async function handleReject() {
    if (!selected) return;
    const reason =
      window.prompt('Reason for rejection? (optional)', selected.reason ?? '') ??
      '';

    loadingAction = 'reject';
    message = '';

    try {
      const res = await fetch('/api/blackhole/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selected.id,
          reviewer: user.username ?? 'reviewer',
          reason
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to reject');
      }

      const updated = await res.json();
      submissions = submissions.filter((x: any) => x.id !== selected.id);
      message = `Rejected submission ${updated.id}`;

      selectedId = submissions[0]?.id ?? null;
    } catch (err) {
      const e = err as Error;
      message = e.message ?? 'Error rejecting';
    } finally {
      loadingAction = null;
    }
  }
</script>

<svelte:head>
  <title>Reviewer</title>
</svelte:head>

{#if !data.authorized}
  <main class="login">
    <h1>Reviewer Login</h1>
    <p>enter the reviewer password to access black hole submissions.</p>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    <form method="POST" class="login-form">
      <label>
        Password
        <input type="password" name="password" required />
      </label>
      <button type="submit">Enter</button>
    </form>
  </main>
{:else}
  <main class="page">
    <header class="header">
      <div>
        <h1>Black Hole Reviewer</h1>
        <p>
          logged in as <strong>{user.username ?? 'Unknown'}</strong>
        </p>
      </div>
      <div class="summary">
        <span>pending submissions: {submissions.length}</span>
      </div>
    </header>

    {#if message}
      <p class="flash">{message}</p>
    {/if}

    {#if !submissions || submissions.length === 0}
      <p class="empty">
        no pending submissions — everything has been judged ✨
      </p>
    {:else}
      <section class="layout">
        <!-- LEFT: list of submissions -->
        <aside class="list-panel">
          {#each submissions as s}
            <button
              type="button"
              class:selected={selectedId === s.id}
              class="list-item"
              on:click={() => (selectedId = s.id)}
            >
              <div class="line1">
                <span class="username">{s.username ?? 'unknown user'}</span>
                {#if s.status}
                  <span class={"status " + s.status.toLowerCase()}>
                    {s.status.toLowerCase()}
                  </span>
                {/if}
              </div>
              <div class="line2">
                <span>project: {s.project?.name ?? s.projectId}</span>
              </div>
              <div class="line3">
                <span>
                  coins: {s.coinsSpent ?? 0} · hours: {s.hackatimeHours ?? '—'}
                </span>
                {#if s.createdTime}
                  <span class="time">{formatDate(s.createdTime)}</span>
                {/if}
              </div>
            </button>
          {/each}
        </aside>

        <!-- RIGHT: detail for selected submission -->
        <section class="detail-panel">
          {#if !selected}
            <p class="empty">select a submission from the left</p>
          {:else}
            <header class="detail-header">
              <h2>{selected.project?.name ?? 'Untitled project'}</h2>
              <p>
                submitted by <strong>{selected.username ?? 'unknown user'}</strong>
              </p>
            </header>

            <div class="detail-top">
              <div class="image-wrap">
                {#if selected.project?.projectImage}
                  <img
                    src={selected.project.projectImage}
                    alt={selected.project.name}
                  />
                {:else if selected.project?.egg}
                  <img
                    src={selected.project.egg.startsWith('/') ? selected.project.egg : `/${selected.project.egg}`}
                    alt={selected.project.name}
                  />
                {:else}
                  <div class="placeholder">no image</div>
                {/if}
              </div>

              <div class="stats">
                <div>coins spent: <strong>{selected.coinsSpent ?? 0}</strong></div>
                <div>
                  hours (submitted):{' '}
                  <strong>{selected.hackatimeHours ?? 'unknown'}</strong>
                </div>
                {#if selected.stellarshipsAtSubmission != null}
                  <div>
                    stellarships at submission:{' '}
                    <strong>{selected.stellarshipsAtSubmission}</strong>
                  </div>
                {/if}
                {#if selected.createdTime}
                  <div>submitted at: {formatDate(selected.createdTime)}</div>
                {/if}
              </div>
            </div>

            <section class="text-block">
              <h3>justification</h3>
              <p>
                {#if selected.justification}
                  {selected.justification}
                {:else}
                  <span class="muted">no justification provided.</span>
                {/if}
              </p>
            </section>

            {#if selected.project?.description || selected.project?.promptinfo}
              <section class="text-block">
                <h3>project notes</h3>
                {#if selected.project?.description}
                  <p>{selected.project.description}</p>
                {/if}
                {#if selected.project?.promptinfo}
                  <p class="muted">{selected.project.promptinfo}</p>
                {/if}
              </section>
            {/if}

            {#if selected.project?.shipURL || selected.project?.githubURL}
              <section class="links">
                {#if selected.project?.shipURL}
                  <a
                    href={selected.project.shipURL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    &gt; open demo / storefront
                  </a>
                {/if}
                {#if selected.project?.githubURL}
                  <a
                    href={selected.project.githubURL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    &gt; view github repo
                  </a>
                {/if}
              </section>
            {/if}

            <section class="actions">
              <button
                type="button"
                on:click={handleApprove}
                disabled={loadingAction !== null}
              >
                {#if loadingAction === 'approve'}
                  approving...
                {:else}
                  approve
                {/if}
              </button>
              <button
                type="button"
                on:click={handleReject}
                disabled={loadingAction !== null}
              >
                {#if loadingAction === 'reject'}
                  rejecting...
                {:else}
                  reject
                {/if}
              </button>
            </section>
          {/if}
        </section>
      </section>
    {/if}
  </main>
{/if}

<style>
  .login {
    min-height: 100vh;
    padding: 2rem 1rem;
    max-width: 480px;
    margin: 0 auto;
    color: #f5f5f5;
    background: #000;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
      sans-serif;
  }

  .login-form {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .login-form input {
    padding: 0.4rem 0.6rem;
  }

  .login-form button {
    margin-top: 0.5rem;
  }

  .error {
    color: #ff8c8c;
  }

  .page {
    min-height: 100vh;
    padding: 1.5rem;
    color: #f5f5f5;
    background: #000;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
      sans-serif;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .header h1 {
    margin: 0 0 0.25rem;
    font-size: 1.6rem;
  }

  .summary {
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .flash {
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }

  .empty {
    margin-top: 2rem;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
    gap: 1rem;
    align-items: flex-start;
  }

  .list-panel {
    max-height: calc(100vh - 150px);
    overflow-y: auto;
    border-right: 1px solid rgba(255, 255, 255, 0.12);
    padding-right: 0.5rem;
  }

  .list-item {
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    padding: 0.5rem 0.4rem;
    margin-bottom: 0.25rem;
    color: inherit;
    cursor: pointer;
    border-radius: 0.4rem;
  }

  .list-item.selected {
    background: rgba(255, 255, 255, 0.06);
  }

  .line1,
  .line2,
  .line3 {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .username {
    font-weight: 600;
  }

  .status {
    text-transform: lowercase;
    font-size: 0.8rem;
  }

  .status.pending {
    color: #ffe28c;
  }

  .status.approved {
    color: #8cff8c;
  }

  .status.rejected {
    color: #ff8c8c;
  }

  .time {
    opacity: 0.7;
  }

  .detail-panel {
    padding-left: 0.5rem;
  }

  .detail-header h2 {
    margin: 0 0 0.25rem;
    font-size: 1.4rem;
  }

  .detail-top {
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
    margin-bottom: 1rem;
  }

  .image-wrap {
    width: 180px;
    min-width: 140px;
    aspect-ratio: 4 / 3;
    border-radius: 0.75rem;
    overflow: hidden;
    background: #111;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .image-wrap img {
    max-width: 100%;
    max-height: 100%;
    display: block;
    object-fit: contain;
  }

  .placeholder {
    font-size: 0.85rem;
    opacity: 0.6;
  }

  .stats {
    font-size: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    justify-content: center;
  }

  .text-block {
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .text-block h3 {
    margin: 0 0 0.25rem;
    font-size: 0.95rem;
    text-transform: lowercase;
  }

  .muted {
    opacity: 0.75;
    font-style: italic;
  }

  .links {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .links a {
    color: #f5f5f5;
    font-size: 0.9rem;
    text-decoration: none;
  }

  .links a:hover {
    text-decoration: underline;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .actions button {
    padding: 0.4rem 0.8rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: #111;
    color: #f5f5f5;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .actions button:disabled {
    opacity: 0.6;
    cursor: default;
  }

  @media (max-width: 800px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .list-panel {
      max-height: none;
      border-right: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      padding-right: 0;
      padding-bottom: 0.5rem;
      margin-bottom: 1rem;
    }
    .detail-top {
      flex-direction: column;
    }
  }
</style>
