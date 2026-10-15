import type { Metadata } from 'next';
import StudyHubContent from './StudyHubContent';

export const metadata: Metadata = {
  title: 'Study Hub',
};

export default function HomePage() {
  return <StudyHubContent />;
}
