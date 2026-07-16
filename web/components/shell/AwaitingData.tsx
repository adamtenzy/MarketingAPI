export function AwaitingData({
  title,
  source,
}: {
  title: string;
  source: string;
}) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <div className="sub">Live {source} data is wired once the source is connected.</div>
        </div>
      </div>
      <div className="empty">
        <h3>Awaiting sync</h3>
        <p>
          This view will populate once the {source} connector is configured and the
          first ingestion job has run. See <code>docs/IMPLEMENTATION_PLAN.md</code> for
          the wiring steps.
        </p>
      </div>
    </>
  );
}
