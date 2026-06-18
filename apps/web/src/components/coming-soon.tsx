interface ComingSoonProps {
  title: string;
  unit: string;
  description: string;
}

export function ComingSoon({ title, unit, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          Planned for <strong>{unit}</strong>.
        </p>
      </div>
    </div>
  );
}
