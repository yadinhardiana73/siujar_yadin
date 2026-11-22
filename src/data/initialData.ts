/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CBTAppState } from '../types';

const getInitialGroups = () => {
  const arr = [];
  const letterX = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  const letterXI = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const letterXII = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

  letterX.forEach(l => {
    arr.push({ id: `G-X-${l}`, name: `Kelas X-${l}`, description: `Kelas Sepuluh Peminatan/Umum Kelompok ${l}` });
  });
  letterXI.forEach(l => {
    arr.push({ id: `G-XI-${l}`, name: `Kelas XI-${l}`, description: `Kelas Sebelas Peminatan/Umum Kelompok ${l}` });
  });
  letterXII.forEach(l => {
    arr.push({ id: `G-XII-${l}`, name: `Kelas XII-${l}`, description: `Kelas Dua Belas Peminatan/Umum Kelompok ${l}` });
  });
  return arr;
};

export const initialCBTState: CBTAppState = {
  topics: [
    {
      id: 'T01',
      name: 'Matematika Dasar',
      code: 'MATH-01',
      moduleName: 'Sains',
      description: 'Materi eksponen, persamaan linier, dan aljabar dasar.'
    },
    {
      id: 'T02',
      name: 'Bahasa Inggris - Reading',
      code: 'ENG-RD-02',
      moduleName: 'Bahasa',
      description: 'Materi reading comprehension, grammar dasar, dan sinonim kata.'
    },
    {
      id: 'T03',
      name: 'Pengetahuan Umum',
      code: 'GEN-KNOW-03',
      moduleName: 'Humaniora',
      description: 'Sejarah, geografi Indonesia, dan wawasan nusantara.'
    }
  ],
  groups: getInitialGroups(),
  participants: [
    {
      id: 'P01',
      username: 'ahmad',
      passwordHash: 'ahmad123',
      name: 'Ahmad Rifai',
      groupId: 'G-XII-A',
      examCardNo: 'CARD-XIIA-001',
      isLoggedIn: false
    },
    {
      id: 'P02',
      username: 'siti',
      passwordHash: 'siti123',
      name: 'Siti Rahmawati',
      groupId: 'G-XII-A',
      examCardNo: 'CARD-XIIA-002',
      isLoggedIn: false
    },
    {
      id: 'P03',
      username: 'budi',
      passwordHash: 'budi123',
      name: 'Budi Hartono',
      groupId: 'G-XII-B',
      examCardNo: 'CARD-XIIB-001',
      isLoggedIn: false
    },
    {
      id: 'P04',
      username: 'dewi',
      passwordHash: 'dewi123',
      name: 'Dewi Lestari',
      groupId: 'G-XI-A',
      examCardNo: 'CARD-XIB-001',
      isLoggedIn: false
    }
  ],
  questions: [
    // Matematika Dasar Questions
    {
      id: 'Q01',
      topicId: 'T01',
      text: 'Berapakah nilai dari ekspresi eksponen berikut: 2^3 x 2^4?',
      type: 'pilihan_ganda',
      options: [
        { key: 'A', text: '2^7' },
        { key: 'B', text: '2^12' },
        { key: 'C', text: '4^7' },
        { key: 'D', text: '4^12' },
        { key: 'E', text: '2^1' }
      ],
      correctAnswer: 'A',
      points: 30
    },
    {
      id: 'Q02',
      topicId: 'T01',
      text: 'Jika persamaan linier x + 5 = 12 diselesaikan, berapakah nilai x?',
      type: 'pilihan_ganda',
      options: [
        { key: 'A', text: '5' },
        { key: 'B', text: '6' },
        { key: 'C', text: '7' },
        { key: 'D', text: '8' },
        { key: 'E', text: '9' }
      ],
      correctAnswer: 'C',
      points: 30
    },
    {
      id: 'Q03',
      topicId: 'T01',
      text: 'Selesaikan persamaan aljabar berikut dan tunjukkan langkah-langkah penyelesaiannya secara detail: 3x - 7 = 11.',
      type: 'essay',
      correctAnswer: 'Langkah-langkah: 3x - 7 = 11 -> 3x = 11 + 7 -> 3x = 18 -> x = 18 / 3 -> x = 6.',
      points: 40
    },
    // Bahasa Inggris Questions
    {
      id: 'Q04',
      topicId: 'T02',
      text: 'Choose the grammatically correct sentence from the following options:',
      type: 'pilihan_ganda',
      options: [
        { key: 'A', text: "She don't like eating fresh red apples in the morning." },
        { key: 'B', text: "She doesn't likes eating fresh red apples in the morning." },
        { key: 'C', text: "She doesn't like eating fresh red apples in the morning." },
        { key: 'D', text: "She not like eating fresh red apples in the morning." },
        { key: 'E', text: "She aren't liking eating fresh red apples in the morning." }
      ],
      correctAnswer: 'C',
      points: 30
    },
    {
      id: 'Q05',
      topicId: 'T02',
      text: "What is the closest synonym of the word 'Generous'?",
      type: 'pilihan_ganda',
      options: [
        { key: 'A', text: 'Stingy and selfish' },
        { key: 'B', text: 'Kind-hearted and altruistic' },
        { key: 'C', text: 'Greedy and materialistic' },
        { key: 'D', text: 'Arrogant and prideful' },
        { key: 'E', text: 'Lazy and unmotivated' }
      ],
      correctAnswer: 'B',
      points: 30
    },
    {
      id: 'Q06',
      topicId: 'T02',
      text: 'Write a short paragraph introducing yourself in English and stating your academic or professional goals for the next five years!',
      type: 'essay',
      correctAnswer: 'Paragraph introduction containing: name, age/class, background, and logical goals. Graded based on grammar (tenses, subject-verb agreement) and vocabulary.',
      points: 40
    },
    // Pengetahuan Umum Questions
    {
      id: 'Q07',
      topicId: 'T03',
      text: 'Ibu kota baru Republik Indonesia, yaitu Nusantara (IKN), secara administratif terletak di provinsi...',
      type: 'pilihan_ganda',
      options: [
        { key: 'A', text: 'Kalimantan Barat' },
        { key: 'B', text: 'Kalimantan Timur' },
        { key: 'C', text: 'Kalimantan Selatan' },
        { key: 'D', text: 'Kalimantan Tengah' },
        { key: 'E', text: 'Kalimantan Utara' }
      ],
      correctAnswer: 'B',
      points: 50
    },
    {
      id: 'Q08',
      topicId: 'T03',
      text: 'Siapakah tokoh pahlawan nasional Indonesia yang menggubah lagu kebangsaan Indonesia Raya?',
      type: 'pilihan_ganda',
      options: [
        { key: 'A', text: 'Ir. Soekarno' },
        { key: 'B', text: 'Drs. Mohammad Hatta' },
        { key: 'C', text: 'Wage Rudolf Soepratman' },
        { key: 'D', text: 'Ibu Soed' },
        { key: 'E', text: 'Cornel Simanjuntak' }
      ],
      correctAnswer: 'C',
      points: 50
    }
  ],
  tests: [
    {
      id: 'T-MATH',
      name: 'Ujian Akhir Matematika Dasar Kelas XII',
      topicId: 'T01',
      durationMinutes: 45,
      startTime: '2026-07-01T08:00:00',
      endTime: '2026-07-31T17:00:00',
      questionCount: 3,
      token: 'MATH99',
      status: 'aktif',
      showResultImmediate: true,
      shuffleAnswers: true,
      shuffleQuestions: true,
      groupId: 'G-XII-A'
    },
    {
      id: 'T-ENG',
      name: 'Evaluasi Reading Comprehension Bahasa Inggris',
      topicId: 'T02',
      durationMinutes: 30,
      startTime: '2026-07-01T08:00:00',
      endTime: '2026-07-31T17:00:00',
      questionCount: 3,
      token: 'ENG123',
      status: 'aktif',
      showResultImmediate: false,
      shuffleAnswers: true,
      shuffleQuestions: false,
      groupId: 'ALL'
    }
  ],
  testAttempts: [
    {
      id: 'ATT-001',
      testId: 'T-MATH',
      participantId: 'P01', // Ahmad Rifai
      startTime: '2026-07-13T08:05:00',
      endTime: '2026-07-13T08:42:00',
      answers: [
        {
          questionId: 'Q01',
          selectedOption: 'A', // correct (30 pts)
          isCorrect: true,
          scoreGiven: 30,
          isEvaluated: true
        },
        {
          questionId: 'Q02',
          selectedOption: 'C', // correct (30 pts)
          isCorrect: true,
          scoreGiven: 30,
          isEvaluated: true
        },
        {
          questionId: 'Q03',
          essayAnswer: 'Langkah pertama, 3x - 7 = 11. Pindahkan angka 7 ke kanan sehingga menjadi 3x = 11 + 7, jadi 3x = 18. Langkah kedua, bagi kedua sisi dengan 3 sehingga x = 18/3 = 6. Hasil akhirnya adalah x = 6.',
          isCorrect: true,
          scoreGiven: 40, // max point (40 pts)
          isEvaluated: true
        }
      ],
      status: 'selesai',
      totalScore: 100
    },
    {
      id: 'ATT-002',
      testId: 'T-ENG',
      participantId: 'P03', // Budi Hartono
      startTime: '2026-07-13T09:10:00',
      endTime: '2026-07-13T09:35:00',
      answers: [
        {
          questionId: 'Q04',
          selectedOption: 'C', // correct (30 pts)
          isCorrect: true,
          scoreGiven: 30,
          isEvaluated: true
        },
        {
          questionId: 'Q05',
          selectedOption: 'A', // stingy (incorrect) (0 pts)
          isCorrect: false,
          scoreGiven: 0,
          isEvaluated: true
        },
        {
          questionId: 'Q06',
          essayAnswer: 'Hello, my name is Budi Hartono. I am active and kind person. My goal in next five years is to graduate from my study and become a senior database administrator in cloud-scale company. I want to build robust application that solve Indonesian social problems.',
          isEvaluated: false // Waiting evaluation! Perfect demo!
        }
      ],
      status: 'selesai',
      totalScore: 30 // 30 from multiple choices, essay pending
    }
  ],
  files: [
    {
      id: 'F01',
      name: 'rumus_eksponen_cepat.png',
      size: '240 KB',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600',
      uploadDate: '2026-07-10 14:22'
    },
    {
      id: 'F02',
      name: 'audio_listening_quiz_1.mp3',
      size: '3.1 MB',
      type: 'audio',
      url: '#',
      uploadDate: '2026-07-11 10:15'
    },
    {
      id: 'F03',
      name: 'panduan_siswa_cbt_v2.pdf',
      size: '850 KB',
      type: 'document',
      url: '#',
      uploadDate: '2026-07-12 09:30'
    }
  ],
  currentToken: 'MATH99',
  teachers: [
    {
      id: 'TCH-01',
      name: 'Guru Penguji Utama',
      username: 'guru',
      passwordHash: 'guru'
    }
  ],
  adminConfig: {
    username: 'admin',
    passwordHash: 'admin',
    name: 'Proktor / Operator Utama',
    schoolName: 'SMA / SMK Negeri Mandiri'
  }
};
