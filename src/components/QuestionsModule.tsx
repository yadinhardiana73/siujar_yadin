/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { BookOpen, HelpCircle, FileText, FileSpreadsheet, List, Plus, Trash2, Search, Edit2, Pencil, Upload, Check, Image, Maximize2, Grid, Sparkles, Download, Layers, ClipboardList, CheckCircle2, Zap, X, AlertTriangle, Eye } from 'lucide-react';
import { Topic, Question, QuestionOption, QuestionType, FileManagerFile } from '../types';
import {
  WordFormRow,
  buildValidatedWordQuestions,
  extractExamproRowsFromDocument,
  extractCellContentFromElement,
  getDirectTableRows,
  buildExamproWordDocument
} from '../utils/wordImportHelper';

interface QuestionsModuleProps {
  topics: Topic[];
  questions: Question[];
  files: FileManagerFile[];
  onAddTopic: (t: Omit<Topic, 'id'>) => void;
  onDeleteTopic: (id: string) => void;
  onAddQuestion: (q: Omit<Question, 'id'>) => void;
  onUpdateQuestion?: (id: string, updated: Partial<Question>) => void;
  onBulkAddQuestions?: (qs: Omit<Question, 'id'>[]) => void;
  onDeleteQuestion: (id: string) => void;
  activeSubMenu: string;
}

