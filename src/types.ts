/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Topic {
  id: string;
  name: string;
  code: string;
  moduleName: string;
  description: string;
}

export interface QuestionOption {
  key: string; // A, B, C, D, E
  text: string;
  image?: string; // Optional image URL or file name
}

export type QuestionType = 'pilihan_ganda' | 'essay';

export interface Question {
  id: string;
  topicId: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[]; // only for pilihan_ganda
  correctAnswer?: string; // option key for pilihan_ganda, or guidance for essay
  points: number;
  image?: string; // file name or URL
  audio?: string; // file name or URL
}

export interface Group {
  id: string;
  name: string;
  description: string;
}

export interface Participant {
  id: string;
  username: string;
  passwordHash: string; // plain text for easy demo card print
  name: string;
  groupId: string;
  examCardNo: string;
  isLoggedIn: boolean;
  isLocked?: boolean; // Dikunci oleh sistem jika melanggar (buka aplikasi lain, pindah tab)
  lockedReason?: string; // Alasan pelanggaran kunci
  lockedAt?: string; // Waktu pelanggaran tercatat
  violationsCount?: number; // Jumlah total pelanggaran
}

export interface Test {
  id: string;
  name: string;
  topicId: string;
  durationMinutes: number; // e.g. 60
  startTime: string;
  endTime: string;
  questionCount: number;
  token: string;
  status: 'aktif' | 'nonaktif';
  showResultImmediate: boolean;
  shuffleAnswers?: boolean; // Acak urutan pilihan jawaban A, B, C, D, E
  shuffleQuestions?: boolean; // Acak urutan nomor soal
  strictLockdown?: boolean; // Kunci layar & auto-kick jika buka aplikasi lain
  groupId?: string; // Target kelas / rombel (legacy)
  groupIds?: string[]; // Target kelas / rombel yang dipilih via kolom centang ('ALL' atau array ID rombel)
}

export interface AttemptOptionMapping {
  displayKey: string; // 'A', 'B', 'C', 'D', 'E'
  originalKey: string; // original option key
  text: string;
  image?: string;
}

export interface StudentAnswer {
  questionId: string;
  selectedOption?: string; // original option key for pilihan_ganda
  selectedDisplayKey?: string; // displayed option key for student UI
  essayAnswer?: string; // for essay
  isCorrect?: boolean; // for choices, or graded essay
  scoreGiven?: number; // actual score points
  isEvaluated?: boolean; // whether essay has been scored
}

export interface TestAttempt {
  id: string;
  testId: string;
  participantId: string;
  startTime: string;
  endTime?: string;
  answers: StudentAnswer[];
  status: 'mengerjakan' | 'selesai';
  totalScore: number;
  questionOrder?: string[];
  shuffledOptions?: { [questionId: string]: AttemptOptionMapping[] };
  isLocked?: boolean;
  lockReason?: string;
  lockedAt?: string;
  violationsCount?: number;
}

export interface FileManagerFile {
  id: string;
  name: string;
  size: string; // formatted e.g. "1.2 MB"
  type: 'image' | 'audio' | 'document';
  url: string;
  uploadDate: string;
}

export interface Teacher {
  id: string;
  name: string;
  username: string;
  passwordHash: string; // Plaintext for demo and easy management
}

export interface AdminConfig {
  username: string;
  passwordHash: string;
  name?: string;
  schoolName?: string;
}

// Full app state that can be stored in localStorage
export interface CBTAppState {
  topics: Topic[];
  questions: Question[];
  groups: Group[];
  participants: Participant[];
  tests: Test[];
  testAttempts: TestAttempt[];
  files: FileManagerFile[];
  currentToken: string;
  teachers?: Teacher[];
  adminConfig?: AdminConfig;
}
