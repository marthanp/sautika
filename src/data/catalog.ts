import { BookOpen, Calculator, FlaskConical, Globe, Sprout, type LucideIcon } from 'lucide-react';

export type Subject = 'Mathematics' | 'Science' | 'English' | 'Social Studies' | 'Agriculture' | 'Life Skills';
export const SUBJECTS: Record<Subject, { color: string; icon: LucideIcon }> = {
  Mathematics: { color: '#2F6BFF', icon: Calculator },
  Science: { color: '#12A36B', icon: FlaskConical },
  English: { color: '#7C4DFF', icon: BookOpen },
  'Social Studies': { color: '#F5A100', icon: Globe },
  Agriculture: { color: '#4C9F2F', icon: Sprout },
  'Life Skills': { color: '#14A3A8', icon: FlaskConical },
};

export interface Note { id: number | string; subject: Subject; title: string; text: string; date: string; r2Url?: string; r2Key?: string }
export const EARN = [['Complete a Lesson', '+10 coins', '#10B981'], ['Pass a Quiz', '+15 coins', '#7C4DFF'], ['Add a Note', '+5 coins', '#2F6BFF'], ['Daily Login', '+10 coins', '#F59E0B'], ['Reach a Milestone', '+30 coins', '#D946EF']] as const;
export const REWARDS = [
  { title: 'Study Badge', cost: 100, text: 'Show off your achievement with a special badge.', color: '#1F63F5', bg: '#EAF2FF' },
  { title: 'E-Book Voucher', cost: 250, text: 'Get a free e-book from our library.', color: '#7C3AED', bg: '#F3EDFF' },
  { title: 'Extra Learning Time', cost: 400, text: 'Get 1 extra day of premium access.', color: '#0FA37F', bg: '#E5F8F1' },
  { title: 'Reward Gift', cost: 700, text: 'A special surprise just for you!', color: '#F2562B', bg: '#FFF1E8' },
];
