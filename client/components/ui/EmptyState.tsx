type Props = { title: string; description?: string; action?: React.ReactNode };

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-white p-8 text-center">
      <p className="font-semibold">{title}</p>
      {description && <p className="text-sm text-ink-muted">{description}</p>}
      {action}
    </div>
  );
}
