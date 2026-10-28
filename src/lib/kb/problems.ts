// The problems #4471 holds, one ticket each (kb/incidents/4471/split). causes.ts places a report by
// tenant and channel; that is right for a swapped day and month. A report the desk read as a one-day
// move (desk-notes.json) has no swap in it, so no parser or hint fix touches it: it is its own problem,
// though the desk still counts it under the cause it is filed under.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'shift'];

export const PROBLEM_NAMES: Record<Problem, string> = {
  parser: 'the shared parser reads day-first dates month first',
  hint: "booking-v3's form hint says MM/DD/YYYY to day-first tenants",
  shift: 'the booking moves by one day, day and month intact',
};

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: string[];
  firstSeen: string;
  lastSeen: string;
  // For `shift`: the causes the desk files these reports under, and counts them in.
  filedUnder: Cause[];
};

export type Split = { rows: number; reports: Report[]; groups: ProblemGroup[] };

function group(problem: ProblemGroup['problem'], rs: Report[], filedUnder: Cause[] = []): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
    tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
    filedUnder,
  };
}

// Rows in the export, the reports behind them (one id, one report), and those reports by problem.
// Counted the desk's way (CauseTable): every report under the cause its tenant and way in give it.
// The one-day moves are counted there too, and again as `shift`, the problem they are.
export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): Split {
  const rows = all.filter((r) => r.mergedInto === ticket);
  const reports = uniqueById(rows);
  const by = new Map<Cause | 'unplaced', Report[]>();
  for (const r of reports) {
    const c = causeOf(r, tenantOf(r)) ?? 'unplaced';
    by.set(c, [...(by.get(c) ?? []), r]);
  }
  const order = (p: ProblemGroup['problem']) => (p === 'unplaced' ? PROBLEMS.length : PROBLEMS.indexOf(p));
  const groups = [...by.entries()].map(([c, rs]) => group(c, rs));
  const moved = reports.filter((r) => oneDayMove.includes(r.id));
  if (moved.length) {
    const filed = [...new Set(moved.flatMap((r) => causeOf(r, tenantOf(r)) ?? []))];
    groups.push(group('shift', moved, filed));
  }
  return { rows: rows.length, reports, groups: groups.sort((a, b) => order(a.problem) - order(b.problem)) };
}

// Reports intake tagged as something other than the problem they belong to.
export function mistagged(g: ProblemGroup): number {
  return g.reports.filter((r) => r.meta.intakeTag !== g.problem).length;
}
