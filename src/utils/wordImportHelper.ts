/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question } from '../types';

export interface WordFormRow {
  no: string;
  jenis: 'SOAL' | 'JAWABAN';
  isi: string;
  jawaban: string;
  image?: string;
}

export interface WordPreviewQuestion {
  number: number;
  originalNo: string;
  text: string;
  image?: string;
  options: {
    key: string;
    text: string;
    image?: string;
    isCorrect: boolean;
    rawJawaban: string;
    rowIndex: number;
  }[];
  correctAnswer: string;
  errors: string[];
  isValid: boolean;
  soalRowIndex: number;
}

export interface WordValidationResult {
  questions: Omit<Question, 'id'>[];
  previewItems: WordPreviewQuestion[];
  errors: string[];
  exceedsLimit: boolean;
}

const isElementNode = (node: Node | null | undefined): node is Element =>
  Boolean(node && node.nodeType === 1);

const getTagLower = (el: Element): string => (el.tagName || el.nodeName || '').toLowerCase();

const getChildElements = (parent: Element): Element[] => {
  const res: Element[] = [];
  const children = parent.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isElementNode(child)) res.push(child);
  }
  return res;
};

const findClosestTag = (el: Element, tagNameLower: string): Element | null => {
  let curr: Node | null = el;
  while (curr) {
    if (isElementNode(curr) && getTagLower(curr) === tagNameLower) {
      return curr;
    }
    curr = curr.parentNode;
  }
  return null;
};

const hasAncestorTag = (el: Element, tagNames: string[]): boolean => {
  let curr: Node | null = el.parentNode;
  while (curr) {
    if (isElementNode(curr) && tagNames.includes(getTagLower(curr))) {
      return true;
    }
    curr = curr.parentNode;
  }
  return false;
};

export const getTopLevelTables = (doc: Document): Element[] => {
  const allTables = Array.from(doc.getElementsByTagName('table'));
  return allTables.filter(tbl => !hasAncestorTag(tbl, ['table']));
};

export const getDirectTableRows = (table: Element): Element[] => {
  const allRows = Array.from(table.getElementsByTagName('tr'));
  return allRows.filter(tr => findClosestTag(tr, 'table') === table);
};

export const formatSimpleNestedTable = (tbl: Element): string => {
  const rows = getDirectTableRows(tbl);
  return rows
    .map(r => {
      const cells = getChildElements(r).filter(c => {
        const t = getTagLower(c);
        return t === 'td' || t === 'th';
      });
      return cells
        .map(c => (c.textContent || '').replace(/\s+/g, ' ').trim())
        .join(' | ');
    })
    .filter(line => line.replace(/\|/g, '').trim().length > 0)
    .join('\n');
};

