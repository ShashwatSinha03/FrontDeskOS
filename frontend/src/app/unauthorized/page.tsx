import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          You do not have access to this page. If you believe this is a mistake, please contact your business owner or support.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-block rounded-md bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700/80"
          >
            Go home
          </Link>
          <a
            href="mailto:founder@nuvora.io"
            className="inline-block rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
