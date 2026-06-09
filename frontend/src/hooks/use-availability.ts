import useSWR from 'swr';
import { fetchAvailableSlots } from '@/lib/api';

export function useAvailability(businessId: string | null, date: string | null, serviceId?: string) {
  const shouldFetch = !!(businessId && date);
  const { data, error, isLoading } = useSWR(
    shouldFetch ? `slots-${businessId}-${date}-${serviceId || ''}` : null,
    () => fetchAvailableSlots(businessId!, date!, serviceId),
    { revalidateOnFocus: false }
  );
  return {
    slots: data?.success ? data.data as { time: string; durationMinutes: number }[] : [],
    error: error || (data && !data.success ? data.error : null),
    isLoading,
  };
}
