export default function LoadingSpinner({ size = 'md' }) {
  const dim = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-4 h-4' : 'w-7 h-7';
  const border = size === 'lg' ? 'border-4' : 'border-2';
  return (
    <div
      className={`${dim} ${border} border-sand border-t-brand-500 rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}
