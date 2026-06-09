import useSWR from 'swr';
import { fetchPublicBusiness, PublicBusinessData } from '@/lib/api';

export function useBusiness(slug: string) {
  const { data, error, isLoading } = useSWR(
    slug ? `business-${slug}` : null,
    () => fetchPublicBusiness(slug),
    { revalidateOnFocus: false }
  );
  return {
    business: data?.success ? data.data as PublicBusinessData : null,
    error: error || (data && !data.success ? data.error : null),
    isLoading,
  };
}
