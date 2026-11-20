export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function DishCardSkeleton() {
  return (
    <div className="dish-card dish-card-skeleton" aria-hidden="true">
      <Skeleton className="skeleton-image" />
      <div className="dish-card-body">
        <Skeleton className="skeleton-line skeleton-w70" />
        <Skeleton className="skeleton-line skeleton-w90" />
        <Skeleton className="skeleton-line skeleton-w40" />
      </div>
    </div>
  );
}
