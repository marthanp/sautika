import type { Metadata } from 'next';
import PolicyPage, { type PolicySection } from '@/components/PolicyPage';

export const metadata: Metadata = { title: 'Privacy Policy | Sautika' };

const sections: PolicySection[] = [
  {
    heading: 'Information and learning data',
    paragraphs: [
      'Sautika may process information you provide, such as learning prompts, and information created while using learning features. Some learning data is stored locally in your browser so features can work on your device.',
      'When you use AI-powered features, the prompt you submit may be sent to the service providers that help generate a response. Do not include passwords or sensitive personal information in prompts.',
    ],
  },
  {
    heading: 'Children and families',
    paragraphs: [
      'Sautika is designed for learners, including children. Parents, guardians, and educators should help children use the service safely and avoid sharing personal or sensitive details.',
    ],
  },
  {
    heading: 'Third-party services',
    paragraphs: [
      'Some features, including the embedded map, are provided by third parties. Their handling of information is governed by their own privacy policies and terms.',
    ],
  },
  {
    heading: 'Your choices and contact',
    paragraphs: [
      'You can clear Sautika’s locally stored browser data through your browser settings. This may remove locally saved learning information and preferences.',
      'For privacy questions or requests, contact Sautika on +256 772 270 027.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      intro="Your privacy matters. This policy describes the information Sautika may handle when you use the platform."
      sections={sections}
    />
  );
}
