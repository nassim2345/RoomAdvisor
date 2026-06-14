import type { Issue } from "@/lib/types";

interface IssuesPanelProps {
  issues: Issue[] | null | undefined;
}

export default function IssuesPanel({ issues }: IssuesPanelProps) {
  if (!issues || issues.length === 0) return null;

  return (
    <section className="w-full rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
        Aree di miglioramento
      </h2>
      <ol className="space-y-4">
        {issues.map((issue, i) => (
          <li key={i} className="border-l-2 border-brand-border pl-4">
            <h3 className="text-sm font-semibold text-brand-text">
              {issue.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-brand-text-muted">
              {issue.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
