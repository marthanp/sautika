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
export const USER = { name: 'Aisha N.', first: 'Aisha', grade: 'Primary 6', coins: 320 };

export const CONTINUE = [
  { title: 'Our Environment', subject: 'Science' as Subject, img: 'home-environment.jpg', done: 3, total: 5 },
  { title: 'Basic Mathematics', subject: 'Mathematics' as Subject, img: 'home-math-board.jpg', done: 2, total: 5 },
  { title: 'Our Country', subject: 'Social Studies' as Subject, img: 'home-uganda.jpg', done: 1, total: 5 },
  { title: 'Farming and Food', subject: 'Agriculture' as Subject, img: 'home-farming.jpg', done: 0, total: 5 },
];
export const COURSES = [
  { title: 'Mathematics', cat: 'Mathematics' as Subject, text: 'Numbers, problem solving and real-life maths.', lessons: 45, img: 'course-math.jpg' },
  { title: 'Science', cat: 'Science' as Subject, text: 'Explore the world around you.', lessons: 35, img: 'course-science.jpg' },
  { title: 'English Language', cat: 'English' as Subject, text: 'Reading, writing and communication.', lessons: 50, img: 'course-english.jpg' },
  { title: 'Social Studies', cat: 'Social Studies' as Subject, text: 'Our people, places and history.', lessons: 40, img: 'course-social.jpg' },
  { title: 'Agriculture', cat: 'Agriculture' as Subject, text: 'Healthy crops, better futures.', lessons: 30, img: 'course-agri.jpg' },
  { title: 'Life Skills', cat: 'Life Skills' as Subject, text: 'Build confidence and good habits.', lessons: 25, img: 'course-life.jpg' },
];
export const COURSE_RAIL: [Subject, string, number][] = [['Mathematics', '3/4', 75], ['Science', '2/4', 50], ['English', '2/4', 50], ['Social Studies', '1/2', 50], ['Agriculture', '1/2', 50], ['Life Skills', '0/2', 0]];
export const SUBJECT_PROGRESS: [Subject, number, string][] = [['Mathematics', 80, '8/10 lessons'], ['Science', 60, '6/10 lessons'], ['English', 70, '7/10 lessons'], ['Social Studies', 50, '5/10 lessons'], ['Agriculture', 40, '4/10 lessons'], ['Life Skills', 30, '3/10 lessons']];
export const PROGRESS_ACTIVITY: { title: string; sub: string; subject: Subject; tag: string }[] = [
  { title: 'Completed: Fractions and Their Uses', sub: 'Mathematics • Apr 26, 2025', subject: 'Mathematics', tag: '+10 coins' },
  { title: 'Finished: The Water Cycle', sub: 'Science • Apr 24, 2025', subject: 'Science', tag: '+10 coins' },
  { title: 'Started: Types of Sentences', sub: 'English • Apr 22, 2025', subject: 'English', tag: 'In progress' },
  { title: 'Completed: Our Country Uganda', sub: 'Social Studies • Apr 20, 2025', subject: 'Social Studies', tag: '+10 coins' },
  { title: 'Completed: Crops and Their Importance', sub: 'Agriculture • Apr 18, 2025', subject: 'Agriculture', tag: '+10 coins' },
];
export const ACHIEVEMENTS = [
  { title: 'First Lesson', text: 'Completed your first lesson', date: 'Apr 10, 2025', emoji: '🏅' },
  { title: '3 Day Streak', text: 'Keep the streak going!', date: 'Apr 14, 2025', emoji: '🔥' },
  { title: 'Math Pro', text: 'Completed 5 math lessons', date: 'Apr 18, 2025', emoji: '📘' },
  { title: 'Top Learner', text: 'In your class', date: 'Apr 20, 2025', emoji: '🌱' },
];
export interface Note { id: number | string; subject: Subject; title: string; text: string; date: string; r2Url?: string; r2Key?: string }
export const NOTES: Note[] = [
  { id: 1, subject: 'Mathematics', title: 'Fractions and Their Uses', text: 'Fractions help us share, divide and compare quantities. For example, 1/2 means half...', date: 'Apr 26, 2025' },
  { id: 2, subject: 'Science', title: 'The Water Cycle', text: 'The water cycle is the continuous movement of water on, above and below the Earth’s surface...', date: 'Apr 24, 2025' },
  { id: 3, subject: 'English', title: 'Types of Sentences', text: 'There are three main types of sentences: declarative, interrogative and imperative. Each has a different purpose...', date: 'Apr 22, 2025' },
  { id: 4, subject: 'Social Studies', title: 'Our Country Uganda', text: 'Uganda is located in East Africa. It shares borders with Kenya, Tanzania, South Sudan, Democratic Republic of Congo...', date: 'Apr 20, 2025' },
  { id: 5, subject: 'Agriculture', title: 'Crops and Their Importance', text: 'Crops provide food, income and jobs. Common crops in our region include maize, beans, cassava and bananas...', date: 'Apr 18, 2025' },
  { id: 6, subject: 'Mathematics', title: 'Multiplication Tables', text: 'The multiplication table helps us find the product of two numbers quickly. For example, 6 × 7 = 42...', date: 'Apr 16, 2025' },
];
export const EARN = [['Complete a Lesson', '+10 coins', '#10B981'], ['Pass a Quiz', '+15 coins', '#7C4DFF'], ['Add a Note', '+5 coins', '#2F6BFF'], ['Daily Login', '+10 coins', '#F59E0B'], ['Reach a Milestone', '+30 coins', '#D946EF']] as const;
export const REWARDS = [
  { title: 'Study Badge', cost: 100, text: 'Show off your achievement with a special badge.', color: '#1F63F5', bg: '#EAF2FF' },
  { title: 'E-Book Voucher', cost: 250, text: 'Get a free e-book from our library.', color: '#7C3AED', bg: '#F3EDFF' },
  { title: 'Extra Learning Time', cost: 400, text: 'Get 1 extra day of premium access.', color: '#0FA37F', bg: '#E5F8F1' },
  { title: 'Reward Gift', cost: 700, text: 'A special surprise just for you!', color: '#F2562B', bg: '#FFF1E8' },
];
export const COIN_ACTIVITY = [
  { title: 'Completed: Fractions and Their Uses', sub: 'Mathematics • Apr 26, 2025', coins: '+10', color: '#7C4DFF' },
  { title: 'Added a note', sub: 'The Water Cycle • Apr 24, 2025', coins: '+5', color: '#12A36B' },
  { title: 'Passed a quiz', sub: 'Science • Apr 22, 2025', coins: '+15', color: '#2F6BFF' },
  { title: 'Daily login bonus', sub: 'Apr 20, 2025', coins: '+10', color: '#F59E0B' },
  { title: 'Reached 5-day streak', sub: 'Apr 18, 2025', coins: '+30', color: '#D946EF' },
];
export const LESSONS = ['1. Whole Numbers', '2. Place Value', '3. Addition & Subtraction', '4. Multiplication', '5. Division'];
export const LANGS = ['Luganda', 'Swahili', 'Acholi', 'Ateso', 'Runyankole'];
export const KEY_POINTS = ['Addition means putting numbers together.', 'Subtraction means finding the difference.', 'Use real-life examples like money, fruits or objects.', 'Always check your answer using the opposite operation.'];