export const extractCellContentFromElement = (
  cell: Element,
  doc: Document
): { text: string; image?: string } => {
  const clone = cell.cloneNode(true) as Element;
  const imgs = Array.from(clone.getElementsByTagName('img'));
  const firstImg = imgs[0];
  const imgSrc = firstImg?.getAttribute('src') || undefined;

  // Replace <br> with newline text nodes
  const brs = Array.from(clone.getElementsByTagName('br'));
  brs.forEach(br => {
    if (br.parentNode) {
      br.parentNode.replaceChild(doc.createTextNode('\n'), br);
    }
  });

  // Replace nested tables with structured text lines inside <p>
  const nestedTables = Array.from(clone.getElementsByTagName('table')).filter(
    t => !hasAncestorTag(t, ['table']) || findClosestTag(t.parentNode as Element, 'table') === null
  );
  nestedTables.forEach(nestedTbl => {
    if (!nestedTbl.parentNode) return;
    const formattedTbl = formatSimpleNestedTable(nestedTbl);
    const pre = doc.createElement('p');
    pre.textContent = formattedTbl;
    nestedTbl.parentNode.replaceChild(pre, nestedTbl);
  });

  // Replace lists (ul/ol) inside cells with formatted paragraph lines
  const lists = [
    ...Array.from(clone.getElementsByTagName('ul')),
    ...Array.from(clone.getElementsByTagName('ol'))
  ];
  lists.forEach(listEl => {
    if (!listEl.parentNode || hasAncestorTag(listEl, ['ul', 'ol'])) return;
    const isOrdered = getTagLower(listEl) === 'ol';
    const listItems = Array.from(listEl.getElementsByTagName('li'));
    const lines = listItems
      .map((li, idx) => {
        const txt = (li.textContent || '').replace(/\s+/g, ' ').trim();
        return txt ? `${isOrdered ? `${idx + 1}.` : '•'} ${txt}` : '';
      })
      .filter(Boolean);
    const pre = doc.createElement('p');
    pre.textContent = lines.join('\n');
    listEl.parentNode.replaceChild(pre, listEl);
  });

  const blockChildren = getChildElements(clone).filter(el =>
    /^(?:p|div|li|h[1-6]|blockquote)$/i.test(getTagLower(el))
  );

  let text = '';
  if (blockChildren.length > 0) {
    text = blockChildren
      .map(b => (b.textContent || '').replace(/\t+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
  } else {
    text = (clone.textContent || '').replace(/\t+/g, ' ').trim();
  }

  return {
    text: text.trim(),
    ...(imgSrc ? { image: imgSrc } : {})
  };
};

export const extractExamproRowsFromDocument = (
  doc: Document
): {
  hasExamproTemplateTable: boolean;
  rows: WordFormRow[];
  structuralIssues: string[];
  topLevelTables: Element[];
} => {
  const topLevelTables = getTopLevelTables(doc);
  const extractedTemplateRows: WordFormRow[] = [];
  const structuralIssues: string[] = [];
  let hasExamproTemplateTable = false;

  topLevelTables.forEach(table => {
    const directRows = getDirectTableRows(table);
    let headerColMap = { no: 0, jenis: 1, isi: 2, jawaban: 3 };
    let tableUsesExampro = false;

    directRows.forEach((tr, rIdx) => {
      const cells = getChildElements(tr).filter(c => {
        const t = getTagLower(c);
        return t === 'td' || t === 'th';
      });
      if (cells.length < 3) return;

      const cellContents = cells.map(c => extractCellContentFromElement(c, doc));
      const lowerTexts = cellContents.map(c => c.text.toLowerCase().trim());

      // Detect header row (No | Jenis | Isi | Jawaban)
      if (
        (lowerTexts.includes('jenis') && (lowerTexts.includes('isi') || lowerTexts.includes('pertanyaan'))) ||
        ((lowerTexts[0] === 'no' || lowerTexts[0] === 'no.' || lowerTexts[0] === 'nomor') && lowerTexts[1]?.includes('jenis'))
      ) {
        tableUsesExampro = true;
        hasExamproTemplateTable = true;
        const noIdx = lowerTexts.findIndex(t => t === 'no' || t === 'no.' || t === 'nomor');
        const jenisIdx = lowerTexts.findIndex(t => t === 'jenis' || t === 'tipe');
        const isiIdx = lowerTexts.findIndex(t => t === 'isi' || t === 'pertanyaan' || t === 'teks');
        const jawIdx = lowerTexts.findIndex(t => t === 'jawaban' || t === 'status jawaban' || t === 'kunci');
        headerColMap = {
          no: noIdx !== -1 ? noIdx : 0,
          jenis: jenisIdx !== -1 ? jenisIdx : 1,
          isi: isiIdx !== -1 ? isiIdx : 2,
          jawaban: jawIdx !== -1 ? jawIdx : 3
        };
        return;
      }

      const jenisRaw = (cellContents[headerColMap.jenis]?.text || '').trim().toUpperCase();
      const isRowSoal = /^(?:SOAL|PERTANYAAN|Q)$/i.test(jenisRaw);
      const isRowJawaban = /^(?:JAWABAN|JAWABA|OPSI|PILIHAN)$/i.test(jenisRaw);

      if (isRowSoal || isRowJawaban) {
        tableUsesExampro = true;
        hasExamproTemplateTable = true;
        const noVal = (cellContents[headerColMap.no]?.text || '').trim();
        const isiCell = cellContents[headerColMap.isi] || { text: '' };
        const jawVal = (cellContents[headerColMap.jawaban]?.text || '').trim();

        extractedTemplateRows.push({
          no: noVal,
          jenis: isRowSoal ? 'SOAL' : 'JAWABAN',
          isi: isiCell.text,
          jawaban: jawVal,
          ...(isiCell.image ? { image: isiCell.image } : {})
        });
      } else if (tableUsesExampro) {
        const rowHasContent = cellContents.some(c => c.text.trim() !== '' || Boolean(c.image));
        if (rowHasContent) {
          structuralIssues.push(
            `Baris tabel ke-${rIdx + 1}: Kolom Jenis "${jenisRaw || '(kosong)'}" tidak dikenali (harus SOAL atau JAWABAN).`
          );
        }
      }
    });
  });

  // Preserve original 'no' in rows; sequential numbering 1..N is computed in validation & preview
  return {
    hasExamproTemplateTable,
    rows: extractedTemplateRows,
    structuralIssues,
    topLevelTables
  };
};

export const buildValidatedWordQuestions = (
  rows: WordFormRow[],
  topicId: string,
  extraStructuralErrors: string[] = []
): WordValidationResult => {
  const optionKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const errors: string[] = [...extraStructuralErrors];
  const blocks: { soal: WordFormRow; soalIdx: number; jawabans: { row: WordFormRow; rowIdx: number }[] }[] = [];
  let orphanCount = 0;

  rows.forEach((row, rowIdx) => {
    const hasAnyContent = Boolean(
      (row.isi || '').trim() || row.image || (row.no || '').trim() || (row.jawaban || '').trim()
    );
    if (!hasAnyContent) return;

    if (row.jenis === 'SOAL') {
      blocks.push({ soal: row, soalIdx: rowIdx, jawabans: [] });
    } else {
      if (blocks.length === 0) {
        orphanCount++;
      } else {
        blocks[blocks.length - 1].jawabans.push({ row, rowIdx });
      }
    }
  });

  if (orphanCount > 0) {
    errors.push(`Struktur tabel: Ditemukan ${orphanCount} baris JAWABAN sebelum baris SOAL pertama.`);
  }

  const exceedsLimit = blocks.length > 50;
  if (exceedsLimit) {
    errors.push(
      `Batas maksimal import terlampaui: ditemukan ${blocks.length} soal. Maksimal 50 soal dalam satu kali import.`
    );
  }

  const previewItems: WordPreviewQuestion[] = [];
  const builtQuestions: Omit<Question, 'id'>[] = [];

  blocks.forEach((block, idx) => {
    // Auto-renumber remaining blocks sequentially 1, 2, 3, ...
    const seqNo = idx + 1;
    const qErrors: string[] = [];
    const soalText = (block.soal.isi || '').trim();
    const soalImage = block.soal.image;

    if (!soalText && !soalImage) {
      qErrors.push(`Soal No. ${seqNo}: Isi pertanyaan (teks maupun gambar) masih kosong.`);
    }

    if (block.jawabans.length !== 5) {
      qErrors.push(
        `Soal No. ${seqNo}: Harus memiliki tepat 5 pilihan jawaban (A–E), saat ini ditemukan ${block.jawabans.length} baris JAWABAN.`
      );
    }

    const correctKeys: string[] = [];
    const builtOptions: WordPreviewQuestion['options'] = [];

    block.jawabans.forEach((jItem, jIdx) => {
      const key = optionKeys[jIdx] || String.fromCharCode(65 + jIdx);
      const optText = (jItem.row.isi || '').trim();
      const optImage = jItem.row.image;
      const rawJawaban = (jItem.row.jawaban || '').trim();
      const lowerJ = rawJawaban.toLowerCase();

      if (!optText && !optImage) {
        qErrors.push(`Soal No. ${seqNo}: Isi pilihan jawaban ${key} masih kosong.`);
      }

      const isCorrectVal =
        ['1', 'benar', 'true', 'ya', 'kunci', 'v', 'y'].includes(lowerJ) ||
        (lowerJ.length === 1 && lowerJ === key.toLowerCase());
      const isWrongVal =
        rawJawaban === '0' ||
        rawJawaban === '' ||
        ['salah', 'false', 'tidak', 'n'].includes(lowerJ);

      if (!isCorrectVal && !isWrongVal) {
        qErrors.push(
          `Soal No. ${seqNo}: Kolom Jawaban pada pilihan ${key} bernilai "${rawJawaban}" (harus angka 1 untuk benar atau 0 untuk salah).`
        );
      }

      if (isCorrectVal) {
        correctKeys.push(key);
      }

      builtOptions.push({
        key,
        text: optText || (optImage ? `[Gambar Pilihan ${key}]` : ''),
        ...(optImage ? { image: optImage } : {}),
        isCorrect: isCorrectVal,
        rawJawaban: rawJawaban || '0',
        rowIndex: jItem.rowIdx
      });
    });

    if (block.jawabans.length > 0 && correctKeys.length === 0) {
      qErrors.push(`Soal No. ${seqNo}: Belum ada jawaban benar (isi angka 1 pada salah satu pilihan A–E).`);
    } else if (correctKeys.length > 1) {
      qErrors.push(
        `Soal No. ${seqNo}: Memiliki lebih dari satu jawaban benar (${correctKeys.join(', ')}). Setiap soal hanya boleh memiliki 1 jawaban benar.`
      );
    }

    const finalCorrectKey = correctKeys[0] || 'A';
    qErrors.forEach(err => errors.push(err));

    previewItems.push({
      number: seqNo,
      originalNo: (block.soal.no || '').trim() || String(seqNo),
      text: soalText || (soalImage ? `[Gambar Soal No. ${seqNo}]` : ''),
      ...(soalImage ? { image: soalImage } : {}),
      options: builtOptions,
      correctAnswer: finalCorrectKey,
      errors: qErrors,
      isValid: qErrors.length === 0,
      soalRowIndex: block.soalIdx
    });

    if (qErrors.length === 0) {
      const questionObj: Omit<Question, 'id'> = {
        topicId,
        text: soalText || `Perhatikan gambar soal nomor ${seqNo} berikut:`,
        type: 'pilihan_ganda',
        options: builtOptions.map(o => ({
          key: o.key,
          text: o.text,
          ...(o.image ? { image: o.image } : {})
        })),
        correctAnswer: finalCorrectKey,
        points: 10,
        ...(soalImage ? { image: soalImage } : {})
      };
      builtQuestions.push(questionObj);
    }
  });

  return {
    questions: builtQuestions,
    previewItems,
    errors,
    exceedsLimit
  };
};

export const buildExamproWordDocument = async (soalCount: 10 | 20 | 30 | 40 | 50) => {
  const {
    Document,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    WidthType,
    AlignmentType,
    TextRun,
    BorderStyle
  } = await import('docx');

  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' }
  };

  const cellMargins = { top: 80, bottom: 80, left: 110, right: 110 };

  const tableRows: InstanceType<typeof TableRow>[] = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'No', bold: true, font: 'Calibri', size: 22 })],
              alignment: AlignmentType.CENTER
            })
          ],
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          borders: cellBorders,
          margins: cellMargins
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Jenis', bold: true, font: 'Calibri', size: 22 })]
            })
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          borders: cellBorders,
          margins: cellMargins
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Isi', bold: true, font: 'Calibri', size: 22 })]
            })
          ],
          width: { size: 62, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          borders: cellBorders,
          margins: cellMargins
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Jawaban', bold: true, font: 'Calibri', size: 22 })],
              alignment: AlignmentType.CENTER
            })
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: 'E2E8F0' },
          borders: cellBorders,
          margins: cellMargins
        })
      ]
    })
  ];

  const optLetters = ['A', 'B', 'C', 'D', 'E'];
  for (let i = 1; i <= soalCount; i++) {
    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(i), bold: true, font: 'Calibri', size: 22 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            borders: cellBorders,
            margins: cellMargins
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'SOAL', bold: true, font: 'Calibri', size: 22 })]
              })
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            borders: cellBorders,
            margins: cellMargins
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Pertanyaan soal nomor ${i}... (Tulis teks, paragraf, atau tempel gambar di sini)`,
                    font: 'Calibri',
                    size: 22
                  })
                ]
              })
            ],
            width: { size: 62, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC' },
            borders: cellBorders,
            margins: cellMargins
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: '', font: 'Calibri', size: 22 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: 'FFFF00' }, // Sel kuning khusus baris SOAL
            borders: cellBorders,
            margins: cellMargins
          })
        ]
      })
    );

    optLetters.forEach(letter => {
      tableRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '', font: 'Calibri', size: 21 })],
                  alignment: AlignmentType.CENTER
                })
              ],
              width: { size: 8, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              margins: cellMargins
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'JAWABAN', font: 'Calibri', size: 21 })]
                })
              ],
              width: { size: 15, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              margins: cellMargins
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Pilihan jawaban ${letter} soal no. ${i}`,
                      font: 'Calibri',
                      size: 21
                    })
                  ]
                })
              ],
              width: { size: 62, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              margins: cellMargins
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: '0', font: 'Calibri', size: 21 })],
                  alignment: AlignmentType.CENTER
                })
              ],
              width: { size: 15, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              margins: cellMargins
            })
          ]
        })
      );
    });
  }

  return new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `Template Import Soal EXAMPRO V1 (${soalCount} Soal Pilihan Ganda)`,
                bold: true,
                size: 28,
                font: 'Calibri'
              })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text:
                  'Petunjuk Pengisian: (1) Setiap soal terdiri dari 1 baris SOAL dan 5 baris JAWABAN (A-E). (2) Isi angka 1 pada kolom Jawaban untuk pilihan yang benar dan angka 0 untuk pilihan yang salah. Sel berwarna kuning di baris SOAL dibiarkan kosong. (3) Anda dapat menghapus blok soal (1 baris SOAL + 5 baris JAWABAN) langsung di Word jika jumlah soal yang dibutuhkan lebih sedikit; nomor akan disusun ulang otomatis (1, 2, 3...) saat diimport. (4) Maksimal 50 soal per sekali import.',
                size: 20,
                font: 'Calibri'
              })
            ],
            spacing: { after: 240 }
          }),
          new Table({
            rows: tableRows,
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            }
          })
        ]
      }
    ]
  });
};
