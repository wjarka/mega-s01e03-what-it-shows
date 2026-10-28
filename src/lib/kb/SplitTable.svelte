<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { mistagged, PROBLEM_NAMES, splitTicket, type Problem } from '#lib/kb/problems';
  import { tenantOf } from '#lib/kb/locales';
  import type { Report } from '#lib/kb/causes';

  // tickets: the GitHub issue each problem was filed as, in `repo`.
  let { ticket, repo, tickets }: { ticket: number; repo: string; tickets: Record<Problem, number> } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const placed = $derived(split.groups.filter((g) => g.problem !== 'unplaced'));
  const issue = (p: Problem) => `https://github.com/${repo}/issues/${tickets[p]}`;
  const tags = (g: { taggedAs: Record<string, number> }) =>
    Object.entries(g.taggedAs)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, n]) => `${tag} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{split.reports.length}</strong> reports in #{ticket}
  ({split.rows} rows in the export; {split.rows - split.reports.length} are copies of a report already counted) ·
  <strong>{placed.length}</strong> problems
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tagged at intake as</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      <tr>
        <td>
          <code>{g.problem}</code>
          {#if g.problem !== 'unplaced'}<br /><span class="name">{PROBLEM_NAMES[g.problem]}</span>{/if}
        </td>
        <td>
          <strong>{g.reports.length}</strong>
          {#if g.filedUnder.length}<br /><span class="name">also counted under {g.filedUnder.join(', ')}</span>{/if}
        </td>
        <td class="tags">{tags(g)}{#if mistagged(g)}<br /><span class="off">{mistagged(g)} tagged as another problem</span>{/if}</td>
        <td>{g.tenants.length}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if g.problem === 'unplaced'}<span class="off">no tenant on file — not filed</span>
          {:else}<a href={issue(g.problem)}>{repo}#{tickets[g.problem]}</a>{/if}
        </td>
      </tr>
    {/each}
  </tbody>
  <tfoot>
    <tr>
      <td>reports</td>
      <td><strong>{split.groups.filter((g) => !g.filedUnder.length).reduce((n, g) => n + g.reports.length, 0)}</strong></td>
      <td colspan="4" class="name">each report once; <code>shift</code> reports sit inside the row they are filed under</td>
    </tr>
  </tfoot>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .name { color: var(--muted); font-size: 0.85em; }
  .tags { color: var(--muted); font-size: 0.85em; }
  .off { color: var(--warn); font-size: 0.85em; }
</style>
