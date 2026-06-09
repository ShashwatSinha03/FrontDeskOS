import useSWR from 'swr';
import { fetchPublicServices, PublicServiceData } from '@/lib/api';

export function useServices(slug: string) {
  const { data, error, isLoading } = useSWR(
    slug ? `services-${slug}` : null,
    () => fetchPublicServices(slug),
    { revalidateOnFocus: false }
  );
  return {
    services: data?.success ? data.data as PublicServiceData[] : [],
    error: error || (data && !data.success ? data.error : null),
    isLoading,
  };
}
