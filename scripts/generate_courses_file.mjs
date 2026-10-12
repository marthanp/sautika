import fs from 'node:fs/promises';

const COURSES_DATA = `import type { Category, Course, Item, LevelGroup } from '@/types';

const m = (q: string, a: string, d1: string, d2: string): Item => ({ k: 'm', q, a, d: [d1, d2] });
const b = (q: string, a: string, ...x: string[]): Item => ({ k: 'b', q, a, x });

export const LEVEL_GROUPS: LevelGroup[] = [
  'Baby class to top class',
  'P.1 to P.4',
  'P.5 to P.7',
  'S.1 to S.4',
  'S.5 to S.6',
];

export const CATEGORIES: Category[] = [
  'Science',
  'Math',
  'Languages',
  'Digital Literacy',
  'Social Studies',
];

export const COURSES: Course[] = [
  // =========================================================================
  // 1. BABY CLASS TO TOP CLASS (NURSERY / EARLY CHILDHOOD)
  // =========================================================================
  {
    id: 'baby-health',
    cat: 'Science',
    title: 'Health Habits & My Body',
    emoji: '🧼',
    color: '#10B981',
    level: 'Baby Class',
    levelGroup: 'Baby class to top class',
    author: 'Sharebility Early Years Team',
    sourceUrl: 'https://sharebility.net/download-category/baby/',
    description: 'Essential hygiene, daily routines and body care for young learners.',
    lessons: [
      {
        title: 'Washing Hands Clean',
        items: [
          m('What do we use to wash our hands clean?', 'Soap and clean water', 'Sand and stones', 'Ink and paint'),
          m('When should we wash our hands?', 'Before eating food', 'Only at bedtime', 'Never'),
          m('What do clean hands protect us from?', 'Germs and sickness', 'Sunshine', 'Growing taller'),
          b('Build the good habit', 'Wash hands with soap', 'mud', 'dirty'),
        ],
      },
      {
        title: 'Parts of the Body',
        items: [
          m('Which body part helps us see colors and pictures?', 'Eyes', 'Ears', 'Feet'),
          m('We hear birds singing with our…', 'Ears', 'Nose', 'Elbows'),
          m('We smell sweet flowers using our…', 'Nose', 'Hair', 'Fingers'),
          b('Build the sentence', 'We see with eyes', 'bark', 'run'),
        ],
      },
    ],
  },
  {
    id: 'baby-numbers',
    cat: 'Math',
    title: 'Numbers & Fun Counting',
    emoji: '🔢',
    color: '#2563EB',
    level: 'Baby Class',
    levelGroup: 'Baby class to top class',
    author: 'Sharebility Early Years Team',
    sourceUrl: 'https://sharebility.net/download-category/baby/',
    description: 'Learn number recognition 1 to 5, basic shapes and size comparisons.',
    lessons: [
      {
        title: 'Counting 1 to 5',
        items: [
          m('How many noses do you have?', '1', '4', '10'),
          m('How many hands do you have?', '2', '5', '8'),
          m('Which number comes after 1?', '2', '0', '5'),
          b('Build the count', 'One two three four', 'cat', 'red'),
        ],
      },
      {
        title: 'Shapes and Sizes',
        items: [
          m('Which shape looks like a round football?', 'Circle', 'Square', 'Triangle'),
          m('Which is bigger?', 'An elephant', 'An ant', 'A fly'),
          m('A box with four equal sides is a…', 'Square', 'Wheel', 'Star'),
          b('Build the sentence', 'A ball is round', 'cold', 'sharp'),
        ],
      },
    ],
  },
  {
    id: 'baby-words',
    cat: 'Languages',
    title: 'Language & First Words',
    emoji: '🗣️',
    color: '#8B5CF6',
    level: 'Baby Class',
    levelGroup: 'Baby class to top class',
    author: 'Sharebility Early Years Team',
    sourceUrl: 'https://sharebility.net/download-category/baby/',
    description: 'Friendly greetings, polite words and naming familiar family and animals.',
    lessons: [
      {
        title: 'Greetings & Polite Words',
        items: [
          m('What do you say in the morning to your teacher?', 'Good morning', 'Good night', 'Go away'),
          m('What do you say when someone gives you a gift?', 'Thank you', 'No', 'Wait'),
          m('When greeting a friend politely, we…', 'Smile and wave', 'Cry', 'Shout loudly'),
          b('Say it politely', 'Thank you very much', 'rude', 'kick'),
        ],
      },
      {
        title: 'Family & Home',
        items: [
          m('Who takes loving care of us at home?', 'Mother and father', 'A tiger', 'A stranger'),
          m('Where do we sleep at night?', 'In a warm bed', 'In the river', 'In a tree'),
          m('A baby dog is called a…', 'Puppy', 'Kitten', 'Calf'),
          b('Build the sentence', 'I love my family', 'stone', 'car'),
        ],
      },
    ],
  },
  {
    id: 'middle-environment',
    cat: 'Science',
    title: 'Our Natural Environment',
    emoji: '🌳',
    color: '#059669',
    level: 'Middle Class',
    levelGroup: 'Baby class to top class',
    author: 'Sharebility Pre-Primary Panel',
    sourceUrl: 'https://sharebility.net/download-category/middle/',
    description: 'Explore domestic animals, weather, plants and our surrounding nature.',
    lessons: [
      {
        title: 'Domestic Animals',
        items: [
          m('Which domestic animal gives us sweet fresh milk?', 'Cow', 'Lion', 'Snake'),
          m('Which animal guards our home and barks?', 'Dog', 'Fish', 'Frog'),
          m('Which animal says “meow” and catches mice?', 'Cat', 'Elephant', 'Giraffe'),
          b('Build the sentence', 'A cow gives milk', 'swim', 'metal'),
        ],
      },
      {
        title: 'Weather & Plants',
        items: [
          m('What shines bright and gives us warm sunlight?', 'The sun', 'A lamp', 'The ground'),
          m('What falls from clouds to water the crops?', 'Rain', 'Sand', 'Leaves'),
          m('What color are most fresh leaves on trees?', 'Green', 'Purple', 'Silver'),
          b('Build the sentence', 'Plants drink rain water', 'fly', 'car'),
        ],
      },
    ],
  },
  {
    id: 'middle-math',
    cat: 'Math',
    title: 'Numbers & Basic Patterns',
    emoji: '🎈',
    color: '#F59E0B',
    level: 'Middle Class',
    levelGroup: 'Baby class to top class',
    author: 'Sharebility Pre-Primary Panel',
    sourceUrl: 'https://sharebility.net/download-category/middle/',
    description: 'Counting from 1 to 10, pattern recognition and grouping objects.',
    lessons: [
      {
        title: 'Counting to Ten',
        items: [
          m('How many fingers do you have on both hands?', '10', '5', '20'),
          m('Which number comes right after 4?', '5', '3', '7'),
          m('If you have 2 mangoes and get 1 more, you have…', '3', '1', '5'),
          b('Count the numbers', 'One two three four five', 'tree', 'sun'),
        ],
      },
      {
        title: 'Patterns & Groups',
        items: [
          m('Which group has more: 5 bananas or 2 bananas?', '5 bananas', '2 bananas', 'Both are same'),
          m('What comes next in the pattern: Red, Blue, Red, …?', 'Blue', 'Green', 'Yellow'),
          m('Matching shoes means finding…', 'A pair of two', 'One shoe only', 'Ten shoes'),
          b('Build the sentence', 'Match the same shapes', 'cold', 'spill'),
        ],
      },
    ],
  },
  {
    id: 'top-math',
    cat: 'Math',
    title: 'Mathematical Concepts & Pre-Math',
    emoji: '📐',
    color: '#D97706',
    level: 'Top Class',
    levelGroup: 'Baby class to top class',
    author: 'Pearl Educational Consult & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/top/',
    description: 'Addition with pictures, number bonds up to 20, and foundational math concepts.',
    lessons: [
      {
        title: 'Addition with Pictures',
        items: [
          m('3 apples + 2 apples =', '5 apples', '4 apples', '6 apples'),
          m('4 birds on a branch + 1 joins them =', '5 birds', '3 birds', '2 birds'),
          m('Which sign means putting numbers together?', 'Plus (+)', 'Minus (-)', 'Times (×)'),
          b('Solve the sum', 'Two plus three is five', 'blue', 'stone'),
        ],
      },
      {
        title: 'Number Bonds & Order',
        items: [
          m('Which two numbers make 5 together?', '2 and 3', '1 and 1', '4 and 4'),
          m('Who is in front: 1st or 3rd place?', '1st place', '3rd place', 'Last place'),
          m('Take 1 away from 4. How many remain?', '3', '5', '2'),
          b('Build the sentence', 'Four take away one is three', 'loud', 'dog'),
        ],
      },
    ],
  },
  {
    id: 'top-reading',
    cat: 'Languages',
    title: 'Early Reading & Phonics',
    emoji: '📖',
    color: '#7C3AED',
    level: 'Top Class',
    levelGroup: 'Baby class to top class',
    author: 'Pearl Educational Consult & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/top/',
    description: 'Three-letter CVC blending, sight words, and reading first full sentences.',
    lessons: [
      {
        title: 'Blending Three-Letter Words',
        items: [
          m('Blend the sounds /c/ /a/ /t/:', 'Cat', 'Car', 'Cup'),
          m('Blend the sounds /s/ /u/ /n/:', 'Sun', 'Sad', 'Sit'),
          m('Which word rhymes with “pen”?', 'Hen', 'Pig', 'Dog'),
          b('Read the words', 'The cat sat on mat', 'fly', 'rain'),
        ],
      },
      {
        title: 'Reading First Sentences',
        items: [
          m('What punctuation mark ends a sentence?', 'Full stop (.)', 'Comma (,)', 'Plus (+)'),
          m('“The dog can run.” Who can run?', 'The dog', 'The pot', 'The rug'),
          m('Every sentence begins with a…', 'Capital letter', 'Small letter', 'Number'),
          b('Make a sentence', 'I can read my book', 'spoon', 'door'),
        ],
      },
    ],
  },
  {
    id: 'top-social',
    cat: 'Social Studies',
    title: 'My Community & Helpers',
    emoji: '🤝',
    color: '#EA580C',
    level: 'Top Class',
    levelGroup: 'Baby class to top class',
    author: 'Divine Education Centre & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/top/',
    description: 'Understand community helpers, school rules, sharing and road safety.',
    lessons: [
      {
        title: 'Community Helpers',
        items: [
          m('Who teaches children to read and write at school?', 'Teacher', 'Pilot', 'Baker'),
          m('Who treats sick people at the hospital or clinic?', 'Doctor or nurse', 'Farmer', 'Carpenter'),
          m('Who keeps peace and safety in our community?', 'Police officer', 'Fisherman', 'Chef'),
          b('Build the sentence', 'Teachers help us learn', 'jump', 'cold'),
        ],
      },
      {
        title: 'Safety and Sharing',
        items: [
          m('Before crossing the road, we look right, left and…', 'Right again', 'Up at birds', 'Nowhere'),
          m('When playing with toys with friends, we should…', 'Share nicely', 'Fight and snatch', 'Hide them'),
          m('Where do we put litter and fruit peelings?', 'In the dustbin', 'On the classroom floor', 'On the path'),
          b('Keep it tidy', 'Put trash in the bin', 'river', 'sky'),
        ],
      },
    ],
  },

  // =========================================================================
  // 2. P.1 TO P.4 (LOWER PRIMARY)
  // =========================================================================
  {
    id: 'p1-literacy',
    cat: 'Languages',
    title: 'Primary 1 Literacy & Reading',
    emoji: '📚',
    color: '#6366F1',
    level: 'Primary 1',
    levelGroup: 'P.1 to P.4',
    author: 'Spectrum Education Consultancy & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-one/',
    description: 'Reading comprehension, sight words, pronouns, and sentence construction for P.1.',
    lessons: [
      {
        title: 'Nouns and Pronouns',
        items: [
          m('Which word is a naming word (noun)?', 'School', 'Quickly', 'Because'),
          m('Which pronoun replaces a boy’s name like “John”?', 'He', 'She', 'It'),
          m('Which pronoun replaces a girl’s name like “Sarah”?', 'She', 'He', 'They'),
          b('Build the sentence', 'She is a smart pupil', 'swim', 'yesterday'),
        ],
      },
      {
        title: 'Action Words (Verbs)',
        items: [
          m('Which of these is an action verb?', 'Jump', 'Chair', 'Blue'),
          m('Fish swim in water. What is the action word?', 'Swim', 'Fish', 'Water'),
          m('Children ___ to school every weekday morning.', 'Walk', 'Table', 'Red'),
          b('Make the sentence', 'Children read books at school', 'pot', 'sky'),
        ],
      },
    ],
  },
  {
    id: 'p1-math',
    cat: 'Math',
    title: 'Primary 1 Numeracy & Addition',
    emoji: '➕',
    color: '#0284C7',
    level: 'Primary 1',
    levelGroup: 'P.1 to P.4',
    author: 'Cranes Examinations Board & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-one/',
    description: 'Place value of tens and ones, single and double digit addition, and money basics.',
    lessons: [
      {
        title: 'Place Value: Tens and Ones',
        items: [
          m('In the number 25, how many tens are there?', '2 tens', '5 tens', '20 tens'),
          m('1 ten and 7 ones equals…', '17', '71', '8'),
          m('Which number is bigger: 34 or 43?', '43', '34', 'They are equal'),
          b('Solve the sum', 'Ten plus four equals fourteen', 'cold', 'rain'),
        ],
      },
      {
        title: 'Addition & Word Problems',
        items: [
          m('Aisha has 8 pencils. Her mother gives her 5 more. How many has she in total?', '13', '12', '14'),
          m('15 + 4 =', '19', '18', '20'),
          m('Subtract 6 from 10:', '4', '5', '6'),
          b('Build the sentence', 'Count your items carefully', 'sleep', 'door'),
        ],
      },
    ],
  },
  {
    id: 'p2-science',
    cat: 'Science',
    title: 'Primary 2 Science & Health',
    emoji: '🌿',
    color: '#16A34A',
    level: 'Primary 2',
    levelGroup: 'P.1 to P.4',
    author: 'Creative Educational Service & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-two/',
    description: 'Human five senses, disease prevention, clean water and food hygiene for P.2.',
    lessons: [
      {
        title: 'Our Five Senses',
        items: [
          m('Which sense organ helps us taste sweet mangoes?', 'Tongue', 'Nose', 'Ears'),
          m('Our skin is the sense organ for…', 'Touch and feeling', 'Seeing', 'Hearing'),
          m('How many senses do human beings have?', '5', '3', '7'),
          b('Build the sentence', 'The tongue tastes sweet food', 'fly', 'burn'),
        ],
      },
      {
        title: 'Clean Water and Good Health',
        items: [
          m('Boiling drinking water kills…', 'Harmful germs', 'Good taste', 'Vitamins'),
          m('Mosquitoes spread which dangerous disease?', 'Malaria', 'Flu', 'Measles'),
          m('We sleep under an insecticide-treated mosquito net to prevent…', 'Mosquito bites', 'Sunburn', 'Colds'),
          b('Build the habit', 'Sleep under a mosquito net', 'dirt', 'smoke'),
        ],
      },
    ],
  },
  {
    id: 'p2-math',
    cat: 'Math',
    title: 'Primary 2 Math & Shillings',
    emoji: '🪙',
    color: '#F97316',
    level: 'Primary 2',
    levelGroup: 'P.1 to P.4',
    author: 'Cranes Examinations Board & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-two/',
    description: 'Money word problems with Uganda Shillings, time on analog clocks, and multiplication.',
    lessons: [
      {
        title: 'Uganda Shillings & Market Math',
        items: [
          m('One pen costs 500 Shillings. How much do two pens cost?', '1000 Shillings', '700 Shillings', '1500 Shillings'),
          m('You buy a 300 Shilling sweet with a 500 Shilling coin. Your change is…', '200 Shillings', '300 Shillings', '100 Shillings'),
          m('Which coin is larger in value: 1000 or 500 Shillings?', '1000 Shillings', '500 Shillings', 'They are equal'),
          b('Solve the word problem', 'Count your balance and change', 'throw', 'waste'),
        ],
      },
      {
        title: 'Telling Time & Multiplication',
        items: [
          m('How many minutes are in 1 hour?', '60 minutes', '30 minutes', '100 minutes'),
          m('3 groups of 4 oranges equals (3 × 4):', '12', '7', '10'),
          m('When the long hand points to 12 and short hand to 3, the time is…', '3 o’clock', '12 o’clock', '6 o’clock'),
          b('State the time', 'The clock shows three o’clock', 'sing', 'book'),
        ],
      },
    ],
  },
  {
    id: 'p3-science',
    cat: 'Science',
    title: 'Primary 3 Science: Plants & Soil',
    emoji: '🔬',
    color: '#0D9488',
    level: 'Primary 3',
    levelGroup: 'P.1 to P.4',
    author: 'Creative Educational Service & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-three/',
    description: 'Parts of flowering plants, soil types in Uganda, and vectors of common diseases.',
    lessons: [
      {
        title: 'Flowering Plants & Roots',
        items: [
          m('Which part of the plant anchors it firmly in the soil?', 'Roots', 'Leaves', 'Flowers'),
          m('Leaves make food for the plant using sunlight and…', 'Chlorophyll', 'Plastic', 'Sand'),
          m('Which gas do plants release that humans breathe in?', 'Oxygen', 'Carbon monoxide', 'Smoke'),
          b('Build the sentence', 'Roots absorb water from soil', 'sing', 'stone'),
        ],
      },
      {
        title: 'Soils in Uganda',
        items: [
          m('Which soil type is best for growing crops because of rich humus?', 'Loam soil', 'Sand soil', 'Clay soil'),
          m('Clay soil is widely used in our community for…', 'Making pots and bricks', 'Growing cassava', 'Filter beds'),
          m('Sand particles are…', 'Large and rough', 'Very sticky and tiny', 'Liquid'),
          b('Build the fact', 'Loam soil supports crop growth', 'burn', 'break'),
        ],
      },
    ],
  },
  {
    id: 'p3-social',
    cat: 'Social Studies',
    title: 'Primary 3 Social Studies: Our District',
    emoji: '🗺️',
    color: '#E11D48',
    level: 'Primary 3',
    levelGroup: 'P.1 to P.4',
    author: 'Cranes Examinations Board & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-three/',
    description: 'Compass points, physical features of Uganda districts, and leaders in our community.',
    lessons: [
      {
        title: 'Cardinal Points of the Compass',
        items: [
          m('The sun rises in the…', 'East', 'West', 'North'),
          m('The sun sets in the…', 'West', 'East', 'South'),
          m('How many main cardinal points are on a compass?', '4 (N, E, S, W)', '2', '8'),
          b('Name the directions', 'North South East and West', 'cold', 'loud'),
        ],
      },
      {
        title: 'Physical Features in Our District',
        items: [
          m('A large natural stream of water flowing towards a lake or sea is a…', 'River', 'Pond', 'Well'),
          m('High land with steep sides that rises above the surrounding area is a…', 'Mountain or hill', 'Valley', 'Plain'),
          m('Why are trees and forests important around lakes?', 'They bring rainfall and prevent erosion', 'They dry up water', 'They chase away fish'),
          b('State the principle', 'Protect trees and water bodies', 'cut', 'burn'),
        ],
      },
    ],
  },
  {
    id: 'p4-math',
    cat: 'Math',
    title: 'Primary 4 Mathematics & Fractions',
    emoji: '🥧',
    color: '#2563EB',
    level: 'Primary 4',
    levelGroup: 'P.1 to P.4',
    author: 'Centeenart Examination Board & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-four/',
    description: 'Fractions (halves, quarters, eighths), long division, and multiplication tables to 12.',
    lessons: [
      {
        title: 'Fractions and Parts of a Whole',
        items: [
          m('In the fraction 3/4, the top number (3) is called the…', 'Numerator', 'Denominator', 'Quotient'),
          m('In the fraction 3/4, the bottom number (4) is called the…', 'Denominator', 'Numerator', 'Remainder'),
          m('Which fraction is equivalent to 1/2?', '2/4', '1/3', '3/5'),
          b('Build the fraction rule', 'Fractions show equal parts of whole', 'sour', 'break'),
        ],
      },
      {
        title: 'Multiplication & Long Division',
        items: [
          m('12 × 5 =', '60', '50', '55'),
          m('Divide 48 by 6:', '8', '7', '9'),
          m('If 3 books cost 6,000 Shillings, how much is 1 book?', '2,000 Shillings', '3,000 Shillings', '1,500 Shillings'),
          b('Solve the problem', 'Divide sixty by five equals twelve', 'red', 'wind'),
        ],
      },
    ],
  },
  {
    id: 'p4-english',
    cat: 'Languages',
    title: 'Primary 4 English Grammar & Tenses',
    emoji: '✍️',
    color: '#9333EA',
    level: 'Primary 4',
    levelGroup: 'P.1 to P.4',
    author: 'Surekey Examinations Board & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-four/',
    description: 'Past and continuous tenses, prepositions, plurals, and reading comprehension.',
    lessons: [
      {
        title: 'Past Tense & Irregular Verbs',
        items: [
          m('What is the past tense of “go”?', 'Went', 'Goed', 'Gone'),
          m('What is the past tense of “eat”?', 'Ate', 'Eaten', 'Eated'),
          m('Yesterday the pupils ___ football after class.', 'Played', 'Play', 'Playing'),
          b('Build the sentence', 'We went to the school library', 'chair', 'soup'),
        ],
      },
      {
        title: 'Prepositions and Opposites',
        items: [
          m('The cat is sleeping ___ the table.', 'Under', 'Between', 'Among'),
          m('What is the opposite of “strong”?', 'Weak', 'Soft', 'Heavy'),
          m('She shared the mango ___ her two sisters.', 'Between', 'Among', 'Through'),
          b('Build the sentence', 'The ball rolled under the chair', 'tree', 'sun'),
        ],
      },
    ],
  },

  // =========================================================================
  // 3. P.5 TO P.7 (UPPER PRIMARY)
  // =========================================================================
  {
    id: 'p5-science',
    cat: 'Science',
    title: 'Primary 5 Integrated Science',
    emoji: '🌱',
    color: '#15803D',
    level: 'Primary 5',
    levelGroup: 'P.5 to P.7',
    author: 'Spectrum Examinations Hub & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-five/',
    description: 'Photosynthesis, human digestive system, soil erosion, and crop husbandry.',
    lessons: [
      {
        title: 'Photosynthesis and Plant Nutrition',
        items: [
          m('What green pigment absorbs sunlight in leaves?', 'Chlorophyll', 'Hemoglobin', 'Cellulose'),
          m('What are the raw materials needed for photosynthesis?', 'Carbon dioxide and water', 'Oxygen and sand', 'Nitrogen and smoke'),
          m('The simple sugar produced during photosynthesis is…', 'Glucose', 'Salt', 'Fat'),
          b('State the process', 'Green plants manufacture food by photosynthesis', 'laugh', 'loud'),
        ],
      },
      {
        title: 'Human Digestive System',
        items: [
          m('Where does digestion of food begin in the human body?', 'Mouth', 'Stomach', 'Small intestine'),
          m('Which enzyme in saliva breaks down cooked starch?', 'Salivary amylase (ptyalin)', 'Pepsin', 'Lipase'),
          m('Most absorption of digested food takes place in the…', 'Small intestine (ileum)', 'Large intestine', 'Esophagus'),
          b('Explain the process', 'Food nutrients are absorbed in intestines', 'fly', 'burn'),
        ],
      },
    ],
  },
  {
    id: 'p5-math',
    cat: 'Math',
    title: 'Primary 5 Mathematics & Geometry',
    emoji: '📐',
    color: '#0284C7',
    level: 'Primary 5',
    levelGroup: 'P.5 to P.7',
    author: 'Surekey Examinations Board & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-five/',
    description: 'LCM, GCF, decimals, percentages, angles, perimeter and area calculation.',
    lessons: [
      {
        title: 'LCM and GCF (Factors & Multiples)',
        items: [
          m('Find the Greatest Common Factor (GCF) of 12 and 18:', '6', '3', '36'),
          m('Find the Lowest Common Multiple (LCM) of 4 and 6:', '12', '24', '10'),
          m('A prime number has exactly how many factors?', 'Two factors (1 and itself)', 'Three factors', 'Zero factors'),
          b('Solve the concept', 'Prime numbers have only two factors', 'pot', 'door'),
        ],
      },
      {
        title: 'Perimeter and Area of Rectangles',
        items: [
          m('A rectangle has length 8 cm and width 5 cm. Its area is…', '40 cm²', '26 cm', '13 cm²'),
          m('The perimeter of a square with side 6 cm is…', '24 cm', '36 cm', '12 cm'),
          m('Formula for the perimeter of a rectangle is…', '2 × (Length + Width)', 'Length × Width', 'Length + Width'),
          b('State the formula', 'Area equals length times width', 'water', 'sun'),
        ],
      },
    ],
  },
  {
    id: 'p6-science',
    cat: 'Science',
    title: 'Primary 6 Energy & Living Systems',
    emoji: '⚡',
    color: '#D97706',
    level: 'Primary 6',
    levelGroup: 'P.5 to P.7',
    author: 'Spectrum Examinations Hub & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-six/',
    description: 'Solar energy, circulatory & respiratory systems, simple machines and electricity.',
    lessons: [
      {
        title: 'Solar Energy & Electric Circuits',
        items: [
          m('Solar panels convert sunlight directly into…', 'Electrical energy', 'Sound energy', 'Nuclear fuel'),
          m('Which component stores electricity for use during the night?', 'Battery', 'Bulb', 'Switch'),
          m('A complete unbroken path for electric current is called a…', 'Closed circuit', 'Open circuit', 'Short circuit'),
          b('Build the principle', 'Solar panels provide clean renewable energy', 'dirty', 'heavy'),
        ],
      },
      {
        title: 'Circulatory and Respiratory Systems',
        items: [
          m('The muscular pump that circulates blood throughout the body is the…', 'Heart', 'Lungs', 'Liver'),
          m('Which blood cells fight disease-causing pathogens?', 'White blood cells', 'Red blood cells', 'Platelets'),
          m('Gas exchange takes place in tiny air sacs in the lungs called…', 'Alveoli', 'Bronchi', 'Arteries'),
          b('State the function', 'The heart pumps oxygenated blood', 'wood', 'stone'),
        ],
      },
    ],
  },
  {
    id: 'p6-sst',
    cat: 'Social Studies',
    title: 'Primary 6 Social Studies: East Africa',
    emoji: '🌍',
    color: '#C2410C',
    level: 'Primary 6',
    levelGroup: 'P.5 to P.7',
    author: 'E-Learn Consult & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-six/',
    description: 'East African Community, Rift Valley features, climate zones, and trade in EA.',
    lessons: [
      {
        title: 'East African Community (EAC)',
        items: [
          m('Which city hosts the headquarters of the East African Community?', 'Arusha (Tanzania)', 'Nairobi (Kenya)', 'Kampala (Uganda)'),
          m('Which of these is a founding member country of the EAC?', 'Uganda, Kenya, Tanzania', 'Egypt, Sudan, Chad', 'Angola, Zambia, Ghana'),
          m('What is the main economic goal of the EAC common market?', 'Free movement of goods, services and people', 'Closing national borders', 'Higher tariffs'),
          b('State the goal', 'Promote trade across East African nations', 'fire', 'spill'),
        ],
      },
      {
        title: 'Physical Geography of East Africa',
        items: [
          m('What is the largest freshwater lake in Africa?', 'Lake Victoria', 'Lake Tanganyika', 'Lake Albert'),
          m('The highest mountain in East Africa is…', 'Mount Kilimanjaro', 'Mount Rwenzori', 'Mount Elgon'),
          m('Which river originates from Lake Victoria and flows northward?', 'River Nile', 'River Congo', 'River Zambezi'),
          b('State the geographical fact', 'The River Nile flows from Lake Victoria', 'cold', 'iron'),
        ],
      },
    ],
  },
  {
    id: 'p7-math',
    cat: 'Math',
    title: 'Primary 7 PLE Mathematics Revision',
    emoji: '🏆',
    color: '#1D4ED8',
    level: 'Primary 7',
    levelGroup: 'P.5 to P.7',
    author: 'Bushenyi District Mock Committee & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-seven/',
    description: 'Algebraic equations, speed/distance/time, circles, integers, and PLE past paper mastery.',
    lessons: [
      {
        title: 'Algebra and Linear Equations',
        items: [
          m('Solve for x: 3x + 7 = 22', 'x = 5', 'x = 6', 'x = 4'),
          m('Solve for y: 2(y - 4) = 10', 'y = 9', 'y = 7', 'y = 8'),
          m('Simplify: 4a + 3b - 2a + b', '2a + 4b', '6a + 4b', '2a + 2b'),
          b('Solve the equation', 'Three x plus seven equals twenty two', 'cloud', 'burn'),
        ],
      },
      {
        title: 'Speed, Distance and Time',
        items: [
          m('A bus travels 180 km in 3 hours. Its average speed is…', '60 km/h', '50 km/h', '70 km/h'),
          m('Formula for calculating speed is…', 'Distance ÷ Time', 'Distance × Time', 'Time ÷ Distance'),
          m('How far does a car travel in 2 hours at 80 km/h?', '160 km', '100 km', '120 km'),
          b('State the formula', 'Speed equals distance divided by time', 'glass', 'heavy'),
        ],
      },
    ],
  },
  {
    id: 'p7-science',
    cat: 'Science',
    title: 'Primary 7 PLE Integrated Science',
    emoji: '🧬',
    color: '#047857',
    level: 'Primary 7',
    levelGroup: 'P.5 to P.7',
    author: 'Divine Hope & Shine Star Mock & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-seven/',
    description: 'Reproduction, ecosystems, magnetism, disease control, and national PLE exam preparation.',
    lessons: [
      {
        title: 'Immunity & Immunisation',
        items: [
          m('The ability of the human body to resist disease infection is called…', 'Immunity', 'Respiration', 'Excretion'),
          m('Which vaccine is given at birth to prevent tuberculosis?', 'BCG vaccine', 'Polio vaccine', 'DPT vaccine'),
          m('Which vaccine protects children against measles?', 'Measles vaccine (at 9 months)', 'Tetanus toxoid', 'Oral rehydration'),
          b('State the health rule', 'Immunisation protects children from killer diseases', 'lazy', 'dark'),
        ],
      },
      {
        title: 'Magnetism & Electricity',
        items: [
          m('Like magnetic poles (e.g. North and North) always…', 'Repel each other', 'Attract each other', 'Neutralize'),
          m('Unlike magnetic poles (North and South) always…', 'Attract each other', 'Repel each other', 'Disappear'),
          m('Materials that allow electric current to pass freely are called…', 'Conductors', 'Insulators', 'Semi-magnets'),
          b('State the magnetic law', 'Like poles repel and unlike poles attract', 'sour', 'liquid'),
        ],
      },
    ],
  },

  // =========================================================================
  // 4. S.1 TO S.4 (LOWER SECONDARY / O-LEVEL)
  // =========================================================================
  {
    id: 's1-biology',
    cat: 'Science',
    title: 'Senior 1 Biology & Cell Biology',
    emoji: '🧫',
    color: '#059669',
    level: 'Senior 1',
    levelGroup: 'S.1 to S.4',
    author: 'Kiyala High School & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/senior-one/',
    description: 'Cell structures, microscopy, classification of living organisms and new curriculum activities.',
    lessons: [
      {
        title: 'Cell Organelles: Plant vs Animal',
        items: [
          m('Which organelle is present in plant cells but absent in animal cells?', 'Cell wall & chloroplast', 'Mitochondria', 'Cell membrane'),
          m('The “powerhouse” of the cell where ATP energy is generated is the…', 'Mitochondria', 'Ribosome', 'Golgi apparatus'),
          m('The control center of the cell containing genetic DNA is the…', 'Nucleus', 'Vacuole', 'Cytoplasm'),
          b('State the biological truth', 'Plant cells have cellulose cell walls', 'loud', 'hot'),
        ],
      },
      {
        title: 'Microscopy and Magnification',
        items: [
          m('If the eyepiece lens is 10× and objective lens is 40×, total magnification is…', '400×', '50×', '40×'),
          m('Which part of the microscope regulates the amount of light entering the stage?', 'Diaphragm', 'Coarse adjustment knob', 'Arm'),
          m('Specimens placed on a glass slide are covered with a thin…', 'Cover slip', 'Beaker', 'Petri dish'),
          b('Calculate magnification', 'Total magnification equals eyepiece times objective', 'soft', 'heavy'),
        ],
      },
    ],
  },
  {
    id: 's1-math',
    cat: 'Math',
    title: 'Senior 1 Mathematics: Sets & Algebra',
    emoji: '📊',
    color: '#2563EB',
    level: 'Senior 1',
    levelGroup: 'S.1 to S.4',
    author: 'Kiyala High School & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/senior-one/',
    description: 'Set theory, Venn diagrams, integers, algebraic substitution and Cartesian plane geometry.',
    lessons: [
      {
        title: 'Set Theory & Venn Diagrams',
        items: [
          m('The intersection of set A and set B (A ∩ B) consists of…', 'Elements belonging to both A and B', 'All elements in A or B', 'Elements in neither'),
          m('The union of set A and set B (A ∪ B) consists of…', 'Elements belonging to A or B or both', 'Only elements in A', 'Empty elements'),
          m('A set containing no elements at all is called an…', 'Empty or null set (∅)', 'Universal set', 'Subset'),
          b('Define intersection', 'Intersection contains common elements of both sets', 'burn', 'cloud'),
        ],
      },
      {
        title: 'Algebraic Expressions & Substitution',
        items: [
          m('If x = 3 and y = -2, find the value of 2x - 3y:', '12', '0', '6'),
          m('Expand the bracket: 3(2a + 5)', '6a + 15', '5a + 8', '6a + 5'),
          m('Solve for m: 4m - 8 = 16', 'm = 6', 'm = 4', 'm = 5'),
          b('Solve the algebra', 'Expand brackets by multiplying each term', 'cold', 'rain'),
        ],
      },
    ],
  },
  {
    id: 's2-physics',
    cat: 'Science',
    title: 'Senior 2 Physics: Mechanics & Matter',
    emoji: '🚀',
    color: '#4F46E5',
    level: 'Senior 2',
    levelGroup: 'S.1 to S.4',
    author: 'Nakaloke Islamic & RBBK & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/senior-two/',
    description: 'Forces, Newton’s laws of motion, pressure, Archimedes’ principle and energy transformations.',
    lessons: [
      {
        title: 'Newton’s Laws of Motion',
        items: [
          m('Newton’s Second Law states that force equals…', 'Mass × Acceleration (F = ma)', 'Mass ÷ Velocity', 'Work ÷ Time'),
          m('The SI unit of force is the…', 'Newton (N)', 'Joule (J)', 'Watt (W)'),
          m('The property of a body to resist changes in its state of motion is…', 'Inertia', 'Friction', 'Gravity'),
          b('State Newton’s law', 'Action and reaction are equal and opposite', 'glass', 'water'),
        ],
      },
      {
        title: 'Pressure in Fluids',
        items: [
          m('Pressure in a liquid depends on depth, acceleration due to gravity, and…', 'Liquid density (P = hρg)', 'Container volume', 'Surface area'),
          m('Archimedes’ principle states upthrust on a body equals the…', 'Weight of displaced fluid', 'Volume of the body', 'Depth of immersion'),
          m('The SI unit of pressure is the…', 'Pascal (Pa) or N/m²', 'Newton (N)', 'Joule (J)'),
          b('State Archimedes principle', 'Upthrust equals weight of fluid displaced', 'metal', 'burn'),
        ],
      },
    ],
  },
  {
    id: 's2-chemistry',
    cat: 'Science',
    title: 'Senior 2 Chemistry: Atomic Structure',
    emoji: '🧪',
    color: '#7C3AED',
    level: 'Senior 2',
    levelGroup: 'S.1 to S.4',
    author: 'Nakaloke Islamic & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/senior-two/',
    description: 'Subatomic particles, electron configuration, periodic trends, and chemical bonding.',
    lessons: [
      {
        title: 'Atomic Structure & Subatomic Particles',
        items: [
          m('Which subatomic particle has a positive electrical charge?', 'Proton', 'Electron', 'Neutron'),
          m('Where are protons and neutrons located in an atom?', 'In the central nucleus', 'In electron shells', 'Outside the atom'),
          m('The atomic number of an element is the number of…', 'Protons in its nucleus', 'Neutrons', 'Mass number'),
          b('State the structure', 'Electrons orbit around the dense nucleus', 'cold', 'liquid'),
        ],
      },
      {
        title: 'Periodic Table & Chemical Bonding',
        items: [
          m('Elements in Group 1 of the periodic table are known as…', 'Alkali metals', 'Halogens', 'Noble gases'),
          m('Ionic bonding occurs between a metal and non-metal via…', 'Transfer of electrons', 'Sharing of electrons', 'Proton exchange'),
          m('Covalent bonding occurs when non-metal atoms…', 'Share electron pairs', 'Gain protons', 'Lose neutrons'),
          b('Describe covalent bond', 'Covalent bonds involve shared electron pairs', 'wood', 'dust'),
        ],
      },
    ],
  },
  {
    id: 's3-ict',
    cat: 'Digital Literacy',
    title: 'Senior 3 ICT & Computer Systems',
    emoji: '💻',
    color: '#0891B2',
    level: 'Senior 3',
    levelGroup: 'S.1 to S.4',
    author: 'KABS ICT Resources Center & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/senior-three/',
    description: 'Hardware architecture, operating systems, networks, cybersecurity and algorithm logic.',
    lessons: [
      {
        title: 'Computer Architecture & Processing',
        items: [
          m('Which processor component carries out arithmetic calculations and logical decisions?', 'ALU (Arithmetic Logic Unit)', 'RAM', 'Hard Drive'),
          m('Volatile primary memory that loses data when power is switched off is…', 'RAM (Random Access Memory)', 'ROM', 'Flash Drive'),
          m('Which bus transmits memory addresses between CPU and RAM?', 'Address Bus', 'Power cord', 'USB Cable'),
          b('Describe the CPU', 'The central processing unit executes computer instructions', 'rain', 'slow'),
        ],
      },
      {
        title: 'Computer Networks and Cybersecurity',
        items: [
          m('A network covering a small geographical area like a school lab is a…', 'LAN (Local Area Network)', 'WAN', 'MAN'),
          m('What security measure scrambles data to prevent unauthorized reading during transmission?', 'Encryption', 'Compression', 'Defragmentation'),
          m('Malicious software designed to disrupt or steal computer data is termed…', 'Malware (Viruses, Trojans)', 'Hardware', 'Firmware'),
          b('State the security rule', 'Use strong passwords and encrypt sensitive data', 'tree', 'stone'),
        ],
      },
    ],
  },
  {
    id: 's3-history',
    cat: 'Social Studies',
    title: 'Senior 3 History & Political Education',
    emoji: '🏛️',
    color: '#B45309',
    level: 'Senior 3',
    levelGroup: 'S.1 to S.4',
    author: 'Oxford Muslim High & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/senior-three/',
    description: 'East African pre-colonial kingdoms, colonial treaties, and constitutional developments in Uganda.',
    lessons: [
      {
        title: 'The 1900 Buganda Agreement',
        items: [
          m('Who signed the 1900 Buganda Agreement on behalf of the British Crown?', 'Sir Harry Johnston', 'Captain Lugard', 'Lord Lugard'),
          m('What land system was introduced in Buganda by the 1900 Agreement?', 'Mailo and Crown land', 'Communal tenure', 'Freehold only'),
          m('What new direct tax was imposed on every adult male under the Agreement?', 'Hut and gun tax', 'Income tax', 'VAT'),
          b('State the historical fact', 'The 1900 agreement partitioned Buganda land into mailo', 'sweet', 'loud'),
        ],
      },
      {
        title: 'The Road to Uganda Independence (1962)',
        items: [
          m('On which date did Uganda attain national independence from British colonial rule?', 'October 9, 1962', 'June 1, 1963', 'December 12, 1961'),
          m('Who was the first Prime Minister of independent Uganda in 1962?', 'Milton Obote', 'Edward Mutesa II', 'Benedicto Kiwanuka'),
          m('What national symbol includes the Crested Crane and national motto “For God and My Country”?', 'Uganda National Coat of Arms', 'Bank of Uganda seal', 'East African flag'),
          b('State the national motto', 'For God and My Country is our motto', 'jump', 'cold'),
        ],
      },
    ],
  },
  {
    id: 's4-math',
    cat: 'Math',
    title: 'Senior 4 UCE Mathematics Exam Mastery',
    emoji: '📈',
    color: '#1E40AF',
    level: 'Senior 4',
    levelGroup: 'S.1 to S.4',
    author: 'Uganda Teachers Examination Scheme & UNEB',
    sourceUrl: 'https://sharebility.net/download-category/senior-four/',
    description: 'Quadratic equations, trigonometry, matrices, probability, and UCE national exam past papers.',
    lessons: [
      {
        title: 'Quadratic Equations & Formula',
        items: [
          m('The quadratic formula to solve ax² + bx + c = 0 is…', 'x = (-b ± √(b² - 4ac)) / (2a)', 'x = -b / 2a', 'x = √(b² + 4ac)'),
          m('What is the discriminant of a quadratic equation?', 'b² - 4ac', '2a + b', '4ac - b²'),
          m('If b² - 4ac > 0, the equation has…', 'Two distinct real roots', 'No real roots', 'One repeated root'),
          b('State the method', 'Solve quadratic equations using factorization or quadratic formula', 'pot', 'dark'),
        ],
      },
      {
        title: 'Trigonometry & Vectors',
        items: [
          m('In a right-angled triangle, sin θ is defined as…', 'Opposite ÷ Hypotenuse', 'Adjacent ÷ Hypotenuse', 'Opposite ÷ Adjacent'),
          m('What is the tangent of 45 degrees (tan 45°)?', '1', '0.5', '0'),
          m('The magnitude of vector (3, 4) is…', '√(3² + 4²) = 5', '7', '12'),
          b('State Pythagoras theorem', 'Hypotenuse squared equals sum of squares of two sides', 'cloud', 'burn'),
        ],
      },
    ],
  },
  {
    id: 's4-english',
    cat: 'Languages',
    title: 'Senior 4 English & Communication',
    emoji: '📝',
    color: '#BE185D',
    level: 'Senior 4',
    levelGroup: 'S.1 to S.4',
    author: 'UNEB & Sharebility Teachers Panel',
    sourceUrl: 'https://sharebility.net/download-category/senior-four/',
    description: 'Summary writing, argumentative essay structure, formal correspondence, and comprehension.',
    lessons: [
      {
        title: 'Summary & Précis Writing',
        items: [
          m('The most critical rule in UCE summary writing is…', 'Adhere strictly to word limit and original facts', 'Add personal opinions', 'Copy whole paragraphs'),
          m('A summary should be written using…', 'Your own words and clear linking words', 'Exact quotes throughout', 'Slang and abbreviations'),
          m('First draft word counting helps avoid…', 'Penalties for exceeding the maximum word limit', 'Grammar points', 'Spelling marks'),
          b('State summary rule', 'Summarize key points in your own words accurately', 'rain', 'slow'),
        ],
      },
      {
        title: 'Formal Letter Writing & CVs',
        items: [
          m('A formal business letter requires how many addresses?', 'Two (Sender and Recipient)', 'Only one', 'Three'),
          m('The formal closing when the recipient is addressed by title (“Dear Sir/Madam”) is…', 'Yours faithfully', 'Yours sincerely', 'Best regards'),
          m('The subject heading in a formal letter should be…', 'Concise, underlined or bolded', 'A long paragraph', 'Written in pencil'),
          b('Structure formal letter', 'Include sender address date recipient address and clear reference', 'pot', 'wind'),
        ],
      },
    ],
  },

  // =========================================================================
  // 5. S.5 TO S.6 (UPPER SECONDARY / A-LEVEL)
  // =========================================================================
  {
    id: 's5-math',
    cat: 'Math',
    title: 'Senior 5 Pure Mathematics',
    emoji: '♾️',
    color: '#1E3A8A',
    level: 'Senior 5',
    levelGroup: 'S.5 to S.6',
    author: 'WENSSEC & WAKISSHA Joint Mock & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/senior-five/',
    description: 'Calculus differentiation, polynomials, logarithms, and coordinate geometry for UACE Paper 1.',
    lessons: [
      {
        title: 'Differentiation from First Principles',
        items: [
          m('The derivative dy/dx of f(x) from first principles is the limit as h → 0 of…', '[f(x + h) - f(x)] / h', '[f(x) - f(h)] / x', 'f(x) × h'),
          m('Differentiate y = 3x⁴ with respect to x:', '12x³', '7x³', '12x⁴'),
          m('At a stationary turning point on a curve, dy/dx equals…', '0', '1', 'Infinity'),
          b('State the calculus rule', 'Differentiate polynomials by multiplying by power and reducing exponent', 'soft', 'heavy'),
        ],
      },
      {
        title: 'Polynomials & Remainder Theorem',
        items: [
          m('If f(x) is divided by (x - a), the remainder is…', 'f(a)', 'f(-a)', '0'),
          m('The Factor Theorem states that (x - a) is a factor of f(x) if and only if…', 'f(a) = 0', 'f(a) = 1', 'f(a) > 0'),
          m('Logarithm rule: log(A × B) equals…', 'log A + log B', 'log A × log B', 'log A - log B'),
          b('State the factor theorem', 'A linear factor produces a remainder of zero', 'fire', 'wood'),
        ],
      },
    ],
  },
  {
    id: 's5-biology',
    cat: 'Science',
    title: 'Senior 5 Advanced Biology: Biochemistry',
    emoji: '🧬',
    color: '#065F46',
    level: 'Senior 5',
    levelGroup: 'S.5 to S.6',
    author: 'PEA COUHEIA & Sharebility Science Panel',
    sourceUrl: 'https://sharebility.net/download-category/senior-five/',
    description: 'Biological macromolecules, enzyme kinetics, DNA replication and cellular respiration.',
    lessons: [
      {
        title: 'Enzyme Kinetics & Inhibitors',
        items: [
          m('Competitive inhibitors reduce enzyme reaction rate by…', 'Binding directly to the active site', 'Altering allosteric shape', 'Denaturing peptide bonds'),
          m('The Michaelis constant (Km) represents substrate concentration at…', 'Half maximal velocity (½ Vmax)', 'Vmax', 'Zero velocity'),
          m('Non-competitive inhibitors bind to a site on the enzyme called the…', 'Allosteric site', 'Active site', 'Co-factor bond'),
          b('State enzyme kinetics', 'Competitive inhibitors compete with substrate for active site', 'sour', 'wind'),
        ],
      },
      {
        title: 'Cellular Respiration & Glycolysis',
        items: [
          m('Where in the cell does glycolysis take place?', 'Cytoplasm (cytosol)', 'Mitochondrial matrix', 'Cristae membrane'),
          m('The net yield of ATP molecules per glucose molecule in glycolysis is…', '2 ATP', '4 ATP', '36 ATP'),
          m('In aerobic respiration, the final electron acceptor in the electron transport chain is…', 'Oxygen (O₂)', 'Carbon dioxide', 'Water'),
          b('Summarize respiration', 'Aerobic respiration generates ATP using oxygen as electron acceptor', 'cold', 'rain'),
        ],
      },
    ],
  },
  {
    id: 's5-economics',
    cat: 'Social Studies',
    title: 'Senior 5 Economics & Price Theory',
    emoji: '💹',
    color: '#9A3412',
    level: 'Senior 5',
    levelGroup: 'S.5 to S.6',
    author: 'Cleverland High School Maya & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/senior-five/',
    description: 'Demand and supply elasticity, consumer behavior, production functions and market structures.',
    lessons: [
      {
        title: 'Price Elasticity of Demand (PED)',
        items: [
          m('Price Elasticity of Demand measures the responsiveness of…', 'Quantity demanded to a change in price', 'Supply to income', 'Price to cost'),
          m('If PED > 1, demand for the good is described as…', 'Price elastic', 'Price inelastic', 'Unitary'),
          m('Goods with few or no substitutes (like life-saving medicine) typically have…', 'Inelastic demand (PED < 1)', 'Perfectly elastic demand', 'Negative demand'),
          b('State the definition', 'Price elasticity measures percentage change in quantity over price', 'jump', 'loud'),
        ],
      },
      {
        title: 'Market Structures: Perfect Competition vs Monopoly',
        items: [
          m('A market structure with a single producer and high barriers to entry is a…', 'Monopoly', 'Perfect competition', 'Oligopoly'),
          m('Under perfect competition, firms are considered…', 'Price takers', 'Price setters', 'Colluders'),
          m('Profit maximization for any firm occurs at the output where…', 'Marginal Revenue = Marginal Cost (MR = MC)', 'Total revenue is lowest', 'Price = 0'),
          b('State profit condition', 'Firms maximize profits where marginal revenue equals marginal cost', 'blue', 'stone'),
        ],
      },
    ],
  },
  {
    id: 's6-subict',
    cat: 'Digital Literacy',
    title: 'Senior 6 Subsidiary ICT & Databases',
    emoji: '🖧',
    color: '#0E7490',
    level: 'Senior 6',
    levelGroup: 'S.5 to S.6',
    author: 'WAKISSHA Joint Mock & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/senior-six/',
    description: 'Relational database management (RDBMS), SQL queries, spreadsheets and emerging computing trends.',
    lessons: [
      {
        title: 'Relational Databases & SQL',
        items: [
          m('A field that uniquely identifies each record in a database table is the…', 'Primary key', 'Foreign key', 'Composite index'),
          m('Which SQL command is used to retrieve data from a database table?', 'SELECT', 'EXTRACT', 'PULL'),
          m('A primary key from one table placed in another to create a relationship is a…', 'Foreign key', 'Duplicate key', 'Virtual key'),
          b('Write SQL query', 'Select columns from table where condition matches', 'burn', 'cloud'),
        ],
      },
      {
        title: 'Emerging Technologies & Information Ethics',
        items: [
          m('On-demand delivery of computing power, storage and databases over the Internet is…', 'Cloud computing', 'Local intranet', 'Dial-up networking'),
          m('The practice of tricking users into revealing passwords or sensitive financial credentials is…', 'Phishing', 'Debugging', 'Compiling'),
          m('Under Uganda’s Data Protection and Privacy Act, organizations must…', 'Protect personal data and obtain consent', 'Share records publicly', 'Store data unencrypted'),
          b('State digital ethics', 'Protect personal information and uphold computer ethics online', 'rain', 'soup'),
        ],
      },
    ],
  },
  {
    id: 's6-physics',
    cat: 'Science',
    title: 'Senior 6 Advanced Physics: Electromagnetism',
    emoji: '⚛️',
    color: '#581C87',
    level: 'Senior 6',
    levelGroup: 'S.5 to S.6',
    author: 'WENSSEC & Sharebility Physics Council',
    sourceUrl: 'https://sharebility.net/download-category/senior-six/',
    description: 'Faraday’s law of induction, AC circuits, photoelectric effect, and nuclear radioactivity.',
    lessons: [
      {
        title: 'Electromagnetic Induction & Faraday’s Law',
        items: [
          m('Faraday’s Law states that induced electromotive force (EMF) is proportional to…', 'Rate of change of magnetic flux linkage', 'Current squared', 'Resistance'),
          m('Lenz’s Law states that induced current flows in a direction such that it…', 'Opposes the change that produces it', 'Assists the motion', 'Doubles the voltage'),
          m('A transformer functions on the principle of…', 'Mutual induction with alternating current', 'Electrostatic attraction', 'Direct current flow'),
          b('State Lenz’s law', 'Induced electromotive force opposes the magnetic change producing it', 'soft', 'heavy'),
        ],
      },
      {
        title: 'Photoelectric Effect & Quantum Physics',
        items: [
          m('Einstein’s photoelectric equation relates photon energy hf to…', 'Work function + Kinetic energy (hf = Φ + KE_max)', 'Mass × velocity', 'Resistance × current'),
          m('The minimum frequency of light required to liberate electrons from a metal surface is…', 'Threshold frequency (f₀)', 'Critical angle', 'Resonance frequency'),
          m('The quantum packets of electromagnetic energy are known as…', 'Photons', 'Electrons', 'Protons'),
          b('State Einstein equation', 'Photon energy equals work function plus maximum kinetic energy', 'dark', 'pot'),
        ],
      },
    ],
  },
  {
    id: 's6-gp',
    cat: 'Languages',
    title: 'Senior 6 General Paper: Global Perspectives',
    emoji: '🌐',
    color: '#4338CA',
    level: 'Senior 6',
    levelGroup: 'S.5 to S.6',
    author: 'WAKISSHA Joint Mock & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/senior-six/',
    description: 'UACE General Paper essay writing, logical analysis, East African and global geopolitical issues.',
    lessons: [
      {
        title: 'Analytical Essay Writing & Critical Arguments',
        items: [
          m('In a balanced General Paper discursive essay, a candidate must…', 'Examine multiple viewpoints with supporting evidence', 'Express only one dogmatic bias', 'Write in bullet points'),
          m('A strong thesis statement in the introduction should…', 'State the central argument and scope of the essay', 'Repeat the question without answer', 'Be omitted entirely'),
          m('Transitions such as “Furthermore”, “Conversely”, and “In conclusion” serve to…', 'Ensure logical coherence and flow between paragraphs', 'Add decorative length', 'Confuse readers'),
          b('Structure the essay', 'Introduce analyze opposing perspectives and conclude with balanced judgment', 'sour', 'fire'),
        ],
      },
      {
        title: 'Environmental Conservation & Sustainable Development',
        items: [
          m('Sustainable development is defined as meeting current human needs without…', 'Compromising the ability of future generations to meet theirs', 'Using any natural resources', 'Economic growth'),
          m('What international climate accord aims to limit global temperature rises to 1.5°C?', 'The Paris Agreement', 'The Geneva Convention', 'The Treaty of Versailles'),
          m('In East Africa, wetland degradation leads directly to…', 'Severe flooding and loss of biodiversity', 'Better soil fertility', 'Decreased temperatures'),
          b('State the conservation principle', 'Protect wetlands and forests to ensure sustainable development for future', 'cold', 'liquid'),
        ],
      },
    ],
  },

  // =========================================================================
  // 6. MULTI-LEVEL EAST AFRICAN NATIVE LANGUAGES (VOICE-FIRST)
  // =========================================================================
  {
    id: 'luganda',
    cat: 'Languages',
    title: 'Luganda Basics (Olulimi Oluganda)',
    emoji: '🗣️',
    color: '#A855F7',
    level: 'Beginner to Intermediate',
    levelGroup: 'P.1 to P.4',
    ttsLang: 'lug',
    author: 'Sharebility Local Languages Panel',
    sourceUrl: 'https://sharebility.net/download-category/primary-one/',
    description: 'Everyday greetings, polite conversation, family and food in Luganda.',
    lessons: [
      {
        title: 'Greetings & Politeness (Okulamusa)',
        items: [
          m('“Webale nnyo” means…', 'Thank you very much', 'I am sorry', 'Goodbye'),
          m('How do you say “yes” in Luganda?', 'Yee', 'Nedda', 'Webale'),
          b('Say “How are you?”', 'Oli otya', 'Webale', 'Yee'),
          m('The common polite response “Gyendi” means…', 'I am fine', 'I am hungry', 'I am coming'),
        ],
      },
      {
        title: 'Family & Food (Amaka n’Emmere)',
        items: [
          m('“Maama” means…', 'Mother', 'Father', 'Sister'),
          m('“Amazzi” means…', 'Water', 'Food', 'Milk'),
          m('“Emmere” means…', 'Food', 'Water', 'House'),
          b('Say “Thank you mother”', 'Webale Maama', 'Taata', 'Nedda'),
        ],
      },
    ],
  },
  {
    id: 'swahili',
    cat: 'Languages',
    title: 'Kiswahili Basics (Lugha ya Kiswahili)',
    emoji: '🌍',
    color: '#EC4899',
    level: 'Beginner to Intermediate',
    levelGroup: 'P.1 to P.4',
    ttsLang: 'swa',
    author: 'East African Kiswahili Commission & Sharebility',
    sourceUrl: 'https://sharebility.net/download-category/primary-one/',
    description: 'Greetings, classroom vocabulary, food and school terms in Kiswahili.',
    lessons: [
      {
        title: 'Greetings (Salamu)',
        items: [
          m('“Asante sana” means…', 'Thank you very much', 'You are welcome', 'Goodbye'),
          m('How do you say “yes” in Kiswahili?', 'Ndiyo', 'Hapana', 'Karibu'),
          b('Say “Thank you very much”', 'Asante sana', 'Karibu', 'Hapana'),
          m('“Habari gani?” means…', 'How are you?', 'Where are you going?', 'Who are you?'),
        ],
      },
      {
        title: 'Food & School (Chakula na Shule)',
        items: [
          m('“Maji” means…', 'Water', 'Food', 'Milk'),
          m('“Chakula” means…', 'Food', 'Water', 'School'),
          m('“Shule” means…', 'School', 'Market', 'Hospital'),
          b('Say “I want clean water”', 'Nataka maji safi', 'chakula', 'Asante'),
        ],
      },
    ],
  },
];

export const getCourse = (id: string | null): Course | undefined => COURSES.find((c) => c.id === id);
`;

await fs.writeFile('src/data/courses.ts', COURSES_DATA, 'utf-8');
console.log('Successfully wrote src/data/courses.ts with all categorized courses!');
