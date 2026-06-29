'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ResumeDraftModalProps {
  businessName: string;
  onResume: () => void;
  onStartFresh: () => void;
}

export function ResumeDraftModal({ businessName, onResume, onStartFresh }: ResumeDraftModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Resume onboarding?</CardTitle>
          <CardDescription>
            We found an incomplete onboarding session for{' '}
            <span className="font-medium text-foreground">{businessName || 'a business'}</span>.
            Would you like to continue where you left off?
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Starting fresh will discard any unsaved progress.
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button variant="outline" onClick={onStartFresh} className="flex-1">
            Start Fresh
          </Button>
          <Button onClick={onResume} className="flex-1">
            Resume
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
