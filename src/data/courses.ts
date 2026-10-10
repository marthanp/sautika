import type { Category, Course, Item } from '@/types';

const m = (q: string, a: string, d1: string, d2: string): Item => ({ k: 'm', q, a, d: [d1, d2] });
const b = (q: string, a: string, ...x: string[]): Item => ({ k: 'b', q, a, x });

export const CATEGORIES: Category[] = ['Science', 'Math', 'Languages', 'Digital Literacy', 'Social Studies'];

export const COURSES: Course[] = [
  { id: 'plants', cat: 'Science', title: 'Plants and Photosynthesis', emoji: '🌱', color: '#16A34A', level: 'Primary 4', lessons: [
    { title: 'Food from sun', items: [m('What do plants use to make food?', 'Sunlight', 'Sand', 'Salt'), m('Which part drinks water from the soil?', 'Roots', 'Flowers', 'Fruit'), m('What is the food-making process called?', 'Photosynthesis', 'Evaporation', 'Digestion'), b('Build the sentence', 'Plants need water', 'sing', 'eat')] },
    { title: 'Leaves and roots', items: [m('Which gas do plants take in?', 'Carbon dioxide', 'Smoke', 'Steam'), m('Which part holds the plant in the soil?', 'Roots', 'Leaves', 'Petals'), m('What gives leaves their green colour?', 'Chlorophyll', 'Sugar', 'Sand'), b('Build the sentence', 'Roots drink water', 'fly', 'sing')] }] },
  { id: 'solar', cat: 'Science', title: 'Solar Energy at Home', emoji: '☀️', color: '#F59E0B', level: 'Primary 6', lessons: [
    { title: 'Power from light', items: [m('What do solar panels use?', 'Sunlight', 'Wind', 'Rain'), m('Solar panels make…', 'Electricity', 'Water', 'Soil'), m('When do panels work best?', 'On a sunny day', 'At night', 'In heavy rain'), b('Build the sentence', 'Solar power is clean', 'dirty', 'loud')] },
    { title: 'Using the sun', items: [m('A solar lamp shines at night because of its…', 'Battery', 'Moon', 'Fire'), m('Panels should face…', 'The sun', 'The ground', 'The wall'), m('Solar power can charge…', 'A phone', 'A stone', 'A river'), b('Build the sentence', 'Panels catch sunlight', 'water', 'sing')] }] },
  { id: 'fractions', cat: 'Math', title: 'Fractions with Market Maths', emoji: '🍍', color: '#EA580C', level: 'Primary 5', lessons: [
    { title: 'Halves and quarters', items: [m('Half of one chapati is…', '1/2', '1/3', '2/1'), m('1/4 means…', '1 of 4 equal parts', '4 of 1 part', '1 and 4'), m('Which is bigger?', '1/2', '1/4', 'They are equal'), b('Build the sentence', 'Cut it into equal parts', 'tiny', 'red')] },
    { title: 'Top and bottom', items: [m('2/4 is the same as…', '1/2', '1/4', '2/2'), m('The numerator is the…', 'Top number', 'Bottom number', 'Whole'), m('The denominator is the…', 'Bottom number', 'Top number', 'Answer'), b('Build the sentence', 'Share the pineapple equally', 'sell', 'lose')] }] },
  { id: 'money', cat: 'Math', title: 'Money and Shillings', emoji: '💰', color: '#0EA5E9', level: 'Primary 4', lessons: [
    { title: 'Buying and change', items: [m('A mandazi costs 500. You buy 2. You pay…', '1000', '500', '1500'), m('Change from 1000 for a 700 bill?', '300', '400', '200'), m('5 oranges at 200 each cost…', '1000', '500', '700'), b('Build the sentence', 'Count your change', 'lose', 'spend')] },
    { title: 'Saving', items: [m('Price 1200, you pay 2000. Change is…', '800', '700', '900'), m('3 × 300 =', '900', '600', '1200'), m('Half of 1000 is…', '500', '200', '250'), b('Build the sentence', 'Save a little every week', 'spend', 'never')] }] },
  { id: 'luganda', cat: 'Languages', title: 'Luganda Basics', emoji: '🗣️', color: '#A855F7', level: 'Beginner', lessons: [
    { title: 'Greetings', items: [m('“Webale” means…', 'Thank you', 'Sorry', 'Goodbye'), m('How do you say “yes”?', 'Yee', 'Nedda', 'Webale'), b('Say “How are you?”', 'Oli otya', 'Webale', 'Yee'), m('“Gyendi” means…', 'I am fine', 'I am hungry', 'Thank you')] },
    { title: 'Family and food', items: [m('“Maama” means…', 'Mother', 'Father', 'Sister'), m('“Amazzi” means…', 'Water', 'Food', 'Milk'), m('“Emmere” means…', 'Food', 'Water', 'House'), b('Say “Thank you, mother”', 'Webale Maama', 'Taata', 'Nedda')] }] },
  { id: 'swahili', cat: 'Languages', title: 'Kiswahili Basics', emoji: '🌍', color: '#EC4899', level: 'Beginner', ttsLang: 'swa', lessons: [
    { title: 'Greetings', items: [m('“Asante” means…', 'Thank you', 'Sorry', 'Goodbye'), m('How do you say “yes”?', 'Ndiyo', 'Hapana', 'Karibu'), b('Say “Thank you very much”', 'Asante sana', 'Karibu', 'Hapana'), m('“Habari?” means…', 'How are you?', 'Where is it?', 'Who are you?')] },
    { title: 'Food and school', items: [m('“Maji” means…', 'Water', 'Food', 'Milk'), m('“Chakula” means…', 'Food', 'Water', 'School'), m('“Shule” means…', 'School', 'Market', 'House'), b('Say “I want water”', 'Nataka maji', 'chakula', 'Asante')] }] },
  { id: 'phone', cat: 'Digital Literacy', title: 'Using a Phone Safely', emoji: '📱', color: '#6366F1', level: 'Primary 5', lessons: [] },
  { id: 'typing', cat: 'Digital Literacy', title: 'Typing and Keyboards', emoji: '⌨️', color: '#14B8A6', level: 'Primary 6', lessons: [] },
  { id: 'victoria', cat: 'Social Studies', title: 'Lake Victoria and the Nile', emoji: '🌊', color: '#0284C7', level: 'Primary 5', lessons: [] },
];

export const getCourse = (id: string | null): Course | undefined => COURSES.find((c) => c.id === id);
