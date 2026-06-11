import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          You do not have access to this business dashboard.
        </p>
        <Link
          href="/"
          className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
