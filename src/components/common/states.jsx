import { Loader2, TriangleAlert } from "lucide-react";

export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex items-center gap-2 p-6 text-muted" role="status">
      <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex items-start gap-3 p-6" role="alert">
      <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium">Couldn't load this</p>
        <p className="text-sm text-muted">{error?.message || "Something went wrong."}</p>
        {onRetry && (
          <button className="btn btn-quiet mt-3" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="p-8 text-center">
      <p className="font-display text-lg">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export function QueryBoundary({ query, children }) {
  if (query.isLoading) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return children(query.data);
}
