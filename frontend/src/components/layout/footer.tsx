export function Footer({ businessName }: { businessName: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-muted/40 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} {businessName}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by FrontDeskOS
          </p>
        </div>
      </div>
    </footer>
  );
}
