import type { Metadata } from 'next';
import PolicyPage, { type PolicySection } from '@/components/PolicyPage';

export const metadata: Metadata = { title: 'Cookie Policy | Sautika' };

const sections: PolicySection[] = [
  {
    heading: 'How this site uses browser storage',
    paragraphs: [
      'Sautika uses browser storage to support basic app features and remember locally stored learning information. This may include local storage and IndexedDB, which are different from browser cookies.',
      'You can clear or block site data in your browser settings. Some features may not work as expected if you do.',
    ],
  },
  {
    heading: 'Embedded maps',
    paragraphs: [
      'The location map in our footer is provided by Google Maps. Loading or using the map may allow Google to receive technical information such as your IP address and apply its own cookies or similar technologies. Google’s privacy and cookie terms apply to that service.',
    ],
  },
  {
    heading: 'Changes and contact',
    paragraphs: [
      'We may update this policy as Sautika changes. For questions about this policy, call our help line at +256 772 270 027.',
    ],
  },
];

export default function CookiePolicyPage() {
  return (
    <PolicyPage
      title="Cookie Policy"
      intro="This policy explains how Sautika uses cookies and similar technologies when you visit our website."
      sections={sections}
    />
  );
}
