type Props = { title: string; phase: string };

export default function PagePlaceholder({ title, phase }: Props) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-ink-muted">This screen will be built in {phase}.</p>
    </section>
  );
}
