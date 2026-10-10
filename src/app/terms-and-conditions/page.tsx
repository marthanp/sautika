import type { Metadata } from 'next';
import PolicyPage, { type PolicySection } from '@/components/PolicyPage';

export const metadata: Metadata = { title: 'Terms and Conditions | Sautika' };

const sections: PolicySection[] = [
  {
    heading: 'Using Sautika',
    paragraphs: [
      'Sautika provides learning tools and educational content to support learners. Use the service respectfully, lawfully, and in a way that does not disrupt other users or the platform.',
      'If you are under 18, use Sautika with the knowledge and guidance of a parent, guardian, or teacher.',
    ],
  },
  {
    heading: 'Learning content and AI',
    paragraphs: [
      'Lessons and AI-generated responses are intended as learning support. They may contain errors or may not fit every situation, so check important information with a teacher or another trusted source.',
      'Do not submit passwords, sensitive personal details, or information about another person in learning prompts.',
    ],
  },
  {
    heading: 'Availability and changes',
    paragraphs: [
      'We work to keep Sautika available and useful, but features may change, be unavailable, or be discontinued. We may update these terms when the service changes.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'Questions about these terms? Contact the Sautika team on +256 772 270 027.',
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <PolicyPage
      title="Terms and Conditions"
      intro="These terms describe the basic expectations for using Sautika’s learning platform."
      sections={sections}
    />
  );
}