export default function QuestionsModule({
  topics,
  questions,
  files,
  onAddTopic,
  onDeleteTopic,
  onAddQuestion,
  onUpdateQuestion,
  onBulkAddQuestions,
  onDeleteQuestion,
  activeSubMenu
}: QuestionsModuleProps) {
  // Topic state
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicSearchTerm, setTopicSearchTerm] = useState('');

  // Question state
  const [qTopic, setQTopic] = useState(topics[0]?.id || '');
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('pilihan_ganda');
  const [qPoints, setQPoints] = useState(10);
  const [qImage, setQImage] = useState('');
  const [qAudio, setQAudio] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
    { key: 'E', text: '' }
  ]);
  const [qCorrect, setQCorrect] = useState('A');
  const [qEssayGuidance, setQEssayGuidance] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterTopic, setSelectedFilterTopic] = useState('ALL');

  // Import State
  const [wordText, setWordText] = useState('');
  const [importSuccessCount, setImportSuccessCount] = useState<number>(0);

  const defaultWordRows: WordFormRow[] = [
    { no: '1', jenis: 'SOAL', isi: 'Ini adalah contoh soal... (Tulis pertanyaan Anda di sini)', jawaban: '' },
    { no: '', jenis: 'JAWABAN', isi: 'Jawaban Salah statusnya 0', jawaban: '0' },
    { no: '', jenis: 'JAWABAN', isi: 'Jawaban Benar statusnya 1', jawaban: '1' },
    { no: '', jenis: 'JAWABAN', isi: 'Jawaban Salah statusnya 0', jawaban: '0' },
    { no: '', jenis: 'JAWABAN', isi: 'Jawaban Salah statusnya 0', jawaban: '0' },
    { no: '', jenis: 'JAWABAN', isi: 'Jawaban Salah statusnya 0', jawaban: '0' },
    { no: '2', jenis: 'SOAL', isi: '(Tulis pertanyaan kedua Anda di sini)', jawaban: '' },
    { no: '', jenis: 'JAWABAN', isi: '(Pilihan jawaban pertama)', jawaban: '1' },
    { no: '', jenis: 'JAWABAN', isi: '(Pilihan jawaban kedua)', jawaban: '0' },
    { no: '', jenis: 'JAWABAN', isi: '(Pilihan jawaban ketiga)', jawaban: '0' },
    { no: '', jenis: 'JAWABAN', isi: '(Pilihan jawaban keempat)', jawaban: '0' },
    { no: '', jenis: 'JAWABAN', isi: '(Pilihan jawaban kelima)', jawaban: '0' },
  ];

  const [wordRows, setWordRows] = useState<WordFormRow[]>([]);
  const [wordInputMode, setWordInputMode] = useState<'preview' | 'grid' | 'text'>('preview');
  const [wordFileName, setWordFileName] = useState<string>('');
  const [wordUploadError, setWordUploadError] = useState<string>('');
  const [wordStructuralErrors, setWordStructuralErrors] = useState<string[]>([]);
  const [templateQuestionCount, setTemplateQuestionCount] = useState<10 | 20 | 30 | 40 | 50>(10);
  const [isReadingWordFile, setIsReadingWordFile] = useState<boolean>(false);

  // Mass Options Modal state for Word Grid Table
  const [massOptionModal, setMassOptionModal] = useState<{
    isOpen: boolean;
    targetSoalIndex: number | null; // index of SOAL row in wordRows, or null to append new
    soalText: string;
    soalNumber: string;
    rawText: string;
    options: { A: string; B: string; C: string; D: string; E: string };
    correctKey: 'A' | 'B' | 'C' | 'D' | 'E';
    activeTab: 'paste' | 'inputs';
  }>({
    isOpen: false,
    targetSoalIndex: null,
    soalText: '',
    soalNumber: '',
    rawText: '',
    options: { A: '', B: '', C: '', D: '', E: '' },
    correctKey: 'A',
    activeTab: 'paste'
  });

  // Mass Option Modal for Single Question Form ('case soal')
  const [singleFormMassModal, setSingleFormMassModal] = useState(false);
  const [singleFormMassText, setSingleFormMassText] = useState('');
  const [singleFormCorrectKey, setSingleFormCorrectKey] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');

  // Edit Question Modal State
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editTopicId, setEditTopicId] = useState('');
  const [editText, setEditText] = useState('');
  const [editType, setEditType] = useState<QuestionType>('pilihan_ganda');
  const [editPoints, setEditPoints] = useState(10);
  const [editImage, setEditImage] = useState('');
  const [editAudio, setEditAudio] = useState('');
  const [editOptions, setEditOptions] = useState<QuestionOption[]>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
    { key: 'E', text: '' }
  ]);
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('A');
  const [editSuccessNotice, setEditSuccessNotice] = useState(false);
  const [editMassPasteModal, setEditMassPasteModal] = useState(false);
  const [editMassPasteText, setEditMassPasteText] = useState('');

  const handleStartEdit = (q: Question) => {
    setEditingQuestion(q);
    setEditTopicId(q.topicId || topics[0]?.id || '');
    setEditText(q.text || '');
    setEditType(q.type || 'pilihan_ganda');
    setEditPoints(q.points || 10);
    setEditImage(q.image || '');
    setEditAudio(q.audio || '');
    
    if (q.type === 'pilihan_ganda' && q.options && q.options.length > 0) {
      setEditOptions(q.options.map(o => ({ ...o })));
    } else {
      setEditOptions([
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' },
        { key: 'E', text: '' }
      ]);
    }
    setEditCorrectAnswer(q.correctAnswer || 'A');
  };

  const handleSaveEdit = () => {
    if (!editingQuestion) return;
    if (!editText.trim()) {
      alert('Teks pertanyaan tidak boleh kosong.');
      return;
    }

    let updatedOptions: QuestionOption[] | undefined = undefined;
    let finalCorrectAnswer = editCorrectAnswer;

    if (editType === 'pilihan_ganda') {
      const validOpts = editOptions.filter(o => o.text.trim() !== '');
      if (validOpts.length < 2) {
        alert('Soal Pilihan Ganda minimal harus memiliki 2 pilihan jawaban yang terisi.');
        return;
      }
      updatedOptions = validOpts;
      if (!validOpts.some(o => o.key === finalCorrectAnswer)) {
        finalCorrectAnswer = validOpts[0].key;
      }
    }

    const updatedData: Partial<Question> = {
      topicId: editTopicId,
      text: editText.trim(),
      type: editType,
      points: editPoints,
      image: editImage.trim() || undefined,
      audio: editAudio.trim() || undefined,
      options: updatedOptions,
      correctAnswer: finalCorrectAnswer
    };

    if (onUpdateQuestion) {
      onUpdateQuestion(editingQuestion.id, updatedData);
    }

    setEditingQuestion(null);
    setEditSuccessNotice(true);
    setTimeout(() => setEditSuccessNotice(false), 4000);
  };

  const handleEditOptionChange = (key: string, text: string, img?: string) => {
    setEditOptions(prev => prev.map(opt => {
      if (opt.key === key) {
        const updated = { ...opt, text };
        if (img !== undefined) updated.image = img;
        return updated;
      }
      return opt;
    }));
  };

  const handleAddEditOption = () => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    if (editOptions.length >= keys.length) return;
    const nextKey = keys[editOptions.length];
    setEditOptions(prev => [...prev, { key: nextKey, text: '' }]);
  };

  const handleRemoveEditOption = (key: string) => {
    if (editOptions.length <= 2) {
      alert('Soal pilihan ganda minimal memerlukan 2 pilihan jawaban.');
      return;
    }
    const filtered = editOptions.filter(o => o.key !== key);
    const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const reindexed = filtered.map((opt, idx) => ({
      ...opt,
      key: keys[idx]
    }));
    setEditOptions(reindexed);
    if (editCorrectAnswer === key) {
      setEditCorrectAnswer(reindexed[0]?.key || 'A');
    }
  };

  const handleEditMassApply = () => {
    const parsed = parseRawOptionLines(editMassPasteText);
    const keys: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    const updatedOptions: QuestionOption[] = keys.map(k => ({
      key: k,
      text: parsed[k] || ''
    })).filter(o => o.text.trim() !== '');

    if (updatedOptions.length >= 2) {
      setEditOptions(updatedOptions);
    }
    setEditMassPasteModal(false);
    setEditMassPasteText('');
  };

  // Helper parser for multi-line text into A-E options
  const parseRawOptionLines = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const result = { A: '', B: '', C: '', D: '', E: '' };
    const keys: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    
    let detectedWithPrefix = false;
    lines.forEach(line => {
      const match = line.match(/^[\(\[]?([A-Ea-e1-5])[\)\].:\s\-]+(.*)$/);
      if (match) {
        detectedWithPrefix = true;
        let rawKey = match[1].toUpperCase();
        if (['1', '2', '3', '4', '5'].includes(rawKey)) {
          rawKey = keys[parseInt(rawKey, 10) - 1];
        }
        if (keys.includes(rawKey as any)) {
          result[rawKey as 'A' | 'B' | 'C' | 'D' | 'E'] = match[2].trim();
        }
      }
    });

    if (!detectedWithPrefix) {
      lines.slice(0, 5).forEach((line, idx) => {
        const k = keys[idx];
        if (k) {
          result[k] = line;
        }
      });
    }

    return result;
  };

  const serializeRowsToText = (rows: WordFormRow[]): string => {
    const lines = rows.map(r => {
      return [r.no, r.jenis, r.isi, r.jawaban].join('\t');
    });
    return lines.join('\n');
  };

  // Helper: Universal parser for questions from any format (Excel, Word, Aiken, Numbered list, Table)
  const parseUniversalQuestions = (text: string, topicId: string): Omit<Question, 'id'>[] => {
    if (!text || !text.trim()) return [];

    // Expand inline options like "A. Satu   B. Dua   C. Tiga" or "A. Satu\tB. Dua" onto separate lines
    const expandedRawLines: string[] = [];
    text.split(/\r?\n/).forEach(rawLine => {
      const trimmed = rawLine.trim();
      if (!trimmed) return;

      // Normalize Word auto-list tabs right after question numbers or option letters (e.g. "1.\tSoal" -> "1. Soal", "A.\tOpsi" -> "A. Opsi")
      const normalized = trimmed
        .replace(/^(\d{1,4}[\.\)\:])\t+/, '$1 ')
        .replace(/^([A-Ha-h][\.\)\:])\t+/, '$1 ');

      // Split if a line contains multiple option prefixes separated by 2+ spaces or tabs (e.g. "A. 10   B. 20   C. 30")
      if (/^[\(\[]?[A-Ha-h][\)\]\.\:]\s+/.test(normalized) && /(?:\s{2,}|\t)[\(\[]?[B-Hb-h][\)\]\.\:]\s+/.test(normalized)) {
        const parts = normalized.split(/(?:\s{2,}|\t)+(?=[\(\[]?[A-Ha-h][\)\]\.\:]\s+)/);
        parts.forEach(p => {
          const pt = p.trim();
          if (pt) expandedRawLines.push(pt);
        });
      } else {
        expandedRawLines.push(normalized);
      }
    });

    const rawLines = expandedRawLines;
    if (rawLines.length === 0) return [];

    const questions: Omit<Question, 'id'>[] = [];

    // Helper: check if a line/row is genuinely a template header or guideline (never drop normal questions containing words like "jenis")
    const isHeaderLine = (line: string, cols?: string[]) => {
      const lowerLine = line.toLowerCase().trim();
      if (cols && cols.length >= 2) {
        const cleanCols = cols.map(c => c.toLowerCase().trim());
        const c0 = cleanCols[0];
        const c1 = cleanCols[1];
        // Exact table header rows: "No | Jenis | Isi | Jawaban", "No | Jenis | Kode | Isi | Status Jawaban", "No | Soal | A | B | C..."
        if ((c0 === 'no' || c0 === 'no.' || c0 === 'nomor') && (c1 === 'jenis' || c1 === 'soal' || c1 === 'pertanyaan' || c1 === 'kode' || c1 === 'tipe')) {
          return true;
        }
        if (cleanCols.includes('jenis') && (cleanCols.includes('isi') || cleanCols.includes('kode')) && (cleanCols.includes('jawaban') || cleanCols.includes('status jawaban'))) {
          return true;
        }
        if (cleanCols.some(c => c.includes('form import soal') || c.includes('status jawaban diisi') || c.includes('cell yang berwarna'))) {
          return true;
        }
        return false;
      }
      if (
        lowerLine.startsWith('form import soal') ||
        lowerLine.startsWith('form word soal') ||
        lowerLine.startsWith('petunjuk pengisian') ||
        lowerLine.startsWith('silakan isi tabel') ||
        lowerLine.startsWith('cell yang berwarna') ||
        lowerLine.startsWith('status jawaban diisi')
      ) {
        return true;
      }
      return false;
    };

    // Helper: check if line is an answer key marker (e.g. Kunci: A, Jawaban: B, ANSWER: C)
    const isAnswerKeyLine = (line: string): string | null => {
      const match = line.match(/^(?:kunci(?:\s+jawaban)?|jawaban\s+benar|jawaban|jawab|answer|ans)[\s\:\=\-]+([A-Ha-h1-8])(?:\b|$)/i);
      if (match) {
        let key = match[1].toUpperCase();
        if (/^[1-8]$/.test(key)) {
          key = String.fromCharCode(65 + parseInt(key, 10) - 1);
        }
        return key;
      }
      return null;
    };

    // Helper: check if line is an option (A. Opsi, A) Opsi, (A) Opsi, [A] Opsi, a. Opsi) - strictly letters A-H with explicit delimiter
    const isOptionLine = (line: string): { key: string; text: string; isCorrect: boolean } | null => {
      const starMatch = line.match(/^[\*✓✔]\s*[\(\[]?([A-Ha-h])[\)\].:]\s*(.+)$/);
      if (starMatch) {
        return { key: starMatch[1].toUpperCase(), text: starMatch[2].trim(), isCorrect: true };
      }

      const bracketMatch = line.match(/^[\(\[]([A-Ha-h])[\)\]]\s*(.+)$/);
      let match: RegExpMatchArray | null = bracketMatch;
      if (!match) {
        match = line.match(/^([A-Ha-h])\s*[\.\):]\s+(.+)$/) || line.match(/^([A-Ha-h])[\.\)](?=\S)(.+)$/);
      }

      if (match) {
        const optKey = match[1].toUpperCase();
        let optText = match[2].trim();
        let isCorrect = false;
        if (/\s*(?:\*|\(v\)|\[v\]|\(benar\)|\[benar\]|✓|✔)$/i.test(optText)) {
          isCorrect = true;
          optText = optText.replace(/\s*(?:\*|\(v\)|\[v\]|\(benar\)|\[benar\]|✓|✔)$/i, '').trim();
        }
        return { key: optKey, text: optText, isCorrect };
      }
      return null;
    };

    // Helper: check if line starts a question (1. Teks Soal, 1) Teks, Soal 1: Teks, No. 1 Teks, [1] Teks)
    // Carefully avoids splitting on decimals ("2.500"), times ("10:30"), or year ranges ("2024-2025")
    const isQuestionStartLine = (line: string): { num: string; text: string } | null => {
      const matchSpace = line.match(/^(\d{1,4})[\.\)]\s+(.+)$/);
      if (matchSpace) return { num: matchSpace[1], text: matchSpace[2].trim() };

      const matchNoSpaceLetter = line.match(/^(\d{1,4})\.(?=[A-Za-z"'“(\[])(.+)$/);
      if (matchNoSpaceLetter) return { num: matchNoSpaceLetter[1], text: matchNoSpaceLetter[2].trim() };

      const matchNumberOnly = line.match(/^(\d{1,4})[\.\)]$/);
      if (matchNumberOnly) return { num: matchNumberOnly[1], text: '' };

      const matchLabel = line.match(/^(?:soal|no\.?|pertanyaan)\s*#?(\d{1,4})(?:[\.\:\)\-]\s*|\s+)(.*)$/i);
      if (matchLabel) return { num: matchLabel[1], text: matchLabel[2].trim() };

      const matchBracket = line.match(/^\[(\d{1,4})\]\s*(.*)$/);
      if (matchBracket) return { num: matchBracket[1], text: matchBracket[2].trim() };

      return null;
    };

    // 1. Detect if input is genuinely tabular (tabs, or consistent CSV/SSV rows)
    const tabMultiColLines = rawLines.filter(l => l.split('\t').length >= 3).length;
    const verticalTabLines = rawLines.filter(l => {
      if (!l.includes('\t')) return false;
      const cols = l.split('\t').map(c => c.trim().toLowerCase());
      return cols.some((c, idx) => idx < 3 && /^(?:soal|pertanyaan|jawaban|jawaba|opsi|pilihan|pilihan\s+[a-h]|jawaban\s+[a-h]|opsi\s+[a-h])$/.test(c));
    }).length;
    const hasTabs = tabMultiColLines >= 2 || verticalTabLines >= 2 || (rawLines.some(l => l.includes('\t')) && rawLines.every(l => l.includes('\t') || isHeaderLine(l)));

    const looksLikeProseQuestionList = rawLines.some(l => isQuestionStartLine(l) !== null) && rawLines.some(l => isOptionLine(l) !== null);
    const semiMultiColLines = !hasTabs && !looksLikeProseQuestionList
      ? rawLines.filter(l => l.includes(';') && l.split(';').length >= 3).length
      : 0;
    const hasSemicolons = semiMultiColLines >= 2 && semiMultiColLines >= Math.ceil(rawLines.length * 0.5);

    const commaMultiColLines = !hasTabs && !hasSemicolons && !looksLikeProseQuestionList
      ? rawLines.filter(l => l.includes(',') && l.split(',').length >= 3).length
      : 0;
    const hasCommas = commaMultiColLines >= 2 && commaMultiColLines >= Math.ceil(rawLines.length * 0.6);

    const isTabular = hasTabs || hasSemicolons || hasCommas;
    const sep = hasTabs ? '\t' : (hasSemicolons ? ';' : ',');

    if (isTabular) {
      // Check if it's Vertical Format (contains words like SOAL/JAWABAN/PERTANYAAN/OPSI in rows)
      const isSoalTag = (c: string) => /^(?:soal|pertanyaan|question|q)$/i.test(c);
      const isJawabanTag = (c: string) => /^(?:jawaban|jawaba|opsi|pilihan|a)$/i.test(c) || /^(?:jawaban|pilihan|opsi)\s+[a-h1-8]$/i.test(c);

      const verticalKeywordHits = rawLines.filter(line => {
        const cols = line.split(sep).map(c => c.trim().toLowerCase());
        return cols.some((c, idx) => idx < 3 && (isSoalTag(c) || isJawabanTag(c)));
      }).length;

      const isVerticalFormat = verticalKeywordHits >= 2 || (verticalKeywordHits >= 1 && rawLines.length <= 10);

      if (isVerticalFormat) {
        const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        let currentQ: Omit<Question, 'id'> | null = null;
        let optIdx = 0;

        // Track known column indices from any header row (e.g. No | Jenis | Isi | Jawaban)
        let jenisColIdx = -1;
        let isiColIdx = -1;
        let jawabanColIdx = -1;

        rawLines.forEach(line => {
          const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 2) return;

          if (isHeaderLine(line, cols)) {
            const lowerCols = cols.map(c => c.toLowerCase());
            const jIdx = lowerCols.findIndex(c => c === 'jenis' || c === 'tipe');
            const iIdx = lowerCols.findIndex(c => c === 'isi' || c === 'pertanyaan' || c === 'soal' || c === 'teks');
            const sIdx = lowerCols.findIndex(c => c === 'jawaban' || c === 'status jawaban' || c === 'kunci' || c === 'status');
            if (jIdx !== -1) jenisColIdx = jIdx;
            if (iIdx !== -1) isiColIdx = iIdx;
            if (sIdx !== -1) jawabanColIdx = sIdx;
            return;
          }

          const c0 = cols[0] || '';
          const lowerAll = cols.map(c => c.toLowerCase());

          // Identify whether row is SOAL or JAWABAN
          const explicitJenis = jenisColIdx >= 0 ? (cols[jenisColIdx] || '').toLowerCase() : '';
          const hasExplicitSoalTag = explicitJenis ? isSoalTag(explicitJenis) : lowerAll.some((c, idx) => idx < 3 && isSoalTag(c));
          const hasExplicitJawabanTag = explicitJenis ? isJawabanTag(explicitJenis) : lowerAll.some((c, idx) => idx < 3 && isJawabanTag(c));

          const isSoal = hasExplicitSoalTag || (/^\d+$/.test(c0) && !hasExplicitJawabanTag);

          // Helpers to filter out pure keywords, numbers, or statuses when column layout is unknown
          const isKeyword = (t: string) => isSoalTag(t) || isJawabanTag(t);
          const isStatus = (t: string) => ['0', '1', 'benar', 'salah', 'true', 'false', 'ya', 'tidak', 'v', 'kunci'].includes(t.toLowerCase()) || /^[A-Ha-h]$/.test(t);
          const isNum = (t: string) => /^\d+$/.test(t);

          let statusJawaban = '';
          if (jawabanColIdx >= 0 && cols[jawabanColIdx] !== undefined) {
            statusJawaban = cols[jawabanColIdx];
          } else {
            for (let i = cols.length - 1; i >= 0; i--) {
              if (i !== isiColIdx && isStatus(cols[i]) && !statusJawaban) {
                statusJawaban = cols[i];
              }
            }
          }

          let isi = '';
          if (isiColIdx >= 0 && cols[isiColIdx] !== undefined && cols[isiColIdx] !== '') {
            isi = cols[isiColIdx];
          } else {
            const candidateCells = cols.filter((c, idx) => c && idx !== jenisColIdx && idx !== jawabanColIdx && !isKeyword(c) && !isStatus(c));
            if (candidateCells.length > 0) {
              const nonNum = candidateCells.filter(c => !isNum(c));
              isi = nonNum.length > 0 ? nonNum.reduce((a, b) => a.length >= b.length ? a : b) : candidateCells[0];
            } else {
              const nonKey = cols.filter((c, idx) => c && idx !== jenisColIdx && idx !== jawabanColIdx && !isKeyword(c));
              isi = nonKey.length > 0 ? nonKey[0] : (cols[cols.length - 1] || '');
            }
          }

          if (isSoal && isi) {
            if (currentQ) {
              questions.push(currentQ);
            }
            currentQ = {
              topicId,
              text: isi,
              type: 'pilihan_ganda',
              options: [],
              correctAnswer: 'A',
              points: 10
            };
            optIdx = 0;
          } else if (!isSoal && isi) {
            if (!currentQ) {
              currentQ = {
                topicId,
                text: `Pertanyaan ${questions.length + 1}`,
                type: 'pilihan_ganda',
                options: [],
                correctAnswer: 'A',
                points: 10
              };
              optIdx = 0;
            }

            const currentKey = optionKeys[optIdx] || String.fromCharCode(65 + optIdx);
            if (!currentQ.options) currentQ.options = [];
            currentQ.options.push({
              key: currentKey,
              text: isi
            });

            const isCorrect = ['1', 'benar', 'true', 'ya', 'kunci', 'v', 'y'].includes(statusJawaban.toLowerCase()) ||
                              (statusJawaban.length === 1 && statusJawaban.toUpperCase() === currentKey);
            if (isCorrect) {
              currentQ.correctAnswer = currentKey;
            }
            optIdx++;
          }
        });

        if (currentQ) {
          questions.push(currentQ);
        }

        if (questions.length > 0) {
          return questions.map(q => {
            if (!q.options || q.options.length < 2) {
              const { options: _omit, ...rest } = q;
              return {
                ...rest,
                type: 'essay' as QuestionType,
                correctAnswer: q.correctAnswer || 'Panduan Jawaban'
              };
            }
            return q;
          });
        }
      } else {
        // Horizontal 1-row-per-question table (e.g. No, Soal, A, B, C, D, [E], Kunci, [Poin])
        rawLines.forEach((line) => {
          const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 3 || isHeaderLine(line, cols)) return;

          let soalText = '';
          let optTexts: string[] = [];
          let keyVal = '';
          let pointsVal = 10;

          if (/^\d+$/.test(cols[0])) {
            soalText = cols[1] || '';
            optTexts = cols.slice(2, cols.length - 1);
            keyVal = cols[cols.length - 1] || '';
          } else {
            soalText = cols[0] || '';
            optTexts = cols.slice(1, cols.length - 1);
            keyVal = cols[cols.length - 1] || '';
          }

          if (/^\d+$/.test(keyVal) && parseInt(keyVal) >= 10 && optTexts.length > 0) {
            const possibleKey = optTexts[optTexts.length - 1];
            if (/^[A-Ha-h]$/.test(possibleKey)) {
              pointsVal = parseInt(keyVal);
              keyVal = possibleKey;
              optTexts = optTexts.slice(0, optTexts.length - 1);
            }
          }

          if (soalText) {
            const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const validOpts: QuestionOption[] = [];
            let detectedAnswer = 'A';

            optTexts.forEach((text, i) => {
              if (!text) return;
              const currentLetter = keys[i] || String.fromCharCode(65 + i);
              validOpts.push({
                key: currentLetter,
                text
              });

              const cleanKeyVal = keyVal.toUpperCase().trim();
              if (cleanKeyVal === currentLetter || cleanKeyVal === String(i + 1) || (cleanKeyVal === '1' && i === 0) || cleanKeyVal === text.toUpperCase()) {
                detectedAnswer = currentLetter;
              }
            });

            if (validOpts.length >= 2) {
              questions.push({
                topicId,
                text: soalText,
                type: 'pilihan_ganda',
                options: validOpts,
                correctAnswer: detectedAnswer,
                points: pointsVal
              });
            } else {
              questions.push({
                topicId,
                text: soalText,
                type: 'essay',
                correctAnswer: keyVal || 'Panduan Jawaban',
                points: pointsVal
              });
            }
          }
        });

        if (questions.length > 0) return questions;
      }
    }

    // 2. Plain Text / Numbered List / Aiken format (e.g. 1. Soal, A. Opsi, B. Opsi, Kunci: A)
    // Also supports a trailing "Kunci Jawaban" section at the bottom of the document
    let curSoalNo = '';
    let curSoalText = '';
    let curOptions: { key: string; text: string; isCorrect: boolean }[] = [];
    let questionIndex = 1;
    let inAnswerKeySection = false;
    const trailingAnswerKeys: { num: number; key: string }[] = [];

    const flushQuestion = () => {
      if (curSoalText.trim()) {
        if (curOptions.length >= 2) {
          let correctKey = 'A';
          const matched = curOptions.find(o => o.isCorrect);
          if (matched) correctKey = matched.key;

          questions.push({
            topicId,
            text: curSoalText.trim(),
            type: 'pilihan_ganda',
            options: curOptions.map(o => ({ key: o.key, text: o.text })),
            correctAnswer: correctKey,
            points: 10
          });
        } else {
          questions.push({
            topicId,
            text: curSoalText.trim(),
            type: 'essay',
            correctAnswer: 'Panduan Jawaban',
            points: 10
          });
        }
        questionIndex++;
      }
      curSoalNo = '';
      curSoalText = '';
      curOptions = [];
    };

    rawLines.forEach(line => {
      if (isHeaderLine(line)) return;

      // Detect start of a trailing "KUNCI JAWABAN" section after questions were already parsed
      if (/^(?:kunci\s+jawaban|kunci|answer\s+key)[\s\:]*$/i.test(line) && (questions.length > 0 || curOptions.length >= 2)) {
        flushQuestion();
        inAnswerKeySection = true;
        return;
      }

      if (inAnswerKeySection) {
        // Match pairs like "1. A", "1) B", "1: C", or multiple on one line "1. A  2. B  3. C"
        const pairRegex = /(\d{1,4})[\.\)\:\-\s]+([A-Ha-h])\b/g;
        let m: RegExpExecArray | null;
        while ((m = pairRegex.exec(line)) !== null) {
          trailingAnswerKeys.push({ num: parseInt(m[1], 10), key: m[2].toUpperCase() });
        }
        return;
      }

      const qStart = isQuestionStartLine(line);
      const ansKey = isAnswerKeyLine(line);
      const optStart = isOptionLine(line);

      if (ansKey) {
        let keyMatched = false;
        curOptions.forEach(opt => {
          if (opt.key === ansKey) {
            opt.isCorrect = true;
            keyMatched = true;
          }
        });
        if (!keyMatched && curOptions.length > 0) {
          const targetOpt = curOptions.find(o => o.key === ansKey.toUpperCase());
          if (targetOpt) targetOpt.isCorrect = true;
        }
      } else if (qStart) {
        flushQuestion();
        curSoalNo = qStart.num;
        curSoalText = qStart.text;
      } else if (optStart) {
        // If an option like 'A.' arrives and we already have options including 'A', flush previous question
        if (optStart.key === 'A' && curOptions.some(o => o.key === 'A') && curOptions.length >= 2) {
          flushQuestion();
        }
        
        curOptions.push({
          key: optStart.key,
          text: optStart.text,
          isCorrect: optStart.isCorrect
        });
      } else {
        // Line is not an option, not a key, not starting with a number
        if (curOptions.length >= 2) {
          // The previous question is complete! This line is the question text for the NEXT question.
          flushQuestion();
          curSoalNo = String(questionIndex);
          curSoalText = line;
        } else if (curOptions.length > 0) {
          // Continuation of the last option text
          const last = curOptions[curOptions.length - 1];
          last.text += ' ' + line;
        } else if (curSoalText || curSoalNo) {
          // Continuation of question text (or first text line after standalone "1.")
          curSoalText = curSoalText ? `${curSoalText}\n${line}` : line;
        } else {
          // First line of question text
          curSoalNo = String(questionIndex);
          curSoalText = line;
        }
      }
    });

    flushQuestion();

    // Apply any trailing answer keys found at the bottom of the Word document
    if (trailingAnswerKeys.length > 0) {
      trailingAnswerKeys.forEach(({ num, key }) => {
        const target = questions[num - 1];
        if (target && target.type === 'pilihan_ganda' && target.options?.some(o => o.key === key)) {
          target.correctAnswer = key;
        }
      });
    }

    return questions;
  };

  const questionsToWordRows = (parsedQuestions: Omit<Question, 'id'>[]): WordFormRow[] => {
    const rows: WordFormRow[] = [];
    parsedQuestions.forEach((q, idx) => {
      rows.push({
        no: String(idx + 1),
        jenis: 'SOAL',
        isi: q.text,
        jawaban: '',
        ...(q.image ? { image: q.image } : {})
      });

      if (q.options && q.options.length > 0) {
        q.options.forEach(opt => {
          rows.push({
            no: '',
            jenis: 'JAWABAN',
            isi: opt.text,
            jawaban: opt.key === q.correctAnswer ? '1' : '0',
            ...(opt.image ? { image: opt.image } : {})
          });
        });
      }
    });
    return rows;
  };

  const parseWordTextToRows = (text: string): WordFormRow[] => {
    if (!text || !text.trim()) return [];
    const parsedQuestions = parseUniversalQuestions(text, 'TEMP');
    if (parsedQuestions.length > 0) {
      return questionsToWordRows(parsedQuestions);
    }
    return [];
  };

  const handleWordTextChange = (text: string) => {
    setWordText(text);
    setWordUploadError('');
    setWordStructuralErrors([]);
    if (text.trim()) {
      const rows = parseWordTextToRows(text);
      setWordRows(rows);
    } else {
      setWordRows([]);
    }
  };

  const handleUpdateRow = (index: number, field: keyof WordFormRow, value: string) => {
    const updated = [...wordRows];
    updated[index] = { ...updated[index], [field]: value };

    // If updating jawaban to '1', automatically set all other sibling options for the same question to '0'
    if (field === 'jawaban' && value === '1' && updated[index].jenis === 'JAWABAN') {
      // Find the parent SOAL index
      let parentSoalIdx = -1;
      for (let i = index - 1; i >= 0; i--) {
        if (updated[i].jenis === 'SOAL') {
          parentSoalIdx = i;
          break;
        }
      }
      if (parentSoalIdx !== -1) {
        for (let i = parentSoalIdx + 1; i < updated.length; i++) {
          if (updated[i].jenis === 'SOAL') break;
          if (i !== index && updated[i].jenis === 'JAWABAN') {
            updated[i] = { ...updated[i], jawaban: '0' };
          }
        }
      }
    }

    setWordRows(updated);
    const serialized = serializeRowsToText(updated);
    setWordText(serialized);
  };

  // Set specific option row as the sole correct key ('1') and others to '0'
  const handleSetRowAsCorrectKey = (rowIndex: number) => {
    handleUpdateRow(rowIndex, 'jawaban', '1');
  };

  const handleAddRow = (type: 'SOAL' | 'JAWABAN') => {
    const maxNo = Math.max(...wordRows.map(r => parseInt(r.no) || 0), 0);
    const newRow: WordFormRow = type === 'SOAL' 
      ? { no: String(maxNo + 1), jenis: 'SOAL', isi: '', jawaban: '' }
      : { no: '', jenis: 'JAWABAN', isi: '', jawaban: '0' };
    const updated = [...wordRows, newRow];
    setWordRows(updated);
    setWordText(serializeRowsToText(updated));
  };

  // Add 1 complete question pack (1 SOAL + 5 JAWABAN A-E) in 1 click
  const handleAddCompleteQuestionPack = () => {
    const maxNo = Math.max(...wordRows.map(r => parseInt(r.no) || 0), 0);
    const newSoalNo = String(maxNo + 1);
    const newPack: WordFormRow[] = [
      { no: newSoalNo, jenis: 'SOAL', isi: `Pertanyaan nomor ${newSoalNo}...`, jawaban: '' },
      { no: '', jenis: 'JAWABAN', isi: 'Pilihan Jawaban A', jawaban: '1' },
      { no: '', jenis: 'JAWABAN', isi: 'Pilihan Jawaban B', jawaban: '0' },
      { no: '', jenis: 'JAWABAN', isi: 'Pilihan Jawaban C', jawaban: '0' },
      { no: '', jenis: 'JAWABAN', isi: 'Pilihan Jawaban D', jawaban: '0' },
      { no: '', jenis: 'JAWABAN', isi: 'Pilihan Jawaban E', jawaban: '0' },
    ];
    const updated = [...wordRows, ...newPack];
    setWordRows(updated);
    setWordText(serializeRowsToText(updated));
  };

  // Open Mass Option Modal for a specific SOAL row
  const handleOpenMassModalForSoal = (soalIndex: number) => {
    const targetSoal = wordRows[soalIndex];
    if (!targetSoal || targetSoal.jenis !== 'SOAL') return;

    // Collect existing sibling JAWABAN rows following this SOAL
    const siblingOptions: WordFormRow[] = [];
    for (let i = soalIndex + 1; i < wordRows.length; i++) {
      if (wordRows[i].jenis === 'SOAL') break;
      siblingOptions.push(wordRows[i]);
    }

    const keys: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    const extractedOpts = { A: '', B: '', C: '', D: '', E: '' };
    let extractedCorrectKey: 'A' | 'B' | 'C' | 'D' | 'E' = 'A';

    siblingOptions.forEach((optRow, idx) => {
      if (idx < 5) {
        const k = keys[idx];
        extractedOpts[k] = optRow.isi;
        if (optRow.jawaban === '1') {
          extractedCorrectKey = k;
        }
      }
    });

    const rawLines = keys.map(k => `${k}. ${extractedOpts[k]}`).filter(line => line.length > 3).join('\n');

    setMassOptionModal({
      isOpen: true,
      targetSoalIndex: soalIndex,
      soalText: targetSoal.isi,
      soalNumber: targetSoal.no || String(soalIndex + 1),
      rawText: rawLines || '',
      options: extractedOpts,
      correctKey: extractedCorrectKey,
      activeTab: 'paste'
    });
  };

  // Apply Mass Options into wordRows
  const handleApplyMassOptions = () => {
    const { targetSoalIndex, options: manualOpts, rawText, correctKey, activeTab } = massOptionModal;
    
    // Parse options from rawText or use manual inputs
    const finalOptions = activeTab === 'paste' ? parseRawOptionLines(rawText) : manualOpts;
    const keys: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

    const newOptionRows: WordFormRow[] = keys.map(k => ({
      no: '',
      jenis: 'JAWABAN',
      isi: finalOptions[k] || `Pilihan ${k}`,
      jawaban: k === correctKey ? '1' : '0'
    }));

    if (targetSoalIndex !== null && wordRows[targetSoalIndex]) {
      // Find existing sibling options to replace
      let endOptionIdx = targetSoalIndex + 1;
      while (endOptionIdx < wordRows.length && wordRows[endOptionIdx].jenis === 'JAWABAN') {
        endOptionIdx++;
      }

      // Replace old options with new 5 option rows
      const updated = [
        ...wordRows.slice(0, targetSoalIndex + 1),
        ...newOptionRows,
        ...wordRows.slice(endOptionIdx)
      ];

      setWordRows(updated);
      setWordText(serializeRowsToText(updated));
    } else {
      // Append a new question + 5 option rows
      const maxNo = Math.max(...wordRows.map(r => parseInt(r.no) || 0), 0);
      const newSoalRow: WordFormRow = {
        no: String(maxNo + 1),
        jenis: 'SOAL',
        isi: massOptionModal.soalText || 'Tulis pertanyaan baru Anda di sini...',
        jawaban: ''
      };
      const updated = [...wordRows, newSoalRow, ...newOptionRows];
      setWordRows(updated);
      setWordText(serializeRowsToText(updated));
    }

    setMassOptionModal(prev => ({ ...prev, isOpen: false }));
  };

  // Single Question Form ('case soal') Mass Paste Handler
  const handleSingleFormMassApply = () => {
    const parsed = parseRawOptionLines(singleFormMassText);
    const updatedOptions: QuestionOption[] = [
      { key: 'A', text: parsed.A || options[0]?.text || '', image: options[0]?.image },
      { key: 'B', text: parsed.B || options[1]?.text || '', image: options[1]?.image },
      { key: 'C', text: parsed.C || options[2]?.text || '', image: options[2]?.image },
      { key: 'D', text: parsed.D || options[3]?.text || '', image: options[3]?.image },
      { key: 'E', text: parsed.E || options[4]?.text || '', image: options[4]?.image }
    ];
    setOptions(updatedOptions);
    setQCorrect(singleFormCorrectKey);
    setSingleFormMassModal(false);
    setSingleFormMassText('');
  };

  const handleDeleteWordBlock = (soalRowIndex: number) => {
    let endIdx = soalRowIndex + 1;
    while (endIdx < wordRows.length && wordRows[endIdx].jenis === 'JAWABAN') {
      endIdx++;
    }
    const updated = [...wordRows.slice(0, soalRowIndex), ...wordRows.slice(endIdx)];
    // Auto-renumber SOAL rows sequentially
    let seq = 1;
    const renumbered = updated.map(r => (r.jenis === 'SOAL' ? { ...r, no: String(seq++) } : r));
    setWordRows(renumbered);
    setWordText(serializeRowsToText(renumbered));
  };

  const handleDeleteRow = (index: number) => {
    const updated = wordRows.filter((_, i) => i !== index);
    setWordRows(updated);
    setWordText(serializeRowsToText(updated));
  };

  const handleClearRows = () => {
    setWordRows([]);
    setWordText('');
    setWordFileName('');
    setWordUploadError('');
    setWordStructuralErrors([]);
    setImportStatus('idle');
  };

  const handlePrefillWordRows = () => {
    setWordRows(defaultWordRows);
    setWordText(serializeRowsToText(defaultWordRows));
    setWordUploadError('');
    setWordStructuralErrors([]);
    setWordFileName('Contoh_2_Soal_Template');
  };
  const [spreadsheetText, setSpreadsheetText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isDragActive, setIsDragActive] = useState(false);

  const processExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        
        // Read workbook
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to 2D array
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        const formattedRows: string[] = [];
        
        rawRows.forEach((row: any[]) => {
          if (!row || row.length === 0) return;
          // Check if row has any content
          const hasContent = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
          if (!hasContent) return;
          
          // Find the last non-empty cell in the row
          let lastIdx = -1;
          for (let i = row.length - 1; i >= 0; i--) {
            if (row[i] !== undefined && row[i] !== null && String(row[i]).trim() !== '') {
              lastIdx = i;
              break;
            }
          }
          const numCols = Math.max(lastIdx + 1, 4);

          // Format cells to tab-separated columns without artificial column truncation
          const cols = Array.from({ length: numCols }).map((_, i) => {
            const cellVal = row[i];
            if (cellVal === undefined || cellVal === null) return '';
            return String(cellVal).trim().replace(/\r?\n|\r/g, ' '); // remove newlines inside cell
          });
          
          formattedRows.push(cols.join('\t'));
        });
        
        if (formattedRows.length > 0) {
          setSpreadsheetText(formattedRows.join('\n'));
          setImportStatus('idle');
        } else {
          alert('File Excel kosong atau tidak memiliki data yang valid.');
        }
      } catch (err) {
        console.error(err);
        alert('Gagal membaca file Excel. Pastikan format file cocok.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
  };

  const [isWordDragActive, setIsWordDragActive] = useState(false);

  // Helper: Compress embedded Word images in browser canvas so 50 questions with images fit comfortably in Firestore
  const compressImageDataUrl = (dataUrl: string, maxWidth = 680, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        resolve(dataUrl);
        return;
      }
      // Keep small PNG/GIF/SVG assets untouched to preserve sharp diagrams/transparency
      if (dataUrl.length < 45000) {
        resolve(dataUrl);
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        try {
          let targetW = img.width;
          let targetH = img.height;
          if (targetW > maxWidth) {
            targetH = Math.round((img.height * maxWidth) / targetW);
            targetW = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          // Fill white background before JPEG encoding so transparent PNGs remain crisp
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const processWordFile = (file: File) => {
    setWordUploadError('');
    setWordStructuralErrors([]);
    setWordFileName(file.name);
    setImportStatus('idle');

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
      setWordUploadError('File format .doc (Word versi lama) tidak didukung langsung oleh browser. Buka file di Microsoft Word lalu pilih Save As -> Word Document (.docx), atau salin (Ctrl+C) isi soal dan tempel ke tab "Input Copy-Paste Teks Manual".');
      return;
    }

    setIsReadingWordFile(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          setIsReadingWordFile(false);
          return;
        }

        // 1. Convert docx to HTML using mammoth (images are embedded as base64 data URLs)
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value || '';

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 2. Compress large embedded images asynchronously so multi-image exams stay lightweight
        const imgElements = Array.from(doc.querySelectorAll('img'));
        if (imgElements.length > 0) {
          await Promise.all(
            imgElements.map(async (imgEl) => {
              const src = imgEl.getAttribute('src') || '';
              if (src.startsWith('data:image/')) {
                const optimized = await compressImageDataUrl(src);
                imgEl.setAttribute('src', optimized);
              }
            })
          );
        }

        // A. Identify top-level EXAMPRO template tables & extract rows directly (keeping images & incomplete blocks for validation)
        const extractCellContent = (cell: Element) => extractCellContentFromElement(cell, doc);
        const {
          hasExamproTemplateTable,
          rows: extractedTemplateRows,
          structuralIssues,
          topLevelTables
        } = extractExamproRowsFromDocument(doc);

        if (hasExamproTemplateTable && extractedTemplateRows.length > 0) {
          setWordRows(extractedTemplateRows);
          setWordText(serializeRowsToText(extractedTemplateRows));
          setWordStructuralErrors(structuralIssues);
          setWordInputMode('preview');
          setImportStatus('idle');
          setWordUploadError('');
          setIsReadingWordFile(false);
          return;
        }

        // B. Fallback for non-template Word tables (e.g. horizontal tables) & standard numbered Word paragraphs/lists
        const formattedRows: string[] = [];
        topLevelTables.forEach(table => {
          const directRows = getDirectTableRows(table);
          directRows.forEach(row => {
            const cells = Array.from(row.children).filter(c => c.tagName === 'TD' || c.tagName === 'TH');
            const rowVals = cells.map(cell => extractCellContent(cell).text.replace(/\r?\n|\r/g, ' ').trim());
            if (rowVals.length > 0 && rowVals.some(v => v.length > 0)) {
              formattedRows.push(rowVals.join('\t'));
            }
          });
        });

        // C. Extract structured non-table HTML content recursively (handles nested Word <ol>/<li> lists & Shift+Enter <br>)
        const htmlLines: string[] = [];
        const paragraphImages: Map<string, string> = new Map();
        let topListCounter = 1;
        const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

        const getOwnLiContent = (li: Element): { text: string; image?: string } => {
          const clone = li.cloneNode(true) as Element;
          clone.querySelectorAll('ol, ul').forEach(nested => nested.remove());
          const firstImg = clone.querySelector('img');
          const image = firstImg?.getAttribute('src') || undefined;
          clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
          const pBlocks = clone.querySelectorAll('p');
          const text = pBlocks.length > 0
            ? Array.from(pBlocks).map(p => (p.textContent || '').trim()).filter(Boolean).join('\n')
            : (clone.textContent || '').trim();
          return { text, image };
        };

        const walkNode = (node: Element, listDepth: number) => {
          const tag = node.tagName.toLowerCase();
          if (tag === 'table') return;

          if (tag === 'ol' || tag === 'ul') {
            const listType = (node.getAttribute('type') || '').trim();
            const isLetteredList = listType === 'a' || listType === 'A' || listDepth >= 1;
            let optCounter = 0;

            Array.from(node.children).forEach(child => {
              if (child.tagName.toLowerCase() !== 'li') return;
              const { text: ownText, image } = getOwnLiContent(child);
              if (ownText || image) {
                const firstLine = (ownText || '').split('\n')[0].trim();
                const alreadyQuestionNum = /^\d{1,4}[\.\)\:]/.test(firstLine);
                const alreadyOptionKey = /^[\(\[]?[A-Ha-h][\)\]\.\:]/.test(firstLine);
                const isKunciLine = /^(?:kunci|jawaban|answer|ans)/i.test(firstLine);

                if (alreadyQuestionNum || alreadyOptionKey || isKunciLine) {
                  const lines = ownText.split('\n').map(l => l.trim()).filter(Boolean);
                  lines.forEach(l => htmlLines.push(l));
                  if (image && lines[0]) paragraphImages.set(lines[0], image);
                } else if (isLetteredList) {
                  const letter = optionLetters[optCounter] || String.fromCharCode(65 + optCounter);
                  const lines = ownText.split('\n').map(l => l.trim()).filter(Boolean);
                  const formattedFirst = `${letter}. ${lines[0] || `[Gambar Pilihan ${letter}]`}`;
                  htmlLines.push(formattedFirst);
                  lines.slice(1).forEach(l => htmlLines.push(l));
                  if (image) paragraphImages.set(lines[0] || `[Gambar Pilihan ${letter}]`, image);
                  optCounter++;
                } else {
                  const lines = ownText.split('\n').map(l => l.trim()).filter(Boolean);
                  const formattedFirst = `${topListCounter}. ${lines[0] || `[Gambar Soal ${topListCounter}]`}`;
                  htmlLines.push(formattedFirst);
                  lines.slice(1).forEach(l => htmlLines.push(l));
                  if (image) paragraphImages.set(lines[0] || `[Gambar Soal ${topListCounter}]`, image);
                  topListCounter++;
                }
              }

              Array.from(child.children).forEach(nested => {
                const nTag = nested.tagName.toLowerCase();
                if (nTag === 'ol' || nTag === 'ul') {
                  walkNode(nested, listDepth + 1);
                }
              });
            });
            return;
          }

          if (/^(?:p|h[1-6])$/.test(tag)) {
            const { text, image } = extractCellContent(node);
            if (text) {
              const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
              lines.forEach(l => htmlLines.push(l));
              if (image && lines[0]) paragraphImages.set(lines[0], image);
            } else if (image && htmlLines.length > 0) {
              // Standalone image paragraph right after a question or option line
              paragraphImages.set(htmlLines[htmlLines.length - 1], image);
            }
            return;
          }

          Array.from(node.children).forEach(child => walkNode(child, listDepth));
        };

        if (doc.body) {
          walkNode(doc.body, 0);
        }
        const nonTableHtmlText = htmlLines.join('\n');

        // D. Also extract raw plain text as fallback candidate
        const textResult = await mammoth.extractRawText({ arrayBuffer });
        const plainText = (textResult.value || '').trim();

        const tableCandidateText = formattedRows.join('\n');
        const tableQuestions = tableCandidateText ? parseUniversalQuestions(tableCandidateText, 'TEMP') : [];
        const nonTableQuestions = nonTableHtmlText ? parseUniversalQuestions(nonTableHtmlText, 'TEMP') : [];
        const plainQuestions = plainText ? parseUniversalQuestions(plainText, 'TEMP') : [];

        const combinedCount = tableQuestions.length + nonTableQuestions.length;
        let chosenQuestions: Omit<Question, 'id'>[] = [];
        let bestText = '';

        if (combinedCount >= plainQuestions.length && combinedCount > 0) {
          chosenQuestions = [...tableQuestions, ...nonTableQuestions];
          bestText = [tableCandidateText, nonTableHtmlText].filter(Boolean).join('\n');
        } else if (plainQuestions.length > 0) {
          chosenQuestions = plainQuestions;
          bestText = plainText;
        }

        // Attach any paragraph-extracted images back onto matching questions/options
        if (paragraphImages.size > 0) {
          chosenQuestions = chosenQuestions.map(q => {
            const qFirstLine = q.text.split('\n')[0].trim();
            const qImg = paragraphImages.get(qFirstLine);
            const updatedOpts = q.options?.map(opt => {
              const oImg = paragraphImages.get(opt.text.trim());
              return oImg ? { ...opt, image: oImg } : opt;
            });
            return {
              ...q,
              ...(qImg ? { image: qImg } : {}),
              ...(updatedOpts ? { options: updatedOpts } : {})
            };
          });
        }

        const bestRows = questionsToWordRows(chosenQuestions);

        if (bestRows.length > 0) {
          setWordText(bestText);
          setWordRows(bestRows);
          setWordStructuralErrors([]);
          setWordInputMode('preview');
          setImportStatus('idle');
          setWordUploadError('');
        } else {
          setWordRows([]);
          setWordText(plainText || nonTableHtmlText || tableCandidateText || '');
          setWordUploadError('Tidak ditemukan soal yang sesuai format di file "' + file.name + '". Pastikan menggunakan Template Word EXAMPRO (4 kolom: No, Jenis, Isi, Jawaban) atau format naskah bernomor.');
        }
      } catch (err) {
        console.error(err);
        setWordUploadError('Gagal membaca file Word "' + file.name + '". Pastikan file adalah dokumen .docx yang valid (bukan .doc lama).');
      } finally {
        setIsReadingWordFile(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleWordDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsWordDragActive(true);
    } else if (e.type === "dragleave") {
      setIsWordDragActive(false);
    }
  };

  const handleWordDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWordDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processWordFile(e.dataTransfer.files[0]);
    }
  };

  const handleWordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processWordFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;

    // Generate a secure, unique uppercase prefix based on the name + 3 random numbers
    const cleanPrefix = topicName.trim().substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'TP';
    const generatedCode = `${cleanPrefix}-${Math.floor(100 + Math.random() * 900)}`;

    onAddTopic({
      name: topicName,
      code: generatedCode,
      moduleName: 'Umum',
      description: topicDesc
    });
    setTopicName('');
    setTopicDesc('');
  };

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) return;

    onAddQuestion({
      topicId: qTopic || topics[0]?.id || 'T01',
      text: qText,
      type: qType,
      options: qType === 'pilihan_ganda' ? options : undefined,
      correctAnswer: qType === 'pilihan_ganda' ? qCorrect : qEssayGuidance,
      points: Number(qPoints) || 10,
      image: qImage || undefined,
      audio: qAudio || undefined
    });

    setQText('');
    setQImage('');
    setQAudio('');
    setQEssayGuidance('');
    setOptions([
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' },
      { key: 'E', text: '' }
    ]);
  };

  const handleImageUpload = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOptionChange = (key: string, val: string, img?: string) => {
    setOptions(options.map(opt => {
      if (opt.key === key) {
        const updated = { ...opt, text: val };
        if (img !== undefined) {
          updated.image = img;
        }
        return updated;
      }
      return opt;
    }));
  };

  const handleWordImport = () => {
    const targetTopicId = qTopic || topics[0]?.id || 'T01';

    let effectiveRows = wordRows;
    if (effectiveRows.length === 0 && wordText.trim()) {
      effectiveRows = parseWordTextToRows(wordText);
    }
    if (effectiveRows.length === 0) {
      setImportStatus('error');
      return;
    }

    const validation = buildValidatedWordQuestions(effectiveRows, targetTopicId, wordStructuralErrors);

    if (validation.exceedsLimit || validation.errors.length > 0 || validation.questions.length === 0) {
      setImportStatus('error');
      return;
    }

    try {
      if (onBulkAddQuestions) {
        onBulkAddQuestions(validation.questions);
      } else {
        validation.questions.forEach(q => onAddQuestion(q));
      }

      setImportSuccessCount(validation.questions.length);
      setImportStatus('success');
      setWordUploadError('');
      setWordStructuralErrors([]);
      setWordFileName('');
      setWordRows([]);
      setWordText('');
      setTimeout(() => setImportStatus('idle'), 6000);
    } catch (err) {
      console.error(err);
      setImportStatus('error');
    }
  };

  const handleDownloadWordTemplate = async (countOverride?: 10 | 20 | 30 | 40 | 50) => {
    const soalCount = countOverride || templateQuestionCount;
    try {
      const { Packer } = await import('docx');
      const doc = await buildExamproWordDocument(soalCount);
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Template_Soal_EXAMPRO_${soalCount}_Soal.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error creating docx: ", err);
      alert("Gagal mengunduh file .docx. Silakan coba lagi.");
    }
  };

  const handlePrefillWordTemplate = () => {
    handlePrefillWordRows();
  };

  const handleSpreadsheetImport = () => {
    if (!spreadsheetText.trim()) return;
    try {
      const parsedQuestions = parseUniversalQuestions(spreadsheetText, qTopic || topics[0]?.id || 'T01');

      if (parsedQuestions.length > 0) {
        if (onBulkAddQuestions) {
          onBulkAddQuestions(parsedQuestions);
        } else {
          parsedQuestions.forEach(q => onAddQuestion(q));
        }

        setImportSuccessCount(parsedQuestions.length);
        setImportStatus('success');
        setSpreadsheetText('');
        setTimeout(() => setImportStatus('idle'), 5000);
      } else {
        setImportStatus('error');
      }
    } catch (err) {
      console.error(err);
      setImportStatus('error');
    }
  };

  const handlePrefillSpreadsheetTemplate = () => {
    // We prefill with a tab-separated format matching the Excel layout in the image
    // (We use tab separator \t so that it copies & pastes cleanly from/to Excel!)
    setSpreadsheetText(`No\tJenis\tKode\tIsi\tStatus Jawaban\tTingkat kesulitan Soal
1\tSOAL\tQ\tBerapakah hasil perkalian dari 5 x 6?\t\t1
\tJAWABAN\tA\tHasilnya adalah 15\t0\t
\tJAWABAN\tA\tHasilnya adalah 20\t0\t
\tJAWABAN\tA\tHasilnya adalah 25\t0\t
\tJAWABAN\tA\tHasilnya adalah 30\t1\t
\tJAWABAN\tA\tHasilnya adalah 35\t0\t
2\tSOAL\tQ\tSiapakah nama Presiden pertama Republik Indonesia?\t\t1
\tJAWABAN\tA\tKi Hajar Dewantara\t0\t
\tJAWABAN\tA\tIr. Soekarno\t1\t
\tJAWABAN\tA\tDrs. Moh. Hatta\t0\t
\tJAWABAN\tA\tSoeharto\t0\t
3\tSOAL\tQ\tJelaskan pengertian ekosistem dan berikan contohnya!\t\t2`);
  };

  const handleDownloadExcelTemplate = () => {
    try {
      // Construct the exact spreadsheet format shown in the user's image
      const wsData = [
        ["Form Import Soal berdasarkan Topik yang dipilih (Import tidak menerima gambar)", "", "", "", "", "Status Jawaban diisi dengan angka 1 untuk jawaban benar"],
        ["", "", "", "", "", "Cell yang berwarna kuning tidak perlu diisi"],
        [], // blank row
        ["No", "Jenis", "Kode", "Isi", "Status Jawaban", "Tingkat kesulitan Soal"],
        [1, "SOAL", "Q", "Berapakah hasil perkalian dari 5 x 6?", "", 1],
        ["", "JAWABAN", "A", "Hasilnya adalah 15", 0, ""],
        ["", "JAWABAN", "A", "Hasilnya adalah 20", 0, ""],
        ["", "JAWABAN", "A", "Hasilnya adalah 25", 0, ""],
        ["", "JAWABAN", "A", "Hasilnya adalah 30", 1, ""],
        ["", "JAWABAN", "A", "Hasilnya adalah 35", 0, ""],
        [2, "SOAL", "Q", "Siapakah nama Presiden pertama Republik Indonesia?", "", 1],
        ["", "JAWABAN", "A", "Ki Hajar Dewantara", 0, ""],
        ["", "JAWABAN", "A", "Ir. Soekarno", 1, ""],
        ["", "JAWABAN", "A", "Drs. Moh. Hatta", 0, ""],
        ["", "JAWABAN", "A", "Soeharto", 0, ""],
        [3, "SOAL", "Q", "Jelaskan pengertian ekosistem dan berikan contohnya!", "", 2]
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Define column widths to make it highly legible
      ws['!cols'] = [
        { wch: 6 },  // No
        { wch: 12 }, // Jenis
        { wch: 8 },  // Kode
        { wch: 65 }, // Isi
        { wch: 16 }, // Status Jawaban
        { wch: 25 }  // Tingkat kesulitan Soal
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Form Import Soal");

      // Write and download the file
      XLSX.writeFile(wb, "Form_Import_Soal_Pilihan_Ganda.xlsx");
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh template Excel. Silakan coba lagi.");
    }
  };

  // Render SubMenus
  const renderSubMenuContent = () => {
    switch (activeSubMenu) {
      case 'topik':
        const filteredTopics = topics.filter(t => 
          t.name.toLowerCase().includes(topicSearchTerm.toLowerCase()) ||
          t.description.toLowerCase().includes(topicSearchTerm.toLowerCase())
        );

      return (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              Kelola Topik Soal
            </h2>
            <form onSubmit={handleCreateTopic} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-5 rounded-2xl border border-emerald-100/30">
              <div className="space-y-1.5 md:col-span-4">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nama Topik</label>
                <input
                  type="text"
                  placeholder="Contoh: Trigonometri Dasar"
                  required
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm bg-white outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5 md:col-span-6">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Keterangan / Deskripsi</label>
                <input
                  type="text"
                  placeholder="Penjelasan ringkas materi ujian"
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm bg-white outline-none transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 transition-all cursor-pointer h-[42px]"
                >
                  <Plus className="h-4 w-4" /> Simpan Topik
                </button>
              </div>
            </form>

            <div className="mt-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Daftar Topik Tersedia ({filteredTopics.length})
                </h3>
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Cari topik..."
                    value={topicSearchTerm}
                    onChange={(e) => setTopicSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs bg-white outline-none transition-all shadow-sm"
                  />
                  <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div className="overflow-x-auto border border-emerald-100 rounded-2xl shadow-sm">
                <table className="w-full text-sm text-left text-slate-500">
                  <thead className="bg-emerald-50/40 text-xs text-emerald-800 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">Nama Topik</th>
                      <th className="px-6 py-3.5">Deskripsi</th>
                      <th className="px-6 py-3.5">Jumlah Soal</th>
                      <th className="px-6 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTopics.map(t => {
                      const count = questions.filter(q => q.topicId === t.id).length;
                      return (
                        <tr key={t.id} className="hover:bg-emerald-50/10 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{t.name}</td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600">{t.description || '-'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-xs border border-emerald-100/50">
                              {count} Soal
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => onDeleteTopic(t.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              disabled={count > 0}
                              title="Hapus Topik (Tidak bisa jika ada soal)"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTopics.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-semibold bg-slate-25">
                          <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                          Tidak ada topik yang cocok atau tersedia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );

    case 'soal':
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 mb-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              Buat Soal Ujian Baru
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Tambahkan pertanyaan bertipe Pilihan Ganda (A-E) atau Uraian/Essay lengkap dengan poin penilaian.
            </p>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Pilih Topik Soal</label>
                  <select
                    value={qTopic}
                    onChange={(e) => setQTopic(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Tipe Soal</label>
                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="pilihan_ganda">Pilihan Ganda</option>
                    <option value="essay">Uraian / Essay</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Bobot Nilai / Poin</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={qPoints}
                    onChange={(e) => setQPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Teks Pertanyaan</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ketik pertanyaan ujian di sini..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Gambar Pendukung Soal (Opsional)</label>
                  
                  <div className="space-y-2">
                    {/* Text Input / URL */}
                    <input
                      type="text"
                      placeholder="Masukkan URL Gambar atau nama file"
                      value={qImage}
                      onChange={(e) => setQImage(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none"
                    />

                    {/* Choose from File Manager */}
                    {files.filter(f => f.type === 'image').length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Pilih File:</span>
                        <select
                          value={qImage}
                          onChange={(e) => setQImage(e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-[11px] bg-white text-slate-600 outline-none"
                        >
                          <option value="">-- Pilih dari File Manager --</option>
                          {files.filter(f => f.type === 'image').map(f => (
                            <option key={f.id} value={f.url}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Direct Upload button */}
                    <div className="flex items-center gap-2">
                      <label className="flex-1 px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg cursor-pointer text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 shadow-sm">
                        <Upload className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Unggah File Lokal</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleImageUpload(e.target.files[0], (b64) => {
                                setQImage(b64);
                              });
                            }
                          }}
                        />
                      </label>
                      
                      {qImage && (
                        <button
                          type="button"
                          onClick={() => setQImage('')}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  {qImage && (
                    <div className="pt-2 border-t border-slate-200/60 mt-2 flex items-center gap-3">
                      <img 
                        src={qImage} 
                        alt="Pratinjau Soal" 
                        className="h-16 w-auto max-w-[120px] rounded object-contain bg-white border border-slate-200 p-1"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // Fallback to placeholder if broken link or local mock URL without actual image
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=150';
                        }}
                      />
                      <div className="text-[10px] text-slate-400">
                        <span className="font-bold text-emerald-700 block">Gambar Terpilih</span>
                        <span className="truncate max-w-[150px] block font-mono text-[9px]">{qImage.startsWith('data:') ? 'Base64 Tersemat' : qImage}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Nama File Audio Pendukung (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: listening_comprehension.mp3"
                    value={qAudio}
                    onChange={(e) => setQAudio(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400">Digunakan untuk ujian mendengarkan (listening section).</p>
                </div>
              </div>

              {qType === 'pilihan_ganda' ? (
                <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Pilihan Jawaban (A - E)</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const currentLines = options.map(o => `${o.key}. ${o.text}`).filter(l => l.length > 3).join('\n');
                        setSingleFormMassText(currentLines);
                        setSingleFormCorrectKey(qCorrect as any);
                        setSingleFormMassModal(true);
                      }}
                      className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#3381b5] border border-sky-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                      <span>Tempel / Input Massal Opsi (A - E)</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {options.map((opt, idx) => (
                      <div key={opt.key} className="p-3 bg-white border border-slate-200/60 rounded-xl space-y-2.5 shadow-sm">
                        <div className="flex gap-2 items-center">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            qCorrect === opt.key 
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>{opt.key}</span>
                          <input
                            type="text"
                            required
                            placeholder={`Teks Jawaban Pilihan ${opt.key}`}
                            value={opt.text}
                            onChange={(e) => handleOptionChange(opt.key, e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs bg-white outline-none font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setQCorrect(opt.key)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                              qCorrect === opt.key
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200'
                            }`}
                          >
                            {qCorrect === opt.key ? '✓ Kunci Benar' : 'Jadikan Kunci'}
                          </button>
                        </div>

                        {/* Image settings for this option */}
                        <div className="pl-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1 border-t border-slate-50">
                          {/* File Manager Option picker */}
                          {files.filter(f => f.type === 'image').length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Pilih File:</span>
                              <select
                                value={opt.image || ''}
                                onChange={(e) => handleOptionChange(opt.key, opt.text, e.target.value)}
                                className="px-2 py-0.5 border border-slate-200 rounded-lg text-[10px] bg-white text-slate-500 outline-none"
                              >
                                <option value="">-- Pilih --</option>
                                {files.filter(f => f.type === 'image').map(f => (
                                  <option key={f.id} value={f.url}>{f.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            {/* Upload local button */}
                            <label className="px-2 py-1 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200 rounded-lg cursor-pointer text-[10px] font-bold transition-all flex items-center gap-1">
                              <Upload className="h-3 w-3 text-emerald-600" />
                              <span>{opt.image ? 'Ganti Gambar' : 'Unggah Gambar'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleImageUpload(e.target.files[0], (b64) => {
                                      handleOptionChange(opt.key, opt.text, b64);
                                    });
                                  }
                                }}
                              />
                            </label>

                            {opt.image && (
                              <button
                                type="button"
                                onClick={() => handleOptionChange(opt.key, opt.text, '')}
                                className="p-1 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg transition-all"
                                title="Hapus Gambar Pilihan"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {/* Image preview thumbnail */}
                          {opt.image && (
                            <div className="flex items-center gap-2 animate-fade-in sm:ml-auto">
                              <img
                                src={opt.image}
                                alt={`Pratinjau Pilihan ${opt.key}`}
                                className="h-10 w-auto rounded border border-slate-200 object-contain bg-slate-50 p-0.5"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=100';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tentukan Kunci Jawaban Benar:</span>
                    <div className="flex items-center gap-1.5">
                      {['A', 'B', 'C', 'D', 'E'].map(k => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setQCorrect(k)}
                          className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            qCorrect === k
                              ? 'bg-emerald-600 text-white shadow-md scale-105'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="text-xs font-semibold text-slate-600">Panduan Kunci / Kriteria Jawaban Essay Benar</label>
                  <textarea
                    rows={2}
                    placeholder="Masukkan keyword atau kalimat pemandu penilaian untuk memudahkan evaluasi manual..."
                    value={qEssayGuidance}
                    onChange={(e) => setQEssayGuidance(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                  ></textarea>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus className="h-4 w-4" /> Simpan Pertanyaan
                </button>
              </div>
            </form>
          </div>
        </div>
      );

    case 'import_soal_word':
      return (
        <div className="space-y-6 animate-fade-in">
          {/* Main Title Section from screenshot */}
          <div className="border-b border-slate-100 pb-4 mb-4">
            <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2 font-sans tracking-tight">
              Mengimport Soal dari Word
              <span className="text-xs font-normal text-slate-400 font-sans ml-2">
                Melakukan Import Soal pilihan ganda berdasarkan modul dan topik
              </span>
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Pilih Topik Card (as seen in screenshot) */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider font-sans">
                  Pilih Topik
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Pilih Topik</label>
                  <select
                    value={qTopic}
                    onChange={(e) => setQTopic(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:border-[#3381b5] focus:ring-1 focus:ring-[#3381b5] outline-none"
                  >
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>
                
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 font-medium leading-relaxed">
                  Pilih terlebih dahulu Topik yang akan digunakan sebelum melakukan import soal.
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Import Soal dari Word Card */}
            <div className="lg:col-span-9 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider font-sans">
                    Import Soal dari Word (EXAMPRO V1)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Maksimal 50 soal per import • Mendukung teks, paragraf, gambar soal/pilihan, &amp; tabel sederhana
                  </p>
                </div>
                
                {/* Download Template Word with 10 / 20 / 30 / 40 / 50 Question Count Selector */}
                <div className="flex flex-wrap items-center gap-2 bg-sky-50/80 p-1.5 rounded-xl border border-sky-200/80">
                  <span className="text-[11px] font-bold text-slate-600 pl-2">Template:</span>
                  <select
                    value={templateQuestionCount}
                    onChange={(e) => setTemplateQuestionCount(Number(e.target.value) as 10 | 20 | 30 | 40 | 50)}
                    className="px-2.5 py-1.5 text-xs font-bold bg-white border border-sky-200 rounded-lg text-slate-700 outline-none focus:border-[#3381b5]"
                    aria-label="Pilih jumlah soal template Word"
                  >
                    <option value={10}>10 Soal</option>
                    <option value={20}>20 Soal</option>
                    <option value={30}>30 Soal</option>
                    <option value={40}>40 Soal</option>
                    <option value={50}>50 Soal (Maks)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDownloadWordTemplate(templateQuestionCount)}
                    className="text-xs font-extrabold text-white bg-[#3381b5] hover:bg-[#286a97] font-sans cursor-pointer flex items-center gap-1.5 transition-all px-3.5 py-1.5 rounded-lg shadow-xs"
                    title="Unduh Form Template Word Soal Pilihan Ganda (.docx)"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Template ({templateQuestionCount} Soal .docx)</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                
                {/* Drag & Drop File Upload Area */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-700 block uppercase tracking-wide">
                    Unggah File Word (.docx)
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-6 transition-all text-center relative ${
                      isWordDragActive 
                        ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                        : 'border-slate-200 bg-white hover:border-[#3381b5] hover:bg-slate-50/40'
                    }`}
                    onDragEnter={handleWordDrag}
                    onDragOver={handleWordDrag}
                    onDragLeave={handleWordDrag}
                    onDrop={handleWordDrop}
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-2.5 bg-sky-50 text-sky-600 rounded-full">
                        <FileText className={`h-6 w-6 text-[#3381b5] ${isReadingWordFile ? 'animate-spin' : 'animate-pulse'}`} />
                      </div>
                      <div className="text-sm">
                        <span className="font-bold text-[#3381b5] cursor-pointer hover:underline">
                          {isReadingWordFile ? 'Sedang memproses dokumen Word...' : 'Klik untuk Unggah File Word'}
                        </span>{' '}
                        {!isReadingWordFile && 'atau seret & lepas file Word (.docx) di sini'}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Sistem otomatis menyusun ulang nomor soal (1, 2, 3...), mengekstrak gambar, &amp; memvalidasi 5 pilihan (A–E) + 1 kunci benar.
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".docx,.doc"
                      onChange={handleWordFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  {wordFileName && !wordUploadError && wordRows.length > 0 && (
                    <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 font-semibold flex flex-wrap items-center justify-between gap-2">
                      <span>
                        File terunggah: <strong>{wordFileName}</strong> — Berhasil membaca{' '}
                        <strong>{wordRows.filter(r => r.jenis === 'SOAL').length} blok soal</strong> (penomoran disusun ulang 1–{wordRows.filter(r => r.jenis === 'SOAL').length}).
                      </span>
                      <button
                        type="button"
                        onClick={handleClearRows}
                        className="text-red-600 hover:text-red-800 hover:underline font-bold cursor-pointer"
                      >
                        Batalkan File
                      </button>
                    </div>
                  )}
                  {wordUploadError && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{wordUploadError}</span>
                    </div>
                  )}
                </div>

                {/* Live Validation Summary & Error List */}
                {(() => {
                  const targetTopicId = qTopic || topics[0]?.id || 'T01';
                  const validation = buildValidatedWordQuestions(wordRows, targetTopicId, wordStructuralErrors);
                  const totalDetected = validation.previewItems.length;
                  const validCount = validation.previewItems.filter(p => p.isValid).length;
                  const invalidCount = totalDetected - validCount;
                  const canSave = totalDetected > 0 && validation.errors.length === 0 && !validation.exceedsLimit;

                  return (
                    <>
                      {(totalDetected > 0 || wordStructuralErrors.length > 0) && (
                        <div className={`p-4 rounded-xl border space-y-3 ${
                          canSave
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : 'bg-red-50/70 border-red-200'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {canSave ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                              )}
                              <div>
                                <h4 className={`text-xs font-extrabold uppercase tracking-wide ${
                                  canSave ? 'text-emerald-900' : 'text-red-900'
                                }`}>
                                  {canSave
                                    ? `Validasi Lolos: ${validCount} Soal Siap Disimpan ke Bank Soal`
                                    : `Ditemukan ${validation.errors.length} Kesalahan Validasi — Perbaiki Sebelum Menyimpan`}
                                </h4>
                                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                                  Total Terbaca: <strong>{totalDetected} Soal</strong> (Maks 50) &bull;{' '}
                                  Valid: <strong className="text-emerald-700">{validCount}</strong> &bull;{' '}
                                  Bermasalah: <strong className={invalidCount > 0 ? 'text-red-700' : 'text-slate-700'}>{invalidCount}</strong>
                                </p>
                              </div>
                            </div>
                          </div>

                          {validation.errors.length > 0 && (
                            <div className="bg-white/90 border border-red-200 rounded-lg p-3 max-h-44 overflow-y-auto space-y-1">
                              {validation.errors.map((errMsg, errIdx) => (
                                <div key={errIdx} className="text-xs text-red-700 font-semibold flex items-start gap-1.5">
                                  <span className="text-red-500 font-black">&bull;</span>
                                  <span>{errMsg}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tri-Mode Switcher Tabs: Pratinjau Lengkap / Tabel Interaktif / Copy-Paste Teks */}
                      <div className="flex border-b border-slate-200 bg-slate-50/50 rounded-lg p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => setWordInputMode('preview')}
                          className={`flex-1 py-2 text-xs font-bold rounded-md text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            wordInputMode === 'preview'
                              ? 'bg-white text-[#3381b5] shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Pratinjau Soal ({totalDetected})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (wordText.trim() && wordRows.length === 0) {
                              setWordRows(parseWordTextToRows(wordText));
                            }
                            setWordInputMode('grid');
                          }}
                          className={`flex-1 py-2 text-xs font-bold rounded-md text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            wordInputMode === 'grid'
                              ? 'bg-white text-[#3381b5] shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Grid className="h-3.5 w-3.5" />
                          <span>Editor Tabel (No | Jenis | Isi | Jawaban)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!wordText.trim() && wordRows.length > 0) {
                              setWordText(serializeRowsToText(wordRows));
                            }
                            setWordInputMode('text');
                          }}
                          className={`flex-1 py-2 text-xs font-bold rounded-md text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            wordInputMode === 'text'
                              ? 'bg-white text-[#3381b5] shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Copy-Paste Teks Manual</span>
                        </button>
                      </div>

                      {/* Editor / Preview Content Section */}
                      <div className="space-y-2">
                        {wordInputMode === 'preview' ? (
                          <div className="space-y-3">
                            {validation.previewItems.length === 0 ? (
                              <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center bg-slate-50/50 space-y-3">
                                <Eye className="h-8 w-8 text-slate-300 mx-auto" />
                                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                                  Belum ada soal di pratinjau. Silakan unggah file Word (.docx) di atas, atau klik tombol di bawah untuk mengisi contoh/manual.
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handlePrefillWordRows();
                                    }}
                                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" /> Muat Contoh (2 Soal)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleAddCompleteQuestionPack();
                                      setWordInputMode('grid');
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Plus className="h-3.5 w-3.5" /> Buat Soal di Tabel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                                {validation.previewItems.map((item) => (
                                  <div
                                    key={`${item.number}-${item.soalRowIndex}`}
                                    className={`rounded-xl border p-4 transition-all ${
                                      item.isValid
                                        ? 'bg-white border-slate-200 shadow-xs'
                                        : 'bg-red-50/40 border-red-300 shadow-xs'
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 bg-[#3381b5] text-white text-xs font-black rounded-lg">
                                          Soal No. {item.number}
                                        </span>
                                        {item.originalNo && item.originalNo !== String(item.number) && (
                                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                            Nomor asli di Word: {item.originalNo}
                                          </span>
                                        )}
                                        {item.isValid ? (
                                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Check className="h-3 w-3" /> Valid &bull; Kunci: {item.correctAnswer}
                                          </span>
                                        ) : (
                                          <span className="text-[11px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" /> Belum Lengkap
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setWordInputMode('grid')}
                                          className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-[#3381b5] bg-slate-100 hover:bg-sky-50 rounded-lg transition-all cursor-pointer"
                                        >
                                          Edit di Tabel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteWordBlock(item.soalRowIndex)}
                                          className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                          title="Hapus blok soal ini dari daftar import"
                                        >
                                          <Trash2 className="h-3 w-3" /> Hapus Blok
                                        </button>
                                      </div>
                                    </div>

                                    {!item.isValid && (
                                      <div className="mb-3 p-2.5 bg-red-100/70 border border-red-200 rounded-lg space-y-1">
                                        {item.errors.map((errMsg, eIdx) => (
                                          <p key={eIdx} className="text-xs font-bold text-red-800">
                                            • {errMsg}
                                          </p>
                                        ))}
                                      </div>
                                    )}

                                    <div className="space-y-3">
                                      <p className="text-sm font-semibold text-slate-800 whitespace-pre-line leading-relaxed">
                                        {item.text}
                                      </p>

                                      {item.image && (
                                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg w-max max-w-full">
                                          <img
                                            src={item.image}
                                            alt={`Gambar Soal ${item.number}`}
                                            className="max-h-52 max-w-full rounded object-contain bg-white"
                                          />
                                        </div>
                                      )}

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {item.options.map((opt) => (
                                          <div
                                            key={opt.key}
                                            className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                                              opt.isCorrect
                                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                                : 'bg-slate-50/70 border-slate-200 text-slate-700'
                                            }`}
                                          >
                                            <div className="space-y-1.5 flex-1">
                                              <div className="flex items-start gap-1.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[11px] font-black shrink-0 ${
                                                  opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                                }`}>
                                                  {opt.key}
                                                </span>
                                                <span className="whitespace-pre-line">{opt.text}</span>
                                              </div>
                                              {opt.image && (
                                                <img
                                                  src={opt.image}
                                                  alt={`Gambar Pilihan ${opt.key}`}
                                                  className="max-h-24 w-auto rounded border border-slate-200 bg-white object-contain"
                                                />
                                              )}
                                            </div>
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                                              opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                              {opt.rawJawaban}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : wordInputMode === 'grid' ? (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-xs">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
                                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                                  Input Cepat:
                                </span>
                                <button
                                  type="button"
                                  onClick={handleAddCompleteQuestionPack}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                  title="Tambah 1 Soal Baru beserta 5 Opsi A s/d E sekaligus"
                                >
                                  <Layers className="h-3.5 w-3.5" /> + 1 Paket Lengkap (Soal + Opsi A-E)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMassOptionModal({
                                    isOpen: true,
                                    targetSoalIndex: null,
                                    soalText: '',
                                    soalNumber: '',
                                    rawText: '',
                                    options: { A: '', B: '', C: '', D: '', E: '' },
                                    correctKey: 'A',
                                    activeTab: 'paste'
                                  })}
                                  className="px-3 py-1.5 bg-[#3381b5] hover:bg-[#286a97] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                  title="Buka dialog input massal teks untuk 5 pilihan jawaban A-E"
                                >
                                  <ClipboardList className="h-3.5 w-3.5 text-amber-300" /> ⚡ Input Massal Opsi A-E
                                </button>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-1 bg-sky-100 text-sky-800 text-xs font-bold rounded-lg border border-sky-200 shadow-xs flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5 text-[#3381b5]" />
                                  <span>Terdeteksi: <strong>{totalDetected} Soal</strong> ({wordRows.length} baris)</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddRow('SOAL')}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded flex items-center gap-1 border border-indigo-200 transition-all cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" /> + Baris SOAL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddRow('JAWABAN')}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded flex items-center gap-1 border border-emerald-200 transition-all cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" /> + Baris JAWABAN
                                </button>
                                <button
                                  type="button"
                                  onClick={handlePrefillWordRows}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded flex items-center gap-1 border border-amber-200 transition-all cursor-pointer"
                                  title="Muat Soal Contoh Ke Form"
                                >
                                  <Sparkles className="h-3 w-3" /> Contoh
                                </button>
                                <button
                                  type="button"
                                  onClick={handleClearRows}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded flex items-center gap-1 border border-red-200 transition-all cursor-pointer"
                                  title="Hapus Semua Baris"
                                >
                                  <Trash2 className="h-3 w-3" /> Kosongkan
                                </button>
                              </div>
                            </div>

                            <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-sm bg-white max-h-[540px] overflow-y-auto">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead className="sticky top-0 z-10">
                                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-extrabold uppercase tracking-wide">
                                    <th className="py-2.5 px-3 w-14 text-center border-r border-slate-300">No</th>
                                    <th className="py-2.5 px-3 w-32 border-r border-slate-300">Jenis &amp; Pilihan</th>
                                    <th className="py-2.5 px-3 border-r border-slate-300">Isi (Pertanyaan / Pilihan Jawaban / Gambar)</th>
                                    <th className="py-2.5 px-3 w-40 text-center border-r border-slate-300">Jawaban (1 / 0)</th>
                                    <th className="py-2.5 px-3 w-14 text-center">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-250">
                                  {wordRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-medium">
                                        Belum ada baris tabel. Unggah file .docx, klik <strong className="text-emerald-700 font-bold">+ 1 Paket Lengkap</strong>, atau klik <strong className="text-amber-700 font-bold">Contoh</strong> untuk memulai.
                                      </td>
                                    </tr>
                                  ) : (
                                    wordRows.map((row, idx) => {
                                      const isSoal = row.jenis === 'SOAL';
                                      
                                      let parentSoalIdx = -1;
                                      let optionIndex = 0;
                                      let siblingOptionCount = 0;

                                      if (isSoal) {
                                        for (let j = idx + 1; j < wordRows.length; j++) {
                                          if (wordRows[j].jenis === 'SOAL') break;
                                          siblingOptionCount++;
                                        }
                                      } else {
                                        for (let j = idx - 1; j >= 0; j--) {
                                          if (wordRows[j].jenis === 'SOAL') {
                                            parentSoalIdx = j;
                                            break;
                                          }
                                        }
                                        if (parentSoalIdx !== -1) {
                                          for (let j = parentSoalIdx + 1; j < idx; j++) {
                                            if (wordRows[j].jenis === 'JAWABAN') optionIndex++;
                                          }
                                        }
                                      }

                                      const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                                      const optionLetter = optionKeys[optionIndex] || `Opsi ${optionIndex + 1}`;

                                      return (
                                        <tr key={idx} className={`transition-colors group ${
                                          isSoal ? 'bg-indigo-50/30 font-semibold' : 'hover:bg-slate-50/60'
                                        }`}>
                                          <td className="p-2 border-r border-slate-300 align-middle">
                                            <input
                                              type="text"
                                              value={row.no}
                                              onChange={(e) => handleUpdateRow(idx, 'no', e.target.value)}
                                              placeholder="-"
                                              className="w-full text-center bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-[#3381b5] rounded py-1 px-0.5 outline-none font-bold text-slate-800"
                                            />
                                          </td>

                                          <td className="p-2 border-r border-slate-300 align-middle">
                                            {isSoal ? (
                                              <div className="flex items-center gap-1.5">
                                                <span className="px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-black rounded shadow-xs tracking-wide">
                                                  SOAL
                                                </span>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1.5">
                                                <span className={`w-7 h-7 rounded flex items-center justify-center font-black text-xs shrink-0 ${
                                                  row.jawaban === '1'
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                                }`}>
                                                  {optionLetter}
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-600">
                                                  Pilihan {optionLetter}
                                                </span>
                                              </div>
                                            )}
                                          </td>

                                          <td className="p-2 border-r border-slate-300 align-middle space-y-1.5">
                                            <textarea
                                              value={row.isi}
                                              rows={isSoal ? 2 : 1}
                                              onChange={(e) => handleUpdateRow(idx, 'isi', e.target.value)}
                                              placeholder={isSoal ? "Tulis teks pertanyaan di sini..." : `Tulis teks pilihan jawaban ${optionLetter}...`}
                                              className={`w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-[#3381b5] focus:bg-white focus:ring-1 focus:ring-[#3381b5] rounded py-1 px-2 outline-none text-slate-800 resize-y transition-all ${
                                                isSoal ? 'font-bold text-slate-900 bg-white/70' : 'font-medium text-slate-700'
                                              }`}
                                            />
                                            {row.image && (
                                              <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg w-max">
                                                <img src={row.image} alt="Lampiran Word" className="h-14 w-auto rounded object-contain bg-white" />
                                                <span className="text-[10px] font-bold text-emerald-700">Gambar tersemat</span>
                                              </div>
                                            )}
                                            {isSoal && (
                                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenMassModalForSoal(idx)}
                                                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-[#3381b5] hover:text-[#215a80] border border-sky-200 rounded text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                                  title="Buka editor cepat untuk mengisi atau menempel opsi A s/d E soal ini"
                                                >
                                                  <Zap className="h-3 w-3 text-amber-500 fill-amber-400" />
                                                  <span>⚡ Input / Tempel Massal 5 Opsi (A - E)</span>
                                                </button>
                                                <span className={`text-[10px] font-semibold ${siblingOptionCount === 5 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                  ({siblingOptionCount}/5 opsi terpasang)
                                                </span>
                                              </div>
                                            )}
                                          </td>

                                          <td className={`p-2 border-r border-slate-300 align-middle text-center ${
                                            isSoal ? 'bg-[#FFFF00]/60' : ''
                                          }`}>
                                            {isSoal ? (
                                              <span className="text-[10px] bg-amber-300 text-amber-950 font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                                SOAL UTAMA
                                              </span>
                                            ) : (
                                              <div className="flex items-center justify-center gap-1.5">
                                                {row.jawaban === '1' ? (
                                                  <button
                                                    type="button"
                                                    className="w-full px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg font-black text-[11px] flex items-center justify-center gap-1 shadow-xs cursor-default"
                                                  >
                                                    <Check className="h-3.5 w-3.5" /> 1 (Benar)
                                                  </button>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleSetRowAsCorrectKey(idx)}
                                                    className="w-full px-2 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                                                    title="Jadikan pilihan ini sebagai kunci jawaban yang benar (nilai 1)"
                                                  >
                                                    <span>0</span>
                                                    <span className="text-[9px] text-emerald-600 font-extrabold underline ml-0.5">Jadikan 1</span>
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </td>

                                          <td className="p-2 align-middle text-center">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteRow(idx)}
                                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                              title="Hapus baris"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="border border-slate-200 rounded-t-xl bg-slate-50 p-2 flex flex-wrap items-center gap-1 shadow-inner select-none text-slate-600 border-b-0">
                              <button type="button" className="p-1 hover:bg-white rounded transition-colors" title="Table"><Grid className="h-4 w-4" /></button>
                              <button type="button" className="p-1 hover:bg-white rounded transition-colors" title="Omega"><HelpCircle className="h-4 w-4" /></button>
                              <button type="button" className="p-1 hover:bg-white rounded transition-colors" title="Insert Image"><Image className="h-4 w-4" /></button>
                              <button type="button" className="p-1 hover:bg-white rounded transition-colors" title="Muat Contoh" onClick={handlePrefillWordTemplate}><Sparkles className="h-4 w-4 text-amber-500" /> <span className="text-[10px] text-amber-600 font-bold font-sans">Prefill Contoh</span></button>
                            </div>

                            <div className="relative">
                              <textarea
                                rows={12}
                                placeholder={"Tempel langsung naskah soal dari Microsoft Word atau tabel Word di sini...\nContoh format naskah:\n1. Ibu kota negara Indonesia adalah...\nA. Bandung\nB. Jakarta\nC. Surabaya\nD. Medan\nE. Semarang\nKunci: B"}
                                value={wordText}
                                onChange={(e) => handleWordTextChange(e.target.value)}
                                className="w-full p-4 font-mono text-xs border border-slate-200 rounded-b-xl focus:ring-1 focus:ring-[#3381b5] focus:border-[#3381b5] outline-none bg-slate-50/50"
                              ></textarea>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Instructions */}
                      <div className="text-xs text-slate-500 space-y-1 font-medium border-l-2 border-[#3381b5] pl-4 py-1">
                        <p>• Klik <strong>Download Template</strong> di kanan atas untuk memilih template <strong>10, 20, 30, 40, atau 50 soal</strong> (.docx) dengan kolom <strong>No, Jenis, Isi, Jawaban</strong>.</p>
                        <p>• Setiap blok soal berisi 1 baris <strong>SOAL</strong> (sel kuning dikosongkan) dan 5 baris <strong>JAWABAN</strong> (isi <strong>1</strong> untuk benar, <strong>0</strong> untuk salah). Hapus seluruh blok soal di Word jika tidak diperlukan; nomor akan tersusun ulang <strong>1, 2, 3...</strong> saat diimport.</p>
                        <p>• Periksa hasil validasi dan pratinjau seluruh soal di atas sebelum menekan tombol <strong>Simpan ke Bank Soal</strong>.</p>
                      </div>

                      {/* Import Status Alert banner */}
                      {importStatus === 'success' && (
                        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-200 animate-fade-in">
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span>Selamat! {importSuccessCount > 0 ? `${importSuccessCount} soal` : 'Seluruh soal'} berhasil divalidasi dan disimpan ke database bank soal EXAMPRO.</span>
                        </div>
                      )}
                      {importStatus === 'error' && (
                        <div className="p-3.5 bg-red-50 text-red-800 rounded-xl text-xs font-bold border border-red-200 animate-fade-in">
                          <span>Penyimpanan dibatalkan karena masih terdapat kesalahan validasi atau belum ada soal yang valid.</span>
                        </div>
                      )}

                      {/* Submit / Cancel Action Block */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="text-xs font-semibold text-slate-500">
                          {totalDetected > 0 ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                              canSave
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              <List className="h-3.5 w-3.5" />
                              Siap Simpan: <strong>{validCount} / {totalDetected} Soal</strong> (Maks 50)
                            </span>
                          ) : (
                            <span className="text-slate-400">Unggah file .docx untuk melihat pratinjau &amp; validasi soal</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {totalDetected > 0 && (
                            <button
                              type="button"
                              onClick={handleClearRows}
                              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg transition-all cursor-pointer"
                            >
                              Batalkan Import
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleWordImport}
                            disabled={!canSave}
                            className="px-6 py-2.5 bg-[#3381b5] hover:bg-[#286a97] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm rounded-lg transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                          >
                            <Upload className="h-4 w-4" />
                            <span>Simpan ke Bank Soal ({validCount} Soal)</span>
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}

              </div>
            </div>

          </div>
        </div>
      );

    case 'import_soal_spreadsheet':
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                Import Soal dari Excel / Spreadsheet
              </h2>
              <p className="text-sm text-slate-500">
                Salin baris tabel langsung dari Excel/Spreadsheet Anda lalu tempelkan di bawah ini. Format ini mendukung baris ganda yang rapi untuk Soal dan Pilihan Jawaban.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrefillSpreadsheetTemplate}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                title="Masukkan teks contoh langsung ke form pratinjau di bawah"
              >
                Masukkan Contoh Format
              </button>
              <button
                onClick={handleDownloadExcelTemplate}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                title="Unduh file Excel (.xlsx) dengan format yang sesuai"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Unduh Template Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Pilih Topik Penampung</label>
                <select
                  value={qTopic}
                  onChange={(e) => setQTopic(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>

              {/* Drag & Drop File Upload Area */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Unggah File Excel (.xlsx / .xls)</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 transition-all text-center relative ${
                    isDragActive 
                      ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/40'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-full">
                      <FileSpreadsheet className="h-6 w-6 animate-pulse" />
                    </div>
                    <div className="text-sm">
                      <span className="font-bold text-indigo-600 cursor-pointer hover:underline">
                        Klik untuk Unggah
                      </span>{' '}
                      atau seret & lepas file Excel di sini
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">Sistem akan otomatis mengurai baris Soal & Pilihan Jawaban dari tabel Anda.</p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Pratinjau / Tempel Data Manual dari Excel / Spreadsheet (CSV atau Tab-Separated)</label>
                <textarea
                  rows={10}
                  placeholder="Salin baris Excel Anda langsung dan paste di sini.&#10;Contoh format:&#10;No	Jenis	Kode	Isi	Status Jawaban	Tingkat kesulitan Soal&#10;1	SOAL	Q	Berapa hasil 5x6?		1&#10;	JAWABAN	A	30	1	"
                  value={spreadsheetText}
                  onChange={(e) => setSpreadsheetText(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                ></textarea>
              </div>

              {importStatus === 'success' && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4" /> Selamat! {importSuccessCount > 0 ? `${importSuccessCount} soal` : 'Data'} dari Excel/Spreadsheet berhasil diimport!
                </div>
              )}
              {importStatus === 'error' && (
                <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs font-semibold">
                  Gagal mengimpor. Pastikan file atau format teks berisi soal dan pilihan jawaban yang valid.
                </div>
              )}

              {(() => {
                const detectedCount = spreadsheetText.trim() ? parseUniversalQuestions(spreadsheetText, 'TEMP').length : 0;
                return (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs font-semibold text-slate-500">
                      {spreadsheetText.trim() ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                          <List className="h-3.5 w-3.5" />
                          Terdeteksi: <strong>{detectedCount} Soal</strong> siap diimpor
                        </span>
                      ) : (
                        <span className="text-slate-400">Tempel data atau unggah file Excel di atas</span>
                      )}
                    </div>
                    <button
                      onClick={handleSpreadsheetImport}
                      disabled={!spreadsheetText.trim() || detectedCount === 0}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                    >
                      <Upload className="h-4 w-4" /> Eksekusi Import ({detectedCount} Soal)
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3 shadow-inner">
              <h4 className="font-bold text-sm text-slate-800 border-b pb-1.5 border-slate-200 flex items-center justify-between">
                <span>Struktur Format Excel (Sesuai Gambar):</span>
              </h4>
              
              {/* Highlighted Excel Download Card */}
              <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500 text-white rounded-lg">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-emerald-800 block">Template Excel Resmi</span>
                    <span className="text-[10px] text-emerald-600 block">Sesuai Format Pilihan Ganda</span>
                  </div>
                </div>
                <button
                  onClick={handleDownloadExcelTemplate}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm shrink-0"
                >
                  <Upload className="h-3 w-3 rotate-180" /> Unduh
                </button>
              </div>

              <p className="text-[11px] text-slate-500 font-medium">Buat tabel di Excel dengan susunan kolom berikut (atau gunakan file template yang Anda unduh di atas):</p>
              <ul className="text-xs text-slate-600 space-y-2.5 list-disc pl-4 font-medium">
                <li>
                  <span className="font-bold text-indigo-700">Kolom 1 (No):</span> Nomor urut soal (contoh: <code className="bg-slate-200 px-1 rounded text-[11px]">1</code>) pada baris SOAL.
                </li>
                <li>
                  <span className="font-bold text-indigo-700">Kolom 2 (Jenis):</span> <code className="bg-slate-200 px-1 rounded text-[11px]">SOAL</code> untuk baris pertanyaan, dan <code className="bg-slate-200 px-1 rounded text-[11px]">JAWABAN</code> untuk baris opsi.
                </li>
                <li>
                  <span className="font-bold text-indigo-700">Kolom 3 (Kode):</span> <code className="bg-slate-200 px-1 rounded text-[11px]">Q</code> untuk SOAL, dan <code className="bg-slate-200 px-1 rounded text-[11px]">A</code> untuk JAWABAN.
                </li>
                <li>
                  <span className="font-bold text-indigo-700">Kolom 4 (Isi):</span> Teks pertanyaan atau teks pilihan jawaban.
                </li>
                <li>
                  <span className="font-bold text-indigo-700">Kolom 5 (Status Jawaban):</span> Isi dengan angka <code className="bg-emerald-200 text-emerald-800 px-1 rounded text-[11px] font-bold">1</code> untuk pilihan jawaban yang benar, dan <code className="bg-slate-200 px-1 rounded text-[11px]">0</code> untuk pilihan yang salah. (Kosongkan pada baris SOAL).
                </li>
                <li>
                  <span className="font-bold text-indigo-700">Kolom 6 (Kesulitan):</span> Bobot nilai / kesulitan soal (contoh: <code className="bg-slate-200 px-1 rounded text-[11px]">1</code>, <code className="bg-slate-200 px-1 rounded text-[11px]">2</code>) pada baris SOAL.
                </li>
              </ul>
              <div className="p-2.5 bg-indigo-50 border border-indigo-100/60 rounded-lg text-[10px] text-indigo-800">
                💡 <strong>Tips Cepat:</strong> Cukup blok area tabel Anda di Excel, tekan <strong>Ctrl+C</strong>, lalu tekan <strong>Ctrl+V</strong> di kotak input sebelah kiri! Sistem akan mendeteksi pembatas secara otomatis.
              </div>
            </div>
          </div>
        </div>
      );

    case 'daftar_soal':
      const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTopic = selectedFilterTopic === 'ALL' || q.topicId === selectedFilterTopic;
        return matchesSearch && matchesTopic;
      });

      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          {editSuccessNotice && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between animate-fade-in text-sm shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">Soal dan pilihan jawaban berhasil diperbarui & tersimpan ke bank soal!</span>
              </div>
              <button 
                onClick={() => setEditSuccessNotice(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-emerald-100 rounded-md transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <List className="h-5 w-5 text-indigo-600" />
                Daftar & Bank Soal Ujian
              </h2>
              <p className="text-sm text-slate-500">
                Pencarian, pemfilteran, pengeditan soal/jawaban, dan penghapusan database bank soal ujian dari seluruh materi topik.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari teks soal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-indigo-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-xs text-slate-500 font-bold uppercase whitespace-nowrap">Filter Topik:</span>
              <select
                value={selectedFilterTopic}
                onChange={(e) => setSelectedFilterTopic(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="ALL">Semua Topik</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 flex items-center justify-between">
              <span className="text-xs text-indigo-700 font-semibold">Total Soal Terfilter:</span>
              <span className="font-bold text-sm text-indigo-800">{filteredQuestions.length} Soal</span>
            </div>
          </div>

          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-25">
                <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Tidak ada pertanyaan yang sesuai dengan filter pencarian.</p>
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const topName = topics.find(t => t.id === q.topicId)?.name || 'Topik Terhapus';
                return (
                  <div key={q.id} className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 hover:bg-white transition-all shadow-sm">
                    <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                          {topName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">ID: {q.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">
                          Bobot: <strong className="text-slate-800">{q.points} Poin</strong>
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                          {q.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Essay'}
                        </span>
                        <button
                          onClick={() => handleStartEdit(q)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 rounded-lg transition-all ml-1 cursor-pointer border border-indigo-200/60"
                          title="Edit Soal & Pilihan Jawaban"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => onDeleteQuestion(q.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-1 cursor-pointer"
                          title="Hapus Pertanyaan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium text-slate-800 text-sm whitespace-pre-line">{idx + 1}. {q.text}</p>
                      
                      {q.image && (
                        <div className="p-1.5 border border-slate-200 rounded-lg bg-white w-max max-w-full">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">
                            {q.image.startsWith('data:') ? 'LAMPIRAN GAMBAR (TERSEMAT)' : `LAMPIRAN GAMBAR: ${q.image}`}
                          </span>
                          <img 
                            src={q.image.startsWith('http') || q.image.startsWith('data:') ? q.image : 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=300'} 
                            alt="Lampiran" 
                            className="max-h-48 max-w-xs rounded object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {q.audio && (
                        <div className="p-2 border border-slate-150 rounded-lg bg-indigo-25/50 w-full max-w-sm flex items-center gap-2">
                          <span className="text-[10px] text-indigo-700 font-bold">MP3 AUDIO: {q.audio}</span>
                        </div>
                      )}

                      {q.type === 'pilihan_ganda' && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                          {q.options.map(opt => (
                            <div 
                              key={opt.key} 
                              className={`p-2 rounded-lg text-xs border flex items-center justify-between gap-2 ${
                                q.correctAnswer === opt.key 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold' 
                                  : 'bg-white text-slate-600 border-slate-100'
                              }`}
                            >
                              <div>
                                <span className="font-bold mr-1.5">{opt.key}.</span> {opt.text}
                              </div>
                              {opt.image && (
                                <img
                                  src={opt.image}
                                  alt={`Pilihan ${opt.key}`}
                                  className="h-8 w-auto rounded border border-slate-200 object-contain bg-slate-50"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-xs pt-2 border-t border-slate-100/50 flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Kunci/Panduan Jawaban:</span>
                        <span className="font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded">
                          {q.correctAnswer}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );

      default:
        return null;
    }
  };

  // Render modal components
  return (
    <>
      {renderSubMenuContent()}

      {/* Modal 1: Input Massal Pilihan Jawaban A s.d E (Untuk Tabel Word Form) */}
      {massOptionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-scale-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg">
                    <Zap className="h-5 w-5 fill-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white">
                      Input Massal Pilihan Jawaban (A s.d E)
                    </h3>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      {massOptionModal.targetSoalIndex !== null ? (
                        <>
                          Mengisi 5 pilihan untuk <span className="font-bold text-amber-300">Soal No. {massOptionModal.soalNumber || (massOptionModal.targetSoalIndex + 1)}</span>
                          {massOptionModal.soalText && <span className="italic text-slate-300"> — "{massOptionModal.soalText.slice(0, 45)}..."</span>}
                        </>
                      ) : (
                        <>Menambahkan 1 Soal Baru beserta 5 Opsi Jawaban (A - E)</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMassOptionModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setMassOptionModal(prev => ({ ...prev, activeTab: 'paste' }))}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  massOptionModal.activeTab === 'paste'
                    ? 'border-[#3381b5] text-[#3381b5]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                <span>Tempel Cepat 5 Baris Teks (Paste)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  // Synchronize parsed options when switching to inputs tab
                  const parsed = parseRawOptionLines(massOptionModal.rawText);
                  setMassOptionModal(prev => ({
                    ...prev,
                    activeTab: 'inputs',
                    options: {
                      A: parsed.A || prev.options.A,
                      B: parsed.B || prev.options.B,
                      C: parsed.C || prev.options.C,
                      D: parsed.D || prev.options.D,
                      E: parsed.E || prev.options.E
                    }
                  }));
                }}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  massOptionModal.activeTab === 'inputs'
                    ? 'border-[#3381b5] text-[#3381b5]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Grid className="h-4 w-4" />
                <span>Form Rapi 5 Kolom (A - E)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Optional Soal Text if creating new question */}
              {massOptionModal.targetSoalIndex === null && (
                <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block">Teks Pertanyaan / Soal Baru:</label>
                  <textarea
                    rows={2}
                    value={massOptionModal.soalText}
                    onChange={(e) => setMassOptionModal(prev => ({ ...prev, soalText: e.target.value }))}
                    placeholder="Tuliskan pertanyaan ujian di sini..."
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#3381b5] focus:ring-1 focus:ring-[#3381b5]"
                  />
                </div>
              )}

              {massOptionModal.activeTab === 'paste' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      Petunjuk Tempel Massal:
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      Salin 5 baris pilihan jawaban sekaligus dari Word / Dokumen / Chat. Format otomatis didukung:
                      <code className="mx-1 px-1 py-0.5 bg-white rounded border border-amber-300 font-mono font-bold">A. teks</code>, 
                      <code className="mx-1 px-1 py-0.5 bg-white rounded border border-amber-300 font-mono font-bold">a) teks</code>, atau 
                      <code className="mx-1 px-1 py-0.5 bg-white rounded border border-amber-300 font-mono font-bold">1 baris per pilihan</code>.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Tempel 5 Baris Jawaban di sini:</label>
                      <button
                        type="button"
                        onClick={() => {
                          const sample = "A. Pilihan jawaban A yang tepat\nB. Pilihan jawaban B pengecoh satu\nC. Pilihan jawaban C pengecoh dua\nD. Pilihan jawaban D pengecoh tiga\nE. Pilihan jawaban E pengecoh empat";
                          setMassOptionModal(prev => ({ ...prev, rawText: sample, correctKey: 'A' }));
                        }}
                        className="text-[11px] text-[#3381b5] hover:underline font-bold"
                      >
                        Tempel Format Contoh
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={massOptionModal.rawText}
                      onChange={(e) => setMassOptionModal(prev => ({ ...prev, rawText: e.target.value }))}
                      placeholder={`A. Jakarta\nB. Bandung\nC. Surabaya\nD. Medan\nE. Semarang`}
                      className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#3381b5] focus:border-[#3381b5] outline-none bg-slate-50/40"
                    />
                  </div>

                  {/* Live Parsed Preview */}
                  {massOptionModal.rawText.trim() && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        Hasil Deteksi 5 Pilihan:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                        {(['A', 'B', 'C', 'D', 'E'] as const).map(k => {
                          const parsed = parseRawOptionLines(massOptionModal.rawText);
                          const val = parsed[k];
                          return (
                            <div key={k} className={`p-1.5 rounded-lg border flex items-center gap-2 ${
                              massOptionModal.correctKey === k 
                                ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900' 
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}>
                              <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-black shrink-0 ${
                                massOptionModal.correctKey === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>{k}</span>
                              <span className="truncate text-xs">{val || <span className="text-slate-300 italic">(kosong)</span>}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(['A', 'B', 'C', 'D', 'E'] as const).map(k => (
                    <div key={k} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        massOptionModal.correctKey === k 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}>
                        {k}
                      </span>
                      <input
                        type="text"
                        placeholder={`Tulis pilihan jawaban ${k}...`}
                        value={massOptionModal.options[k]}
                        onChange={(e) => {
                          const updated = { ...massOptionModal.options, [k]: e.target.value };
                          setMassOptionModal(prev => ({ ...prev, options: updated }));
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 focus:border-[#3381b5] focus:ring-1 focus:ring-[#3381b5] rounded-lg text-xs outline-none font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setMassOptionModal(prev => ({ ...prev, correctKey: k }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          massOptionModal.correctKey === k
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200'
                        }`}
                      >
                        {massOptionModal.correctKey === k ? '✓ Kunci Benar' : 'Jadikan Kunci'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Answer Key Picker Bar */}
              <div className="p-3.5 bg-slate-100/80 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Kunci Jawaban Benar (Status = 1):
                </span>
                <div className="flex items-center gap-1.5">
                  {(['A', 'B', 'C', 'D', 'E'] as const).map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setMassOptionModal(prev => ({ ...prev, correctKey: k }))}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        massOptionModal.correctKey === k
                          ? 'bg-emerald-600 text-white shadow-md scale-105'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      }`}
                      title={`Jadikan ${k} sebagai kunci jawaban benar`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMassOptionModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyMassOptions}
                className="px-6 py-2 bg-[#3381b5] hover:bg-[#286a97] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Terapkan ke Tabel Soal (Simpan 5 Opsi)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Tempel Massal Pilihan Jawaban A s.d E (Untuk Form Buat Soal Satuan) */}
      {singleFormMassModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-scale-in">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg">
                  <Zap className="h-5 w-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">
                    Tempel Massal Pilihan Jawaban (A s.d E)
                  </h3>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Salin 5 baris pilihan jawaban dari Word/dokumen sekaligus
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSingleFormMassModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Format yang didukung:
                </p>
                <p className="text-[11px] text-amber-800">
                  Tempel 5 baris jawaban langsung (dengan format A. / B. / C. / D. / E. atau baris berurutan).
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tempel Teks di sini:</label>
                <textarea
                  rows={6}
                  value={singleFormMassText}
                  onChange={(e) => setSingleFormMassText(e.target.value)}
                  placeholder={`A. Pilihan jawaban A\nB. Pilihan jawaban B\nC. Pilihan jawaban C\nD. Pilihan jawaban D\nE. Pilihan jawaban E`}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#3381b5] focus:border-[#3381b5] outline-none bg-slate-50/40"
                />
              </div>

              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Kunci Jawaban Benar:</span>
                <div className="flex items-center gap-1.5">
                  {(['A', 'B', 'C', 'D', 'E'] as const).map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSingleFormCorrectKey(k)}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        singleFormCorrectKey === k
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSingleFormMassModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSingleFormMassApply}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Terapkan ke Form (Isi Opsi A-E)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Soal & Kunci Jawaban (Dari Daftar Soal) */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-6 animate-scale-in flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                  <Pencil className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight text-white">
                      Edit Soal & Kunci Jawaban
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-white/10 text-indigo-200 rounded-md">
                      ID: {editingQuestion.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Ubah teks pertanyaan, pilihan opsi A-E, kunci jawaban, dan bobot poin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Row 1: Topik, Tipe Soal, Bobot Poin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Materi / Topik:</label>
                  <select
                    value={editTopicId}
                    onChange={(e) => setEditTopicId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Tipe Pertanyaan:</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as QuestionType)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="pilihan_ganda">Pilihan Ganda</option>
                    <option value="essay">Essay / Uraian</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Bobot Nilai (Poin):</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editPoints}
                    onChange={(e) => setEditPoints(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Row 2: Teks Pertanyaan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Teks Pertanyaan Soal:</span>
                  <span className="text-[11px] text-slate-400 font-normal">Pastikan pertanyaan lengkap dan jelas</span>
                </label>
                <textarea
                  rows={4}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Tuliskan teks pertanyaan soal di sini..."
                  className="w-full p-3 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none leading-relaxed"
                />
              </div>

              {/* Row 3: Lampiran Media (Gambar & Audio) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Lampiran Gambar (Opsional):</label>
                  <input
                    type="text"
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    placeholder="URL gambar atau nama file..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  {editImage && (
                    <div className="mt-1.5 p-1 border border-slate-200 rounded-lg bg-slate-50 max-w-xs">
                      <img 
                        src={editImage.startsWith('http') || editImage.startsWith('data:') ? editImage : 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=300'} 
                        alt="Preview" 
                        className="h-20 object-contain rounded"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Lampiran Audio MP3 (Opsional):</label>
                  <input
                    type="text"
                    value={editAudio}
                    onChange={(e) => setEditAudio(e.target.value)}
                    placeholder="URL audio atau nama file..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 4: Options / Essay Guide */}
              {editType === 'pilihan_ganda' ? (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Pilihan Jawaban & Kunci Benar:</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Klik tombol huruf / kunci untuk menetapkan jawaban benar.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditMassPasteModal(true)}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3 text-indigo-600" />
                        <span>Tempel Massal A-E</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddEditOption}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Tambah Opsi</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {editOptions.map((opt) => (
                      <div
                        key={opt.key}
                        className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                          editCorrectAnswer === opt.key
                            ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setEditCorrectAnswer(opt.key)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 cursor-pointer transition-all ${
                            editCorrectAnswer === opt.key
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                          }`}
                          title={`Jadikan pilihan ${opt.key} sebagai kunci benar`}
                        >
                          {opt.key}
                        </button>

                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleEditOptionChange(opt.key, e.target.value)}
                            placeholder={`Teks pilihan jawaban ${opt.key}...`}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditCorrectAnswer(opt.key)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                            editCorrectAnswer === opt.key
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200'
                          }`}
                        >
                          {editCorrectAnswer === opt.key ? '✓ Kunci Benar' : 'Jadikan Kunci'}
                        </button>

                        {editOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditOption(opt.key)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer"
                            title="Hapus pilihan ini"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Quick Select Bar for Key */}
                  <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Kunci Jawaban Terpilih:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {editOptions.map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setEditCorrectAnswer(opt.key)}
                          className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            editCorrectAnswer === opt.key
                              ? 'bg-emerald-600 text-white shadow-md scale-105'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {opt.key}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-800">
                    Panduan Jawaban / Rubrik Penilaian Essay:
                  </label>
                  <textarea
                    rows={4}
                    value={editCorrectAnswer}
                    onChange={(e) => setEditCorrectAnswer(e.target.value)}
                    placeholder="Tuliskan kunci jawaban referensi atau panduan penilaian essay..."
                    className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-sans leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Simpan Perubahan Soal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Tempel Massal saat Edit Soal */}
      {editMassPasteModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Tempel Massal Pilihan Jawaban (A s.d E)
              </h4>
              <button
                onClick={() => setEditMassPasteModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tempelkan baris pilihan jawaban sekaligus (misal: <code>A. Pilihan 1</code>, <code>B. Pilihan 2</code>, dst).
              </p>
              <textarea
                rows={6}
                value={editMassPasteText}
                onChange={(e) => setEditMassPasteText(e.target.value)}
                placeholder={`A. Pilihan jawaban A\nB. Pilihan jawaban B\nC. Pilihan jawaban C\nD. Pilihan jawaban D\nE. Pilihan jawaban E`}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditMassPasteModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleEditMassApply}
                className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Terapkan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
