export function getLegalConfig() {
  return {
    companyName: process.env.NEXT_PUBLIC_LEGAL_COMPANY_NAME || 'Nuvora Technologies',
    contactEmail: process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL || 'legal@nuvora.com',
    address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || '',
    jurisdiction: process.env.NEXT_PUBLIC_LEGAL_JURISDICTION || 'India',
    effectiveDate: '2026-06-13',
  };
}

export type LegalConfig = ReturnType<typeof getLegalConfig>;
