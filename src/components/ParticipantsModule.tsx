/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Users, UserPlus, FileUp, CreditCard, RefreshCw, Plus, Trash2, Search, Printer, Check, Clipboard, Edit2, Save, X, FileSpreadsheet, Download, Upload, AlertCircle, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, UserX, Trash, Lock, Unlock, ShieldCheck, Eye, LogOut, RotateCcw, UserCheck, Timer, ArrowLeftRight, Settings2 } from 'lucide-react';
import { Group, Participant } from '../types';
import * as XLSX from 'xlsx';

interface ParsedStudentRow {
  name: string;
  username: string;
  passwordHash: string;
  groupName: string;
  groupId: string;
  examCardNo: string;
  isValid: boolean;
  errorMsg?: string;
  isNewGroup?: boolean;
}

interface ParticipantsModuleProps {
  groups: Group[];
  participants: Participant[];
  onAddGroup: (g: Omit<Group, 'id'>) => void;
  onDeleteGroup: (id: string) => void;
  onUpdateGroup: (id: string, updatedGroup: Partial<Group>) => void;
  onDeleteGroupsBulk: (ids: string[]) => void;
  onAddGroupsBulk?: (gs: Omit<Group, 'id'>[]) => void;
  onAddParticipant: (p: Omit<Participant, 'id'>) => void;
  onUpdateParticipant?: (id: string, updatedParticipant: Partial<Participant>) => void;
  onDeleteParticipant: (id: string) => void;
  onDeleteParticipantsBulk?: (ids: string[]) => void;
  onResetParticipantLogin: (id: string, resetAttempt?: boolean) => void;
  onResetParticipantsBulk?: (ids: string[], resetAttempt?: boolean) => void;
  onResetAllLockedParticipants?: (resetAttempt?: boolean) => void;
  onBulkImportParticipants: (data: Omit<Participant, 'id'>[]) => void;
  activeSubMenu: string;
  onChangeMenu?: (menu: string, submenu: string) => void;
}

export default function ParticipantsModule({
  groups,
  participants,
  onAddGroup,
  onDeleteGroup,
  onUpdateGroup,
  onDeleteGroupsBulk,
  onAddGroupsBulk,
  onAddParticipant,
  onUpdateParticipant,
  onDeleteParticipant,
  onDeleteParticipantsBulk,
  onResetParticipantLogin,
  onResetParticipantsBulk,
  onResetAllLockedParticipants,
  onBulkImportParticipants,
  activeSubMenu,
  onChangeMenu
}: ParticipantsModuleProps) {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  // Form states for adding single elements
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  
  // Checkbox selection & inline edit states for Groups
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>('');
  
  // Checkbox selection & class filter for Participants
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  const [filterGroupId, setFilterGroupId] = useState<string>('all');
  const [participantStatusFilter, setParticipantStatusFilter] = useState<'all' | 'locked' | 'active' | 'offline'>('all');
  
  // Edit Participant Modal States
  const [editingPart, setEditingPart] = useState<Participant | null>(null);
  const [editPartName, setEditPartName] = useState('');
  const [editPartUser, setEditPartUser] = useState('');
  const [editPartPass, setEditPartPass] = useState('');
  const [editPartGroup, setEditPartGroup] = useState('');
  const [editPartCard, setEditPartCard] = useState('');
  const [editPartLoggedIn, setEditPartLoggedIn] = useState(false);
  const [editPartLocked, setEditPartLocked] = useState(false);
  const [editPartLockedReason, setEditPartLockedReason] = useState('');

  // Reset Login / Anti-Cheat Control Center states
  const [resetFilterTab, setResetFilterTab] = useState<'all' | 'locked' | 'active'>('locked');
  const [resetSearchTerm, setResetSearchTerm] = useState('');
  const [resetFilterGroupId, setResetFilterGroupId] = useState('all');
  const [selectedResetIds, setSelectedResetIds] = useState<string[]>([]);
  const [confirmAttemptResetModal, setConfirmAttemptResetModal] = useState<{ id: string; name: string } | null>(null);
  const [confirmBulkActionModal, setConfirmBulkActionModal] = useState<{ action: 'unlock_all' | 'reset_all_logins' | 'unlock_selected'; ids?: string[]; count: number } | null>(null);

  // In-App React Delete Modals & Toast State (Bypasses iframe window.confirm restrictions)
  const [deletePartModal, setDeletePartModal] = useState<{
    type: 'single' | 'bulk';
    participant?: Participant;
    ids?: string[];
    count?: number;
  } | null>(null);

  const [deleteGroupModal, setDeleteGroupModal] = useState<{
    type: 'single' | 'bulk';
    group?: Group;
    ids?: string[];
    count?: number;
  } | null>(null);

  const [generateClassesList, setGenerateClassesList] = useState<Omit<Group, 'id'>[] | null>(null);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Tab mode in Daftar Peserta: 'single' | 'bulk_excel'
  const [participantInputMode, setParticipantInputMode] = useState<'single' | 'bulk_excel'>('single');

  // Single participant inputs
  const [newPartName, setNewPartName] = useState('');
  const [newPartUser, setNewPartUser] = useState('');
  const [newPartPass, setNewPartPass] = useState('');
  const [newPartGroup, setNewPartGroup] = useState(groups[0]?.id || '');
  const [newPartCard, setNewPartCard] = useState('');

  // Bulk Import state
  const [bulkInputMethod, setBulkInputMethod] = useState<'file' | 'paste'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedExcelText, setPastedExcelText] = useState('');
  const [importGroup, setImportGroup] = useState(groups[0]?.id || '');
  const [autoCreateNewGroups, setAutoCreateNewGroups] = useState(true);
  const [parsedPreviewRows, setParsedPreviewRows] = useState<ParsedStudentRow[]>([]);
  const [detectedNewGroupNames, setDetectedNewGroupNames] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advanced Column Mapping & Detection state
  const [rawRowsData, setRawRowsData] = useState<any[][]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState<boolean>(true);
  const [nameColIdx, setNameColIdx] = useState<number>(0);
  const [userColIdx, setUserColIdx] = useState<number>(1);
  const [passColIdx, setPassColIdx] = useState<number>(2);
  const [groupColIdx, setGroupColIdx] = useState<number>(-1);
  const [cardColIdx, setCardColIdx] = useState<number>(-1);
  const [detectedTotalCols, setDetectedTotalCols] = useState<number>(0);
  const [columnSamples, setColumnSamples] = useState<{ colIdx: number; headerName: string; sampleVal: string }[]>([]);
  const [autoDetectionNotice, setAutoDetectionNotice] = useState<string>('');

  // Detection helpers to protect student name from being replaced with NIS numbers
  const isLikelyNisOrNumber = (val: string): boolean => {
    const clean = String(val ?? '').trim();
    if (!clean) return false;
    // Pure digit string with 3 or more digits: e.g. "242510288", "12345", "001239"
    if (/^\d{3,}$/.test(clean)) return true;
    // Format like NIS-12345, 01-002, 12.34.56, or has 'nis' / 'no' prefix and almost no letters
    if (/^(nis|nisn|no|id|nik)?[0-9.\-\/]+$/i.test(clean) && !/[a-zA-Z]{3,}/.test(clean)) return true;
    return false;
  };

  const isLikelyPersonName = (val: string): boolean => {
    const clean = String(val ?? '').trim();
    if (!clean) return false;
    const letters = (clean.match(/[a-zA-Z]/g) || []).length;
    const digits = (clean.match(/\d/g) || []).length;
    // Must have at least 3 letters, and more letters than digits
    return letters >= 3 && letters > digits;
  };

  const isLikelyGroupOrClass = (val: string, groupList: Group[]): boolean => {
    const clean = String(val ?? '').trim();
    if (!clean) return false;
    if (/^(kelas|grup|group|rombel|xii|xi|x|ipa|ips|rpl|tkj|mm|otkp|ak|tkr)\b/i.test(clean)) return true;
    return groupList.some(g => g.name.toLowerCase().trim() === clean.toLowerCase().trim() || g.id.toLowerCase() === clean.toLowerCase());
  };

  // Main intelligent parsing function
  const parseRawMatrixToPreview = (
    rawRows: any[][],
    currentGroups: Group[],
    defaultGId: string,
    forcedMapping?: {
      nameCol?: number;
      userCol?: number;
      passCol?: number;
      groupCol?: number;
      cardCol?: number;
      hasHeader?: boolean;
    }
  ) => {
    if (!rawRows || rawRows.length === 0) {
      setParsedPreviewRows([]);
      setDetectedNewGroupNames([]);
      setRawRowsData([]);
      setColumnSamples([]);
      setAutoDetectionNotice('');
      return;
    }

    setRawRowsData(rawRows);

    // Filter non-empty rows
    const validRawRows = rawRows.filter(r => Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== ''));
    if (validRawRows.length === 0) {
      setParsedPreviewRows([]);
      setDetectedNewGroupNames([]);
      return;
    }

    const totalCols = Math.max(...validRawRows.map(r => r.length), 0);
    setDetectedTotalCols(totalCols);

    const firstRow = validRawRows[0];

    // Check if first row is a header row
    let detectedHasHeader = false;
    if (firstRow && Array.isArray(firstRow)) {
      detectedHasHeader = firstRow.some((cell: any) => {
        const text = String(cell || '').toLowerCase().trim();
        return (
          text.includes('nama') ||
          text.includes('name') ||
          text.includes('siswa') ||
          text.includes('peserta') ||
          text.includes('user') ||
          text.includes('nis') ||
          text.includes('induk') ||
          text.includes('sandi') ||
          text.includes('password') ||
          text.includes('pass') ||
          text.includes('kelas') ||
          text.includes('grup') ||
          text.includes('group') ||
          text.includes('rombel') ||
          text.includes('kartu')
        );
      });
    }

    const useHeader = forcedMapping?.hasHeader !== undefined ? forcedMapping.hasHeader : detectedHasHeader;
    setHasHeaderRow(useHeader);

    // Initial column indices
    let detectedNameCol = 0;
    let detectedUserCol = 1;
    let detectedPassCol = 2;
    let detectedGroupCol = -1;
    let detectedCardCol = -1;

    if (useHeader && firstRow && Array.isArray(firstRow)) {
      firstRow.forEach((cell: any, idx: number) => {
        const text = String(cell || '').toLowerCase().trim();
        // Check for Name (must not be exam card or no peserta)
        if ((text.includes('nama') || text.includes('name') || text.includes('siswa') || text.includes('peserta')) &&
            !text.includes('kartu') && !text.includes('no peserta') && !text.includes('nomor peserta')) {
          detectedNameCol = idx;
        }
        // Check for Username / NIS
        else if (text.includes('nis') || text.includes('user') || text.includes('induk') || text.includes('nik') || text.includes('id siswa')) {
          detectedUserCol = idx;
        }
        // Check for Password
        else if (text.includes('pass') || text.includes('sandi') || text.includes('pin') || text.includes('kata sandi')) {
          detectedPassCol = idx;
        }
        // Check for Class / Group
        else if (text.includes('kelas') || text.includes('grup') || text.includes('group') || text.includes('rombel') || text.includes('jurusan')) {
          detectedGroupCol = idx;
        }
        // Check for Card
        else if (text.includes('kartu') || text.includes('ujian') || text.includes('no peserta') || text.includes('nomor peserta')) {
          detectedCardCol = idx;
        }
      });
    } else {
      // Content-based scoring from data rows
      const dataRowsSample = validRawRows.slice(0, 8);
      
      // Check if column 0 is just row numbers (1, 2, 3...)
      const col0IsRowNumbers = dataRowsSample.length > 0 && dataRowsSample.every((row, i) => {
        const val = String(row[0] || '').trim();
        return val === String(i + 1) || val === String(i);
      });

      const startCol = col0IsRowNumbers ? 1 : 0;

      let bestNameCol = -1;
      let maxNameScore = 0;
      let bestNisCol = -1;
      let maxNisScore = 0;

      for (let c = startCol; c < totalCols; c++) {
        let nameScore = 0;
        let nisScore = 0;
        dataRowsSample.forEach(r => {
          const val = String(r[c] || '').trim();
          if (isLikelyPersonName(val)) nameScore++;
          if (isLikelyNisOrNumber(val)) nisScore++;
        });

        if (nameScore > maxNameScore) {
          maxNameScore = nameScore;
          bestNameCol = c;
        }
        if (nisScore > maxNisScore) {
          maxNisScore = nisScore;
          bestNisCol = c;
        }
      }

      if (bestNameCol !== -1) detectedNameCol = bestNameCol;
      if (bestNisCol !== -1 && bestNisCol !== bestNameCol) detectedUserCol = bestNisCol;

      // Group and password detection
      for (let c = startCol; c < totalCols; c++) {
        if (c === detectedNameCol || c === detectedUserCol) continue;
        const isGroupLike = dataRowsSample.some(r => isLikelyGroupOrClass(String(r[c] || ''), currentGroups));
        if (isGroupLike && detectedGroupCol === -1) {
          detectedGroupCol = c;
        } else if (detectedPassCol === 2 && c !== 2) {
          detectedPassCol = c;
        }
      }
    }

    // Apply forced mapping if user manually chose in UI
    const finalNameCol = forcedMapping?.nameCol !== undefined ? forcedMapping.nameCol : detectedNameCol;
    const finalUserCol = forcedMapping?.userCol !== undefined ? forcedMapping.userCol : detectedUserCol;
    const finalPassCol = forcedMapping?.passCol !== undefined ? forcedMapping.passCol : detectedPassCol;
    const finalGroupCol = forcedMapping?.groupCol !== undefined ? forcedMapping.groupCol : detectedGroupCol;
    const finalCardCol = forcedMapping?.cardCol !== undefined ? forcedMapping.cardCol : detectedCardCol;

    setNameColIdx(finalNameCol);
    setUserColIdx(finalUserCol);
    setPassColIdx(finalPassCol);
    setGroupColIdx(finalGroupCol);
    setCardColIdx(finalCardCol);

    // Build sample column descriptions for user dropdowns
    const samples: { colIdx: number; headerName: string; sampleVal: string }[] = [];
    const sampleDataRow = validRawRows[useHeader ? 1 : 0] || [];
    for (let c = 0; c < totalCols; c++) {
      const headerText = useHeader && firstRow ? String(firstRow[c] || '').trim() : '';
      const sampleText = String(sampleDataRow[c] || '').trim();
      const colLetter = String.fromCharCode(65 + c);
      samples.push({
        colIdx: c,
        headerName: headerText ? `Kolom ${colLetter}: ${headerText}` : `Kolom ${colLetter} (Kolom ke-${c + 1})`,
        sampleVal: sampleText
      });
    }
    setColumnSamples(samples);

    const nameColLetter = String.fromCharCode(65 + finalNameCol);
    const userColLetter = String.fromCharCode(65 + finalUserCol);
    setAutoDetectionNotice(`Kolom Nama Siswa: Kolom ${nameColLetter} | Username/NIS: Kolom ${userColLetter}`);

    // Parse all rows into ParsedStudentRow[]
    const startIdx = useHeader ? 1 : 0;
    const parsedList: ParsedStudentRow[] = [];
    const newGroupsSet = new Set<string>();

    for (let i = startIdx; i < validRawRows.length; i++) {
      const row = validRawRows[i];
      if (!row || !Array.isArray(row)) continue;

      let name = String(row[finalNameCol] ?? '').trim();
      let username = String(row[finalUserCol] ?? '').trim();
      let password = finalPassCol >= 0 && finalPassCol < row.length ? String(row[finalPassCol] ?? '').trim() : '';
      let groupNameFromCol = finalGroupCol >= 0 && finalGroupCol < row.length ? String(row[finalGroupCol] ?? '').trim() : '';
      let cardNo = finalCardCol >= 0 && finalCardCol < row.length ? String(row[finalCardCol] ?? '').trim() : '';

      // STRICT USER REQUEST FIX:
      // "perbaiki kolom nama siswa jangan nis hrs nama siswa"
      // If name is numeric (e.g. 242510288) AND username has alphabetical letters (e.g. AFIFAH AZAHRA):
      // Swap them automatically so Nama Siswa is NEVER the NIS number!
      if (isLikelyNisOrNumber(name) && isLikelyPersonName(username)) {
        const temp = name;
        name = username;
        username = temp;
      }

      // If name is STILL purely numeric (e.g. user selected wrong column or both are NIS), search row for an actual person name!
      if (isLikelyNisOrNumber(name)) {
        for (let col = 0; col < row.length; col++) {
          const cellVal = String(row[col] ?? '').trim();
          if (isLikelyPersonName(cellVal) && col !== finalUserCol && col !== finalPassCol) {
            if (!username || username === name) {
              username = name;
            }
            name = cellVal;
            break;
          }
        }
      }

      // Fallback password if empty
      if (!password) {
        password = 'siswa' + (username ? username.slice(-4) : '123');
      }

      // Fallback cardNo: use username / NIS if available (as standard in schools), or generate CARD-xxx
      if (!cardNo) {
        cardNo = username || `KARTU-${(participants.length + i + 1).toString().padStart(3, '0')}`;
      }

      // Group matching
      let finalGroupId = defaultGId || currentGroups[0]?.id || '';
      let isNewGroup = false;

      if (groupNameFromCol) {
        const foundGroup = currentGroups.find(
          g => g.name.toLowerCase().trim() === groupNameFromCol.toLowerCase().trim() ||
               g.id.toLowerCase() === groupNameFromCol.toLowerCase()
        );
        if (foundGroup) {
          finalGroupId = foundGroup.id;
          groupNameFromCol = foundGroup.name;
        } else {
          isNewGroup = true;
          newGroupsSet.add(groupNameFromCol);
        }
      } else {
        const defaultG = currentGroups.find(g => g.id === defaultGId) || currentGroups[0];
        groupNameFromCol = defaultG?.name || 'Grup Utama';
      }

      const isValid = Boolean(name && username && password && !isLikelyNisOrNumber(name));
      let errorMsg = '';
      if (!name) errorMsg += 'Nama siswa kosong; ';
      else if (isLikelyNisOrNumber(name)) errorMsg += 'Kolom Nama Siswa terisi NIS, harus Nama Siswa; ';
      if (!username) errorMsg += 'Username kosong; ';
      if (!password) errorMsg += 'Password kosong; ';

      parsedList.push({
        name,
        username,
        passwordHash: password,
        groupName: groupNameFromCol,
        groupId: finalGroupId,
        examCardNo: cardNo,
        isValid,
        errorMsg: errorMsg ? errorMsg.trim() : undefined,
        isNewGroup
      });
    }

    setParsedPreviewRows(parsedList);
    setDetectedNewGroupNames(Array.from(newGroupsSet));
  };

  // Helper to re-map columns when user changes mapping in UI
  const handleColumnMappingChange = (field: 'name' | 'user' | 'pass' | 'group' | 'card' | 'hasHeader', val: any) => {
    if (rawRowsData.length === 0) return;
    const mapping = {
      nameCol: field === 'name' ? Number(val) : nameColIdx,
      userCol: field === 'user' ? Number(val) : userColIdx,
      passCol: field === 'pass' ? Number(val) : passColIdx,
      groupCol: field === 'group' ? Number(val) : groupColIdx,
      cardCol: field === 'card' ? Number(val) : cardColIdx,
      hasHeader: field === 'hasHeader' ? Boolean(val) : hasHeaderRow
    };
    parseRawMatrixToPreview(rawRowsData, groups, importGroup, mapping);
  };

  // Quick swap for Nama & NIS
  const handleSwapNameAndUserColumns = () => {
    if (rawRowsData.length === 0) return;
    const mapping = {
      nameCol: userColIdx,
      userCol: nameColIdx,
      passCol: passColIdx,
      groupCol: groupColIdx,
      cardCol: cardColIdx,
      hasHeader: hasHeaderRow
    };
    parseRawMatrixToPreview(rawRowsData, groups, importGroup, mapping);
    showToast('Kolom Nama Siswa dan Username/NIS berhasil ditukar!', 'info');
  };

  // Inline row cell editor for preview table
  const handleUpdatePreviewCell = (rowIndex: number, field: keyof ParsedStudentRow, value: string) => {
    setParsedPreviewRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIndex], [field]: value };
      const isValid = Boolean(row.name && row.username && row.passwordHash && !isLikelyNisOrNumber(row.name));
      let errorMsg = '';
      if (!row.name) errorMsg += 'Nama siswa kosong; ';
      else if (isLikelyNisOrNumber(row.name)) errorMsg += 'Kolom Nama Siswa terisi NIS, harus Nama Siswa; ';
      if (!row.username) errorMsg += 'Username kosong; ';
      if (!row.passwordHash) errorMsg += 'Password kosong; ';
      row.isValid = isValid;
      row.errorMsg = errorMsg ? errorMsg.trim() : undefined;
      updated[rowIndex] = row;
      return updated;
    });
  };

  // Handle file select & preview
  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    if (!file) {
      setParsedPreviewRows([]);
      setDetectedNewGroupNames([]);
      setRawRowsData([]);
      setColumnSamples([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        parseRawMatrixToPreview(rawRows, groups, importGroup);
      } catch (err) {
        console.error('Failed to parse excel file', err);
        showToast('Gagal membaca file Excel. Pastikan format file adalah .xlsx, .xls, atau .csv yang valid.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle direct text paste from Excel
  const handlePastedTextChange = (text: string) => {
    setPastedExcelText(text);
    if (!text.trim()) {
      setParsedPreviewRows([]);
      setDetectedNewGroupNames([]);
      setRawRowsData([]);
      setColumnSamples([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const rawRows = lines.map(line => {
      // Split by tab (standard Excel copy) or semicolon or comma if no tabs
      if (line.includes('\t')) {
        return line.split('\t');
      } else if (line.includes(';')) {
        return line.split(';');
      } else {
        return line.split(',');
      }
    });

    parseRawMatrixToPreview(rawRows, groups, importGroup);
  };

  // Participant selection helpers at top-level
  const handleSelectAllParticipants = (filteredParts: Participant[], checked: boolean) => {
    if (checked) {
      setSelectedPartIds(filteredParts.map(p => p.id));
    } else {
      setSelectedPartIds([]);
    }
  };

  const handleSelectParticipant = (id: string) => {
    setSelectedPartIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedParticipants = () => {
    if (selectedPartIds.length === 0) return;
    setDeletePartModal({
      type: 'bulk',
      ids: [...selectedPartIds],
      count: selectedPartIds.length
    });
  };

  const handleDeleteSingleParticipant = (p: Participant) => {
    setDeletePartModal({
      type: 'single',
      participant: p
    });
  };

  const handleConfirmDeleteParticipant = () => {
    if (!deletePartModal) return;

    if (deletePartModal.type === 'single' && deletePartModal.participant) {
      const p = deletePartModal.participant;
      onDeleteParticipant(p.id);
      setSelectedPartIds(prev => prev.filter(id => id !== p.id));
      if (editingPart?.id === p.id) {
        setEditingPart(null);
      }
      showToast(`Peserta "${p.name}" (${p.username}) berhasil dihapus.`, 'success');
    } else if (deletePartModal.type === 'bulk' && deletePartModal.ids) {
      const ids = deletePartModal.ids;
      if (onDeleteParticipantsBulk) {
        onDeleteParticipantsBulk(ids);
      } else {
        ids.forEach(id => onDeleteParticipant(id));
      }
      setSelectedPartIds([]);
      showToast(`Berhasil menghapus ${ids.length} data peserta terpilih.`, 'success');
    }

    setDeletePartModal(null);
  };

  const handleOpenEditModal = (p: Participant) => {
    setEditingPart(p);
    setEditPartName(p.name);
    setEditPartUser(p.username);
    setEditPartPass(p.passwordHash);
    setEditPartGroup(p.groupId || (groups[0]?.id ?? ''));
    setEditPartCard(p.examCardNo);
    setEditPartLoggedIn(p.isLoggedIn);
    setEditPartLocked(p.isLocked || false);
    setEditPartLockedReason(p.lockedReason || '');
  };

  const handleCloseEditModal = () => {
    setEditingPart(null);
  };

  const handleSaveEditParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;
    if (!editPartName.trim() || !editPartUser.trim() || !editPartPass.trim()) {
      showToast('Nama Siswa, Username, dan Password tidak boleh kosong.', 'error');
      return;
    }

    if (onUpdateParticipant) {
      onUpdateParticipant(editingPart.id, {
        name: editPartName.trim(),
        username: editPartUser.trim(),
        passwordHash: editPartPass.trim(),
        groupId: editPartGroup || groups[0]?.id || '',
        examCardNo: editPartCard.trim() || editingPart.examCardNo,
        isLoggedIn: editPartLoggedIn,
        isLocked: editPartLocked,
        lockedReason: editPartLocked ? (editPartLockedReason.trim() || 'Terkunci oleh pengawas') : undefined
      });
    } else {
      // Fallback: delete and add with same ID if update handler not passed
      onDeleteParticipant(editingPart.id);
      onAddParticipant({
        name: editPartName.trim(),
        username: editPartUser.trim(),
        passwordHash: editPartPass.trim(),
        groupId: editPartGroup || groups[0]?.id || '',
        examCardNo: editPartCard.trim() || editingPart.examCardNo,
        isLoggedIn: editPartLoggedIn,
        isLocked: editPartLocked,
        lockedReason: editPartLocked ? (editPartLockedReason.trim() || 'Terkunci oleh pengawas') : undefined
      });
    }

    showToast(`Data peserta "${editPartName.trim()}" berhasil diperbarui.`, 'success');
    setEditingPart(null);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    onAddGroup({
      name: newGroupName.trim(),
      description: ''
    });
    showToast(`Grup/Kelas "${newGroupName.trim()}" berhasil ditambahkan.`, 'success');
    setNewGroupName('');
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingGroupId(id);
    setEditingGroupName(currentName);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingGroupName.trim()) return;
    onUpdateGroup(id, { name: editingGroupName.trim() });
    showToast(`Nama kelas berhasil diubah menjadi "${editingGroupName.trim()}".`, 'success');
    setEditingGroupId(null);
  };

  const handleDeleteSelectedGroups = () => {
    if (selectedGroupIds.length === 0) return;
    setDeleteGroupModal({
      type: 'bulk',
      ids: [...selectedGroupIds],
      count: selectedGroupIds.length
    });
  };

  const handleDeleteSingleGroup = (g: Group) => {
    setDeleteGroupModal({
      type: 'single',
      group: g
    });
  };

  const handleConfirmDeleteGroup = () => {
    if (!deleteGroupModal) return;

    if (deleteGroupModal.type === 'single' && deleteGroupModal.group) {
      const g = deleteGroupModal.group;
      onDeleteGroup(g.id);
      setSelectedGroupIds(prev => prev.filter(id => id !== g.id));
      showToast(`Grup/Kelas "${g.name}" berhasil dihapus.`, 'success');
    } else if (deleteGroupModal.type === 'bulk' && deleteGroupModal.ids) {
      const ids = deleteGroupModal.ids;
      onDeleteGroupsBulk(ids);
      setSelectedGroupIds([]);
      showToast(`Berhasil menghapus ${ids.length} grup/kelas terpilih.`, 'success');
    }

    setDeleteGroupModal(null);
  };

  const handleGenerateSchoolClasses = () => {
    const list: Omit<Group, 'id'>[] = [];
    const letterX = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    const letterXI = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const letterXII = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

    const existingNames = new Set(groups.map(g => g.name.toLowerCase().trim()));

    letterX.forEach(l => {
      const name = `Kelas X-${l}`;
      if (!existingNames.has(name.toLowerCase())) {
        list.push({ name, description: `Kelas Sepuluh Kelompok ${l}` });
      }
    });
    letterXI.forEach(l => {
      const name = `Kelas XI-${l}`;
      if (!existingNames.has(name.toLowerCase())) {
        list.push({ name, description: `Kelas Sebelas Kelompok ${l}` });
      }
    });
    letterXII.forEach(l => {
      const name = `Kelas XII-${l}`;
      if (!existingNames.has(name.toLowerCase())) {
        list.push({ name, description: `Kelas Dua Belas Kelompok ${l}` });
      }
    });

    if (list.length === 0) {
      showToast('Semua 30 kelas standar sekolah sudah ada di daftar grup.', 'info');
      return;
    }

    setGenerateClassesList(list);
  };

  const handleConfirmGenerateClasses = () => {
    if (!generateClassesList || generateClassesList.length === 0) return;

    if (onAddGroupsBulk) {
      onAddGroupsBulk(generateClassesList);
    } else {
      generateClassesList.forEach(g => onAddGroup(g));
    }

    showToast(`Berhasil membuat ${generateClassesList.length} kelas sekolah standar baru!`, 'success');
    setGenerateClassesList(null);
  };

  const handleCreateParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim() || !newPartUser.trim() || !newPartPass.trim()) return;
    onAddParticipant({
      name: newPartName,
      username: newPartUser,
      passwordHash: newPartPass,
      groupId: newPartGroup || groups[0]?.id || '',
      examCardNo: newPartCard || 'CARD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      isLoggedIn: false
    });
    setNewPartName('');
    setNewPartUser('');
    setNewPartPass('');
    setNewPartCard('');
  };

  const handleExecuteBulkImport = () => {
    if (parsedPreviewRows.length === 0) {
      showToast('Belum ada data siswa yang dibaca. Silakan pilih file Excel atau tempelkan data tabel kolom terlebih dahulu.', 'error');
      return;
    }

    const validRows = parsedPreviewRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      showToast('Tidak ada data siswa valid untuk diimpor. Pastikan kolom Nama, Username, dan Password terisi pada setiap baris.', 'error');
      return;
    }

    // 1. If there are new groups detected and autoCreateNewGroups is true, create them
    if (autoCreateNewGroups && detectedNewGroupNames.length > 0) {
      const groupsToCreate = detectedNewGroupNames.map(name => ({
        name,
        description: `Dibuat otomatis dari import Excel`
      }));
      if (onAddGroupsBulk) {
        onAddGroupsBulk(groupsToCreate);
      } else {
        groupsToCreate.forEach(g => onAddGroup(g));
      }
    }

    // 2. Prepare participants to insert
    const participantsToInsert: Omit<Participant, 'id'>[] = validRows.map(row => {
      let gId = row.groupId;
      if (row.isNewGroup) {
        const matched = groups.find(g => g.name.toLowerCase().trim() === row.groupName.toLowerCase().trim());
        if (matched) {
          gId = matched.id;
        }
      }
      return {
        name: row.name,
        username: row.username,
        passwordHash: row.passwordHash,
        groupId: gId || importGroup || groups[0]?.id || '',
        examCardNo: row.examCardNo || 'CARD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        isLoggedIn: false
      };
    });

    onBulkImportParticipants(participantsToInsert);
    setImportStatus('success');
    setImportSuccessMsg(`Berhasil mengimpor ${participantsToInsert.length} siswa ke dalam daftar peserta!`);
    
    // Clear states
    setSelectedFile(null);
    setPastedExcelText('');
    setParsedPreviewRows([]);
    setDetectedNewGroupNames([]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setTimeout(() => {
      setImportStatus('idle');
      setImportSuccessMsg('');
    }, 6000);
  };

  const downloadSampleExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Nama Lengkap Siswa', 'Username / NIS', 'Sandi / Password', 'Grup / Kelas', 'No Kartu Ujian (Opsional)'],
      ['Ahmad Fauzi', '242510001', 'pass123', 'Kelas X-A', 'CARD-001'],
      ['Siti Nurhaliza', '242510002', 'pass456', 'Kelas X-A', 'CARD-002'],
      ['Budi Pratama', '242510003', 'budi789', 'Kelas X-B', 'CARD-003'],
      ['Dewi Sartika', '242510004', 'dewi999', 'Kelas XI-A', ''],
      ['Rian Saputra', '242510005', 'rian123', 'Kelas XII-A', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto fit column widths
    ws['!cols'] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 25 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Siswa');
    XLSX.writeFile(wb, 'Format_Import_Siswa_Kolom_Excel.xlsx');
  };

  const renderBulkExcelImportUI = () => {
    const validCount = parsedPreviewRows.filter(r => r.isValid && !isLikelyNisOrNumber(r.name)).length;
    const invalidCount = parsedPreviewRows.length - validCount;

    return (
      <div className="space-y-6">
        {/* Header and Download Sample Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/70 p-4 rounded-xl border border-indigo-100">
          <div>
            <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
              Input Masal Peserta dengan Format Kolom Excel
            </h3>
            <p className="text-xs text-indigo-700/80 mt-0.5">
              Unggah file Excel (.xlsx, .xls, .csv) atau salin (copy-paste) kolom langsung dari Microsoft Excel / Google Sheets.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadSampleExcel}
            className="px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <Download className="h-4 w-4 text-indigo-600" />
            <span>Download Format Excel</span>
          </button>
        </div>

        {/* Input Methods Switcher */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setBulkInputMethod('file')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  bulkInputMethod === 'file'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Metode 1: Unggah File Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkInputMethod('paste')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  bulkInputMethod === 'paste'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>Metode 2: Salin & Tempel (Copy-Paste Kolom)</span>
              </button>
            </div>

            {bulkInputMethod === 'file' ? (
              <div className="bg-slate-50 p-5 rounded-xl border border-dashed border-indigo-200 hover:border-indigo-400 transition-all text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                  id="excelFileInput"
                />
                <label htmlFor="excelFileInput" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-indigo-100/60 rounded-full text-indigo-600">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-700 hover:underline">
                      {selectedFile ? selectedFile.name : 'Klik untuk memilih file Excel (.xlsx / .xls / .csv)'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Mendukung file Microsoft Excel 2007+, Google Sheets Export, dan CSV.
                    </p>
                  </div>
                </label>
                {selectedFile && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold border border-indigo-100">
                      Ukuran: {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Tempelkan (Ctrl+V) Baris dan Kolom dari Excel / Spreadsheet di sini:
                </label>
                <textarea
                  rows={4}
                  value={pastedExcelText}
                  onChange={(e) => handlePastedTextChange(e.target.value)}
                  placeholder={`Contoh isi (Kolom dipisahkan Tab atau Koma):\nAndi Saputra\t242510001\tpass123\tKelas X-A\tCARD-001\nMaria Caroline\t242510002\tpass456\tKelas X-A\tCARD-002\nBudi Santoso\t242510003\tbudi789\tKelas X-B\tCARD-003`}
                  className="w-full font-mono text-xs p-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-500">
                  Tip: Cukup blok baris data di Excel Anda, tekan <strong>Ctrl + C</strong>, lalu klik di kotak atas dan tekan <strong>Ctrl + V</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Group & Settings Panel */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Pengaturan Impor</h4>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Grup / Kelas Bawaan (Default):</label>
              <select
                value={importGroup}
                onChange={(e) => {
                  setImportGroup(e.target.value);
                  if (selectedFile) handleFileChange(selectedFile);
                  else if (pastedExcelText) handlePastedTextChange(pastedExcelText);
                }}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-indigo-500 font-medium text-slate-700 cursor-pointer"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                Digunakan jika baris siswa di Excel tidak memiliki kolom nama kelas.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/80">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateNewGroups}
                  onChange={(e) => setAutoCreateNewGroups(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium leading-tight">
                  Otomatis buat kelas/grup baru jika nama kelas di Excel belum ada di sistem.
                </span>
              </label>
            </div>

            {detectedNewGroupNames.length > 0 && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  {detectedNewGroupNames.length} Kelas Baru Terdeteksi:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {detectedNewGroupNames.map((gn, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white border border-amber-200 rounded text-[10px] font-semibold text-amber-800">
                      {gn}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mapping Controls Box - Visible when data is uploaded or pasted */}
        {rawRowsData.length > 0 && columnSamples.length > 0 && (
          <div className="bg-white p-4 rounded-xl border-2 border-indigo-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Settings2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Pengaturan Pemetaan Kolom Data Siswa
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pastikan Kolom Nama Siswa terisi nama lengkap siswa, bukan nomor NIS.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={hasHeaderRow}
                    onChange={(e) => handleColumnMappingChange('hasHeader', e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Baris 1 Judul Kolom (Header)</span>
                </label>

                <button
                  type="button"
                  onClick={handleSwapNameAndUserColumns}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Klik jika kolom Nama dan NIS tertukar posisinya"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 text-amber-700" />
                  <span>Tukar Kolom Nama &amp; NIS</span>
                </button>
              </div>
            </div>

            {/* Column selector dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Kolom Nama Siswa */}
              <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-200 space-y-1">
                <label className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                  <span>1. Nama Lengkap Siswa:</span>
                  <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">Wajib Nama</span>
                </label>
                <select
                  value={nameColIdx}
                  onChange={(e) => handleColumnMappingChange('name', e.target.value)}
                  className="w-full text-xs font-semibold p-1.5 border border-indigo-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                >
                  {columnSamples.map(col => (
                    <option key={col.colIdx} value={col.colIdx}>
                      {col.headerName} {col.sampleVal ? `("${col.sampleVal.slice(0, 18)}")` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-indigo-700/80 leading-tight">
                  Harus berisi nama siswa, jangan nomor NIS.
                </p>
              </div>

              {/* Kolom Username / NIS */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                  <span>2. Username / NIS Siswa:</span>
                  <span className="text-[9px] bg-slate-700 text-white px-1.5 py-0.2 rounded font-bold">Wajib NIS</span>
                </label>
                <select
                  value={userColIdx}
                  onChange={(e) => handleColumnMappingChange('user', e.target.value)}
                  className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                >
                  {columnSamples.map(col => (
                    <option key={col.colIdx} value={col.colIdx}>
                      {col.headerName} {col.sampleVal ? `("${col.sampleVal.slice(0, 18)}")` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Nomor Induk Siswa / Username unik login.
                </p>
              </div>

              {/* Kolom Sandi / Password */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-800 block">
                  3. Sandi / Password:
                </label>
                <select
                  value={passColIdx}
                  onChange={(e) => handleColumnMappingChange('pass', e.target.value)}
                  className="w-full text-xs font-medium p-1.5 border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                >
                  <option value={-1}>-- Otomatis (Default Sandi) --</option>
                  {columnSamples.map(col => (
                    <option key={col.colIdx} value={col.colIdx}>
                      {col.headerName} {col.sampleVal ? `("${col.sampleVal.slice(0, 15)}")` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Kata sandi peserta untuk login.
                </p>
              </div>

              {/* Kolom Grup / Kelas */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-800 block">
                  4. Grup / Kelas:
                </label>
                <select
                  value={groupColIdx}
                  onChange={(e) => handleColumnMappingChange('group', e.target.value)}
                  className="w-full text-xs font-medium p-1.5 border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                >
                  <option value={-1}>-- Ikuti Pengaturan Default --</option>
                  {columnSamples.map(col => (
                    <option key={col.colIdx} value={col.colIdx}>
                      {col.headerName} {col.sampleVal ? `("${col.sampleVal.slice(0, 15)}")` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Nama rombel/kelas (Opsional).
                </p>
              </div>

              {/* Kolom No Kartu Ujian */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-800 block">
                  5. No Kartu Ujian:
                </label>
                <select
                  value={cardColIdx}
                  onChange={(e) => handleColumnMappingChange('card', e.target.value)}
                  className="w-full text-xs font-medium p-1.5 border border-slate-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                >
                  <option value={-1}>-- Samakan dengan NIS / Otomatis --</option>
                  {columnSamples.map(col => (
                    <option key={col.colIdx} value={col.colIdx}>
                      {col.headerName} {col.sampleVal ? `("${col.sampleVal.slice(0, 15)}")` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Nomor peserta pada kartu ujian.
                </p>
              </div>
            </div>

            {autoDetectionNotice && (
              <div className="flex items-center gap-2 text-[11px] text-indigo-700 font-medium bg-indigo-50/70 px-3 py-1.5 rounded-lg border border-indigo-100">
                <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>Status Pemetaan: {autoDetectionNotice}</span>
              </div>
            )}
          </div>
        )}

        {/* Column Structure Information Box */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs text-slate-600">
          <span className="font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
            Panduan Struktur 5 Kolom Excel:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="font-bold text-indigo-700 block">Kolom 1 / A:</span>
              <span className="font-semibold text-slate-800">Nama Lengkap</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Nama siswa peserta</p>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="font-bold text-indigo-700 block">Kolom 2 / B:</span>
              <span className="font-semibold text-slate-800">Username / NIS</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Username login unik</p>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="font-bold text-indigo-700 block">Kolom 3 / C:</span>
              <span className="font-semibold text-slate-800">Password / Sandi</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Kata sandi peserta</p>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="font-bold text-indigo-700 block">Kolom 4 / D (Opsional):</span>
              <span className="font-semibold text-slate-800">Grup / Kelas</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Contoh: Kelas X-A</p>
            </div>
            <div className="bg-white p-2 rounded border border-slate-200">
              <span className="font-bold text-indigo-700 block">Kolom 5 / E (Opsional):</span>
              <span className="font-semibold text-slate-800">No Kartu Ujian</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Otomatis jika kosong</p>
            </div>
          </div>
        </div>

        {/* Live Preview Table of Parsed Columns */}
        {parsedPreviewRows.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Pratinjau Hasil Pembacaan Kolom ({parsedPreviewRows.length} Baris Terbaca)
                </h4>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-bold">
                  {validCount} Siap Impor
                </span>
                {invalidCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-bold">
                    {invalidCount} Perlu Perbaikan
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setParsedPreviewRows([]);
                    setSelectedFile(null);
                    setPastedExcelText('');
                    setRawRowsData([]);
                    setColumnSamples([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                >
                  Reset / Bersihkan
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkImport}
                  disabled={validCount === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Simpan &amp; Daftarkan {validCount} Siswa Sekarang</span>
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">No</th>
                    <th className="px-3 py-2.5 min-w-[200px]">
                      <div className="flex items-center justify-between">
                        <span>Nama Siswa (Kolom {String.fromCharCode(65 + nameColIdx)})</span>
                        <span className="text-[9px] font-bold text-indigo-700 normal-case bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">Wajib Nama</span>
                      </div>
                    </th>
                    <th className="px-3 py-2.5 min-w-[150px]">
                      <div className="flex items-center justify-between">
                        <span>Username / NIS (Kolom {String.fromCharCode(65 + userColIdx)})</span>
                        <span className="text-[9px] font-bold text-slate-600 normal-case bg-slate-200 px-1.5 py-0.5 rounded">Wajib NIS</span>
                      </div>
                    </th>
                    <th className="px-3 py-2.5 min-w-[120px]">Sandi / Password</th>
                    <th className="px-3 py-2.5 min-w-[120px]">Grup / Kelas</th>
                    <th className="px-3 py-2.5 min-w-[120px]">No Kartu</th>
                    <th className="px-3 py-2.5 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedPreviewRows.map((row, idx) => {
                    const isNameNumeric = isLikelyNisOrNumber(row.name);
                    return (
                      <tr key={idx} className={`hover:bg-slate-50/60 ${!row.isValid || isNameNumeric ? 'bg-red-50/40' : ''}`}>
                        <td className="px-3 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleUpdatePreviewCell(idx, 'name', e.target.value)}
                            placeholder="Nama Siswa"
                            className={`w-full px-2.5 py-1 text-xs font-semibold rounded border transition-all ${
                              isNameNumeric || !row.name
                                ? 'border-red-400 bg-red-50 text-red-800 ring-1 ring-red-400'
                                : 'border-slate-200 text-slate-900 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                            }`}
                          />
                          {isNameNumeric && (
                            <span className="text-[10px] font-bold text-red-600 block mt-0.5">
                              ⚠️ Terisi NIS! Klik tombol &apos;Tukar Kolom Nama &amp; NIS&apos; di atas.
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.username}
                            onChange={(e) => handleUpdatePreviewCell(idx, 'username', e.target.value)}
                            placeholder="NIS / Username"
                            className="w-full px-2.5 py-1 text-xs font-mono font-medium rounded border border-slate-200 text-indigo-700 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.passwordHash}
                            onChange={(e) => handleUpdatePreviewCell(idx, 'passwordHash', e.target.value)}
                            placeholder="Password"
                            className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200 text-emerald-700 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.groupName}
                            onChange={(e) => handleUpdatePreviewCell(idx, 'groupName', e.target.value)}
                            placeholder="Grup / Kelas"
                            className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 text-slate-700 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.examCardNo}
                            onChange={(e) => handleUpdatePreviewCell(idx, 'examCardNo', e.target.value)}
                            placeholder="No Kartu"
                            className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200 text-slate-600 bg-white hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.isValid && !isNameNumeric ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] inline-flex items-center gap-1">
                              <Check className="h-3 w-3" /> Siap
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px] inline-flex items-center gap-1" title={row.errorMsg || 'Kolom nama siswa tidak boleh berisi nomor NIS'}>
                              <AlertCircle className="h-3 w-3" /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {importStatus === 'success' && (
          <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{importSuccessMsg || 'Data peserta berhasil diimpor ke sistem!'}</span>
          </div>
        )}
      </div>
    );
  };

  const printCards = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const cardsHtml = participants.map(p => {
      const gName = groups.find(g => g.id === p.groupId)?.name || '-';
      return `
        <div style="border: 2px dashed #4f46e5; border-radius: 8px; padding: 16px; margin: 10px; width: 300px; display: inline-block; font-family: sans-serif; background-color: #fafafa;">
          <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 8px; margin-bottom: 12px; font-weight: bold; color: #4f46e5; text-align: center;">
            KARTU PESERTA UJIAN ONLINE
          </div>
          <table style="width: 100%; font-size: 13px;">
            <tr><td style="font-weight: bold; width: 35%;">No Peserta:</td><td>${p.examCardNo}</td></tr>
            <tr><td style="font-weight: bold;">Nama:</td><td>${p.name}</td></tr>
            <tr><td style="font-weight: bold;">Grup/Kelas:</td><td>${gName}</td></tr>
            <tr><td style="font-weight: bold;">Username:</td><td style="font-family: monospace; background: #e0e7ff; padding: 2px 4px; border-radius: 4px;">${p.username}</td></tr>
            <tr><td style="font-weight: bold;">Password:</td><td style="font-family: monospace; background: #e0e7ff; padding: 2px 4px; border-radius: 4px;">${p.passwordHash}</td></tr>
          </table>
          <div style="margin-top: 12px; font-size: 10px; text-align: center; color: #666;">
            Sistem Ujian CBT Online &bull; Jaga kerahasiaan password Anda.
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head><title>Cetak Kartu Ujian</title></head>
        <body onload="window.print()">
          <div style="display: flex; flex-wrap: wrap; justify-content: center;">
            ${cardsHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Render sub menus
  const renderContent = () => {
    switch (activeSubMenu) {
      case 'daftar_group': {
        const filteredGroups = groups.filter(g =>
          g.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
        );

        const handleSelectAllGroups = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.checked) {
            setSelectedGroupIds(filteredGroups.map(g => g.id));
          } else {
            setSelectedGroupIds([]);
          }
        };

        const handleSelectGroup = (id: string) => {
          if (selectedGroupIds.includes(id)) {
            setSelectedGroupIds(selectedGroupIds.filter(gid => gid !== id));
          } else {
            setSelectedGroupIds([...selectedGroupIds, id]);
          }
        };

        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-indigo-600" />
                Kelola Grup & Kelas
              </h2>
              <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1 flex-1 w-full">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Nama Group / Kelas</label>
                  <input
                    type="text"
                    placeholder="Contoh: XII IPA 1"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto h-10"
                >
                  <Plus className="h-4 w-4" /> Tambah Grup
                </button>
              </form>

              {/* Quick Generator Box */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100/60 p-4 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                    🏫 Tambah Otomatis Daftar Kelas Sekolah
                  </h4>
                  <p className="text-xs text-indigo-700 mt-0.5 font-medium leading-relaxed">
                    Belum memiliki daftar kelas? Anda dapat membuat otomatis 30 kelas standar baru:<br/>
                    <strong>Kelas X-A s/d X-K</strong>, <strong>Kelas XI-A s/d XI-J</strong>, dan <strong>Kelas XII-A s/d XII-I</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSchoolClasses}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow shrink-0 h-9"
                >
                  <Plus className="h-3.5 w-3.5" /> Buat 30 Kelas Otomatis
                </button>
              </div>

              <div className="mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-slate-700">Daftar Grup ({filteredGroups.length})</h3>
                    {selectedGroupIds.length > 0 && (
                      <button
                        onClick={handleDeleteSelectedGroups}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Hapus Grup Terpilih"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus Terpilih ({selectedGroupIds.length})</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari grup..."
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-48 focus:ring-1 focus:ring-indigo-500"
                    />
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-lg">
                  <table className="w-full border-collapse text-left text-sm text-slate-500">
                    <thead className="bg-slate-50 text-xs text-slate-700 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={filteredGroups.length > 0 && selectedGroupIds.length === filteredGroups.length}
                            onChange={handleSelectAllGroups}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-3">Nama Group / Kelas</th>
                        <th className="px-6 py-3 w-40">Jumlah Siswa</th>
                        <th className="px-6 py-3 w-28 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredGroups.map(g => {
                        const count = participants.filter(p => p.groupId === g.id).length;
                        const isSelected = selectedGroupIds.includes(g.id);
                        const isEditing = editingGroupId === g.id;

                        return (
                          <tr key={g.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/20' : ''}`}>
                            <td className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectGroup(g.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                              />
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {isEditing ? (
                                <div className="flex items-center gap-2 max-w-sm">
                                  <input
                                    type="text"
                                    value={editingGroupName}
                                    onChange={(e) => setEditingGroupName(e.target.value)}
                                    className="w-full px-3 py-1 border border-indigo-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveEdit(g.id);
                                      } else if (e.key === 'Escape') {
                                        setEditingGroupId(null);
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(g.id)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-all cursor-pointer"
                                    title="Simpan"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingGroupId(null)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                                    title="Batal"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilterGroupId(g.id);
                                    onChangeMenu?.('data_peserta', 'daftar_peserta');
                                  }}
                                  className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline transition-all cursor-pointer text-left"
                                >
                                  {g.name}
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterGroupId(g.id);
                                  onChangeMenu?.('data_peserta', 'daftar_peserta');
                                }}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-full font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1 border border-indigo-100/60 shadow-sm"
                              >
                                {count} Siswa
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!isEditing && (
                                  <>
                                    <button
                                      onClick={() => handleStartEdit(g.id, g.name)}
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                      title="Edit Nama Grup"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSingleGroup(g)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                      title="Hapus Grup"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'daftar_peserta': {
        const lockedCount = participants.filter(p => p.isLocked).length;
        const activeCount = participants.filter(p => p.isLoggedIn && !p.isLocked).length;
        const offlineCount = participants.filter(p => !p.isLoggedIn && !p.isLocked).length;

        const filteredParts = participants.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.examCardNo.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesGroup = filterGroupId === 'all' || p.groupId === filterGroupId;
          const matchesStatus = 
            participantStatusFilter === 'all' ? true :
            participantStatusFilter === 'locked' ? p.isLocked :
            participantStatusFilter === 'active' ? (p.isLoggedIn && !p.isLocked) :
            (!p.isLoggedIn && !p.isLocked);
          return matchesSearch && matchesGroup && matchesStatus;
        });

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              {/* Mode Switcher: Single vs Bulk Excel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setParticipantInputMode('single')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      participantInputMode === 'single'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Pendaftaran Siswa Tunggal (1 Siswa)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticipantInputMode('bulk_excel')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      participantInputMode === 'bulk_excel'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                    <span>Input Masal (Format Excel & Kolom)</span>
                  </button>
                </div>

                {participantInputMode === 'single' && (
                  <button
                    type="button"
                    onClick={downloadSampleExcel}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold hover:underline flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Format Excel Siswa</span>
                  </button>
                )}
              </div>

              {/* Render chosen input form */}
              {participantInputMode === 'single' ? (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <UserPlus className="h-4 w-4 text-indigo-600" />
                    Formulir Tambah 1 Peserta
                  </h3>
                  <form onSubmit={handleCreateParticipant} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Nama Peserta</label>
                      <input
                        type="text"
                        placeholder="Nama Lengkap"
                        required
                        value={newPartName}
                        onChange={(e) => setNewPartName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Username</label>
                      <input
                        type="text"
                        placeholder="Username login"
                        required
                        value={newPartUser}
                        onChange={(e) => setNewPartUser(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
                      <input
                        type="text"
                        placeholder="Password"
                        required
                        value={newPartPass}
                        onChange={(e) => setNewPartPass(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Grup / Kelas</label>
                      <select
                        value={newPartGroup}
                        onChange={(e) => setNewPartGroup(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-indigo-500"
                      >
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">No. Kartu Ujian (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Acak jika kosong"
                        value={newPartCard}
                        onChange={(e) => setNewPartCard(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      />
                    </div>
                    <div className="lg:col-span-5 flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all"
                      >
                        <Plus className="h-4 w-4" /> Daftarkan Peserta
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                renderBulkExcelImportUI()
              )}

              {/* Participant Table Section */}
              <div className="mt-10 pt-6 border-t border-slate-100">
                {/* PANEL UTAMA TOMBOL RISET PESERTA & SESI LOGIN */}
                <div className="mb-5 bg-gradient-to-r from-amber-50 via-slate-50 to-indigo-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                        <RefreshCw className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                            <span>TOMBOL RISET PESERTA & SESI LOGIN</span>
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300">
                            Aktif & Langsung Terhubung
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                            Multi-Device (HP & Laptop)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Klik tombol di bawah ini atau tombol di samping setiap nama siswa untuk membebaskan sesi login jika siswa ganti HP atau Laptop.
                        </p>
                      </div>
                    </div>

                    {/* Direct Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 lg:pt-0">
                      <button
                        type="button"
                        onClick={() => {
                          const activeIds = participants.filter(p => p.isLoggedIn).map(p => p.id);
                          if (activeIds.length === 0) {
                            showToast('Tidak ada siswa yang sedang dalam sesi login aktif.', 'info');
                            return;
                          }
                          if (onResetParticipantsBulk) {
                            onResetParticipantsBulk(activeIds, false);
                          } else {
                            activeIds.forEach(id => onResetParticipantLogin(id, false));
                          }
                          showToast(`Berhasil meriset ${activeIds.length} sesi aktif! Siswa sekarang bisa login kembali di HP/Laptop.`, 'success');
                        }}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Putuskan semua sesi login siswa yang aktif"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Riset Semua Sesi Aktif ({activeCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const lockedIds = participants.filter(p => p.isLocked).map(p => p.id);
                          if (lockedIds.length === 0) {
                            showToast('Tidak ada siswa yang berstatus terkunci.', 'info');
                            return;
                          }
                          if (onResetAllLockedParticipants) {
                            onResetAllLockedParticipants(false);
                          } else if (onResetParticipantsBulk) {
                            onResetParticipantsBulk(lockedIds, false);
                          } else {
                            lockedIds.forEach(id => onResetParticipantLogin(id, false));
                          }
                          showToast(`Berhasil membuka kunci & meriset ${lockedIds.length} siswa terkunci!`, 'success');
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        title="Buka kunci anti-curang untuk semua siswa yang terkunci"
                      >
                        <Unlock className="h-4 w-4" />
                        <span>Buka Kunci Semua ({lockedCount})</span>
                      </button>

                      {onChangeMenu && (
                        <button
                          type="button"
                          onClick={() => onChangeMenu('peserta', 'reset_login')}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Buka Menu Pusat Riset Login Lengkap"
                        >
                          <ShieldCheck className="h-4 w-4 text-amber-400" />
                          <span>Pusat Riset Login &rarr;</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Quick Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 mr-1">Status Akun:</span>
                  <button
                    type="button"
                    onClick={() => setParticipantStatusFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      participantStatusFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>Semua Siswa</span>
                    <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[11px]">{participants.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParticipantStatusFilter('locked')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      participantStatusFilter === 'locked'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/60'
                    }`}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>🚨 Terkunci</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-black ${participantStatusFilter === 'locked' ? 'bg-white/20' : 'bg-red-200 text-red-900'}`}>{lockedCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParticipantStatusFilter('active')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      participantStatusFilter === 'active'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60'
                    }`}
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Sesi Aktif</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-black ${participantStatusFilter === 'active' ? 'bg-white/20' : 'bg-amber-200 text-amber-900'}`}>{activeCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParticipantStatusFilter('offline')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      participantStatusFilter === 'offline'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60'
                    }`}
                  >
                    <span>Offline / Bebas</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-black ${participantStatusFilter === 'offline' ? 'bg-white/20' : 'bg-emerald-200 text-emerald-900'}`}>{offlineCount}</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-800">
                      Daftar Peserta <span className="text-indigo-600">({filteredParts.length} Siswa)</span>
                    </h3>
                    
                    {/* Bulk action bar */}
                    {selectedPartIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 animate-in fade-in">
                        <span className="text-xs font-bold text-indigo-900">
                          {selectedPartIds.length} Siswa Terpilih:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onResetParticipantsBulk(selectedPartIds, false);
                            showToast(`Berhasil mereset sesi login & membuka kunci untuk ${selectedPartIds.length} siswa!`, 'success');
                            setSelectedPartIds([]);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Reset Sesi & Buka Kunci Siswa Terpilih"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          <span>Reset / Buka Kunci ({selectedPartIds.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteSelectedParticipants}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Hapus Masal Peserta Terpilih"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus ({selectedPartIds.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPartIds([])}
                          className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer ml-1"
                        >
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Select Dropdown to filter by Group/Class */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Kelas:</span>
                      <select
                        value={filterGroupId}
                        onChange={(e) => {
                          setFilterGroupId(e.target.value);
                          setSelectedPartIds([]); // reset selection when filter changes
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-slate-700 cursor-pointer"
                      >
                        <option value="all">Semua Kelas / Grup ({participants.length})</option>
                        {groups.map(g => {
                          const c = participants.filter(p => p.groupId === g.id).length;
                          return (
                            <option key={g.id} value={g.id}>{g.name} ({c} Siswa)</option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Cari nama, nomor kartu, username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                      />
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-xs">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="bg-slate-50 text-xs text-slate-700 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3.5 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={filteredParts.length > 0 && filteredParts.every(p => selectedPartIds.includes(p.id))}
                            onChange={(e) => handleSelectAllParticipants(filteredParts, e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                            title="Pilih Semua Siswa"
                          />
                        </th>
                        <th className="px-5 py-3.5">No Kartu</th>
                        <th className="px-5 py-3.5">Nama Lengkap</th>
                        <th className="px-5 py-3.5">Grup / Kelas</th>
                        <th className="px-5 py-3.5">Akses Akun (User / Pass)</th>
                        <th className="px-5 py-3.5">Status Sesi</th>
                        <th className="px-5 py-3.5 text-center min-w-[260px]">Aksi (Reset / Edit / Hapus)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredParts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-xs font-medium">
                            Tidak ada data siswa yang cocok dengan kriteria pencarian/filter.
                          </td>
                        </tr>
                      ) : (
                        filteredParts.map(p => {
                          const gName = groups.find(g => g.id === p.groupId)?.name || '-';
                          const isSelected = selectedPartIds.includes(p.id);
                          return (
                            <tr key={p.id} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-indigo-50/25' : ''}`}>
                              <td className="px-4 py-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSelectParticipant(p.id)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-5 py-3.5 font-mono text-xs text-slate-600 font-semibold">{p.examCardNo}</td>
                              <td className="px-5 py-3.5">
                                <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onResetParticipantLogin(p.id, false);
                                      showToast(`Tombol Riset Berhasil: Akun ${p.name} berhasil di-reset! Siswa dapat langsung login di HP / Laptop.`, 'success');
                                    }}
                                    className={`px-2.5 py-1 text-xs font-black rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs ${
                                      p.isLocked
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : p.isLoggedIn
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    }`}
                                    title="Klik untuk meriset login siswa ini agar langsung bisa masuk di HP atau Laptop"
                                  >
                                    {p.isLocked ? (
                                      <>
                                        <Unlock className="h-3.5 w-3.5" />
                                        <span>Tombol Riset (Buka Kunci)</span>
                                      </>
                                    ) : p.isLoggedIn ? (
                                      <>
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        <span>Tombol Riset Sesi</span>
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Tombol Riset Login</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">
                                  {gName}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 font-mono text-xs">
                                <span className="bg-indigo-50 px-2 py-1 rounded text-indigo-700 mr-2 font-semibold">{p.username}</span>
                                <span className="bg-emerald-50 px-2 py-1 rounded text-emerald-700 font-semibold">{p.passwordHash}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                {p.isLocked ? (
                                  <div className="space-y-1.5">
                                    <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 rounded-full text-xs font-black flex items-center gap-1.5 w-max">
                                      <ShieldAlert className="h-3.5 w-3.5 text-red-600 animate-pulse" /> Terkunci (Pelanggaran)
                                    </span>
                                    <span className="text-[10px] text-red-600 font-semibold block truncate max-w-[160px]" title={p.lockedReason}>
                                      {p.lockedReason || 'Keluar dari aplikasi ujian'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onResetParticipantLogin(p.id, false);
                                        showToast(`Akun ${p.name} berhasil dibuka kuncinya! Siswa dapat login kembali.`, 'success');
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                    >
                                      <Unlock className="h-3.5 w-3.5" /> Buka Kunci Siswa
                                    </button>
                                  </div>
                                ) : p.isLoggedIn ? (
                                  <div className="space-y-1.5">
                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1 w-max">
                                      <RefreshCw className="h-3 w-3 animate-spin" /> Login Aktif
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onResetParticipantLogin(p.id, false);
                                        showToast(`Sesi login ${p.name} berhasil di-reset. Siswa dapat login kembali.`, 'success');
                                      }}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" /> Riset Sesi Siswa
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium w-max inline-block">
                                      Offline / Siap
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onResetParticipantLogin(p.id, false);
                                        showToast(`Akun ${p.name} berhasil di-reset ke status siap login.`, 'success');
                                      }}
                                      className="px-2 py-0.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                    >
                                      <RefreshCw className="h-3 w-3 text-sky-600" /> Riset Login
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {p.isLocked ? (
                                    <>
                                      {/* Buka Kunci Siswa */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onResetParticipantLogin(p.id, false);
                                          showToast(`Akun ${p.name} berhasil dibuka kuncinya! Siswa dapat login kembali.`, 'success');
                                        }}
                                        className="px-3 py-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                        title="Buka Kunci Siswa (Lanjut Sisa Waktu & Jawaban)"
                                      >
                                        <Unlock className="h-3.5 w-3.5" />
                                        <span>Tombol Riset (Buka Kunci)</span>
                                      </button>
                                      {/* Riset Total */}
                                      <button
                                        type="button"
                                        onClick={() => setConfirmAttemptResetModal({ id: p.id, name: p.name })}
                                        className="px-2 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                        title="Riset Total Pengerjaan Ujian (Ulang dari Awal)"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Riset Total</span>
                                      </button>
                                    </>
                                  ) : p.isLoggedIn ? (
                                    <>
                                      {/* Reset Sesi Login */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onResetParticipantLogin(p.id, false);
                                          showToast(`Sesi login ${p.name} berhasil di-reset. Siswa dapat login kembali.`, 'success');
                                        }}
                                        className="px-3 py-1.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                        title="Reset / Putuskan Sesi Login Siswa"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        <span>Tombol Riset Sesi</span>
                                      </button>
                                      {/* Riset Total */}
                                      <button
                                        type="button"
                                        onClick={() => setConfirmAttemptResetModal({ id: p.id, name: p.name })}
                                        className="px-2 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                        title="Riset Total Pengerjaan Ujian (Ulang dari Awal)"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Riset Total</span>
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {/* Tombol Reset Login Siswa Offline */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onResetParticipantLogin(p.id, false);
                                          showToast(`Akun ${p.name} berhasil di-reset ke status siap login.`, 'success');
                                        }}
                                        className="px-2.5 py-1.5 text-xs font-black bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg border border-sky-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                                        title="Reset Status Akun & Bebaskan Login"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5 text-sky-600" />
                                        <span>Tombol Riset Login</span>
                                      </button>
                                      {/* Riset Total Ujian */}
                                      <button
                                        type="button"
                                        onClick={() => setConfirmAttemptResetModal({ id: p.id, name: p.name })}
                                        className="px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                        title="Riset Total Pengerjaan Ujian (Ulang dari Awal)"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Riset Ujian</span>
                                      </button>
                                    </>
                                  )}

                                  {/* Edit Student Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(p)}
                                    className="px-2.5 py-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200/60 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Edit Data Siswa"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    <span>Edit</span>
                                  </button>

                                  {/* Delete Student Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSingleParticipant(p)}
                                    className="px-2.5 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200/60 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Hapus Siswa Manual"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'import_data_peserta':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                Import Data Peserta Masal (Excel & Kolom)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Impor puluhan atau ratusan siswa sekaligus menggunakan file Excel atau salin-tempel (copy-paste) kolom data.
              </p>
            </div>

            {renderBulkExcelImportUI()}
          </div>
        );

      case 'cetak_kartu':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                  Cetak Kartu Login Peserta
                </h2>
                <p className="text-sm text-slate-500">
                  Cetak kartu ujian untuk dibagikan kepada peserta agar mereka mengetahui No Kartu, Username, dan Password ujian mereka.
                </p>
              </div>
              <button
                onClick={printCards}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-sm transition-all"
              >
                <Printer className="h-4 w-4" /> Cetak Semua Kartu ({participants.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {participants.map(p => {
                const gName = groups.find(g => g.id === p.groupId)?.name || '-';
                return (
                  <div key={p.id} className="border-2 border-dashed border-indigo-200 rounded-xl p-5 bg-slate-50/50 hover:bg-white transition-all shadow-sm">
                    <div className="border-b border-indigo-100 pb-3 mb-3 text-center">
                      <span className="font-bold text-xs uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                        Kartu Ujian CBT
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">No Kartu:</span>
                        <span className="font-mono font-semibold text-slate-800">{p.examCardNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nama:</span>
                        <span className="font-semibold text-slate-800">{p.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Grup/Kelas:</span>
                        <span className="font-semibold text-slate-800">{gName}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-slate-400">Username:</span>
                        <code className="bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-700 font-bold">{p.username}</code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Password:</span>
                        <code className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700 font-bold">{p.passwordHash}</code>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'reset_login': {
        const lockedList = participants.filter(p => p.isLocked);
        const activeList = participants.filter(p => p.isLoggedIn && !p.isLocked);
        const cleanCount = participants.filter(p => !p.isLoggedIn && !p.isLocked).length;

        // Filter participants based on active tab and search
        const displayedList = participants.filter(p => {
          // Tab filter
          if (resetFilterTab === 'locked' && !p.isLocked) return false;
          if (resetFilterTab === 'active' && (!p.isLoggedIn || p.isLocked)) return false;
          
          // Class/Group filter
          if (resetFilterGroupId !== 'all' && p.groupId !== resetFilterGroupId) return false;

          // Search term filter
          if (resetSearchTerm.trim()) {
            const term = resetSearchTerm.toLowerCase();
            const matchesName = p.name.toLowerCase().includes(term);
            const matchesUser = p.username.toLowerCase().includes(term);
            const matchesCard = p.examCardNo.toLowerCase().includes(term);
            if (!matchesName && !matchesUser && !matchesCard) return false;
          }

          return true;
        });

        const handleToggleSelectReset = (id: string) => {
          setSelectedResetIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
          );
        };

        const handleSelectAllReset = (checked: boolean) => {
          if (checked) {
            setSelectedResetIds(displayedList.map(p => p.id));
          } else {
            setSelectedResetIds([]);
          }
        };

        const handleExecuteUnlock = (id: string, name: string) => {
          onResetParticipantLogin(id, false);
          showToast(`Akun "${name}" berhasil dibuka kuncinya! Siswa dapat login kembali untuk melanjutkan ujian.`, 'success');
        };

        const handleExecuteTotalReset = (id: string, name: string) => {
          onResetParticipantLogin(id, true);
          showToast(`Data ujian "${name}" berhasil diriset total. Siswa akan memulai tes baru dari awal.`, 'success');
          setConfirmAttemptResetModal(null);
        };

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header Title Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 rounded-2xl p-6 text-white border border-slate-800 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-red-400 animate-pulse" /> Proteksi Kiosk Anti-Curang
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Pusat Pengawas CBT
                  </span>
                </div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-emerald-400" />
                  Reset Sesi Login & Buka Kunci Peserta
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Siswa yang terdeteksi berpindah tab, keluar fullscreen, atau membuka aplikasi lain akan <strong>otomatis dikeluarkan dan terkunci</strong>. Buka kunci atau riset sesi mereka di panel ini agar dapat kembali mengikuti ujian.
                </p>
              </div>

              {/* Instant Bulk Operations on Right */}
              <div className="flex flex-wrap gap-2">
                {lockedList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onResetAllLockedParticipants) {
                        onResetAllLockedParticipants(false);
                      } else {
                        lockedList.forEach(p => onResetParticipantLogin(p.id, false));
                      }
                      showToast(`Berhasil membuka kunci semua (${lockedList.length}) siswa terkunci!`, 'success');
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-400/40"
                  >
                    <Unlock className="h-4 w-4" />
                    <span>Buka Kunci Semua ({lockedList.length})</span>
                  </button>
                )}

                {activeList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      activeList.forEach(p => onResetParticipantLogin(p.id, false));
                      showToast(`Berhasil memutuskan semua (${activeList.length}) sesi login aktif!`, 'success');
                    }}
                    className="px-3.5 py-2.5 bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 border border-amber-400/40"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Reset Semua Sesi Aktif ({activeList.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div 
                onClick={() => setResetFilterTab('locked')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                  resetFilterTab === 'locked'
                    ? 'bg-red-50/90 border-red-300 ring-2 ring-red-500/20'
                    : 'bg-white border-slate-100 hover:border-red-200 hover:bg-red-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${lockedList.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Peserta Terkunci</span>
                      <strong className={`text-2xl font-black block mt-0.5 ${lockedList.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                        {lockedList.length} Siswa
                      </strong>
                    </div>
                  </div>
                  {lockedList.length > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-extrabold rounded-full">
                      Perlu Tindakan
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  {lockedList.length > 0 ? 'Terdeteksi membuka aplikasi lain saat ujian.' : 'Tidak ada peserta yang terkunci saat ini.'}
                </p>
              </div>

              <div 
                onClick={() => setResetFilterTab('active')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                  resetFilterTab === 'active'
                    ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-100 hover:border-amber-200 hover:bg-amber-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500 text-white rounded-xl">
                      <Timer className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Sesi Ujian Sedang Berjalan</span>
                      <strong className="text-2xl font-black text-amber-700 block mt-0.5">
                        {activeList.length} Siswa
                      </strong>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  Siswa sedang aktif login & mengerjakan di ruang ujian.
                </p>
              </div>

              <div 
                onClick={() => setResetFilterTab('all')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                  resetFilterTab === 'all'
                    ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Semua Siswa</span>
                      <strong className="text-2xl font-black text-slate-800 block mt-0.5">
                        {participants.length} Siswa
                      </strong>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                    {cleanCount} Siap / Bebas
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  Semua peserta terdaftar dalam database CBT.
                </p>
              </div>
            </div>

            {/* Main Interactive Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Tab Navigation bar */}
              <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setResetFilterTab('locked')}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      resetFilterTab === 'locked'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>🚨 Peserta Terkunci ({lockedList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetFilterTab('active')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      resetFilterTab === 'active'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700'
                    }`}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Sesi Ujian Aktif ({activeList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetFilterTab('all')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      resetFilterTab === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Semua Siswa ({participants.length})</span>
                  </button>
                </div>

                {/* Batch selection tools */}
                {selectedResetIds.length > 0 && (
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-800">
                      {selectedResetIds.length} Siswa Terpilih
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        selectedResetIds.forEach(id => onResetParticipantLogin(id, false));
                        showToast(`Berhasil membuka kunci & meriset ${selectedResetIds.length} siswa!`, 'success');
                        setSelectedResetIds([]);
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Unlock className="h-3 w-3" />
                      <span>Buka Kunci Terpilih</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedResetIds([])}
                      className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold ml-1 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>

              {/* Search & Class Filter */}
              <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Kelas:</span>
                    <select
                      value={resetFilterGroupId}
                      onChange={(e) => {
                        setResetFilterGroupId(e.target.value);
                        setSelectedResetIds([]);
                      }}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="all">Semua Kelas ({participants.length})</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Cari siswa, NIS, atau no kartu..."
                    value={resetSearchTerm}
                    onChange={(e) => setResetSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={displayedList.length > 0 && displayedList.every(p => selectedResetIds.includes(p.id))}
                          onChange={(e) => handleSelectAllReset(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3.5">No Kartu</th>
                      <th className="px-5 py-3.5">Nama Lengkap & Kelas</th>
                      <th className="px-4 py-3.5">Username</th>
                      <th className="px-5 py-3.5">Status Keamanan & Sesi</th>
                      <th className="px-5 py-3.5 text-center">Tindakan Pengawas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {displayedList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                          <p className="font-bold text-slate-700 text-sm">Tidak Ada Data Sesuai Kategori</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {resetFilterTab === 'locked' 
                              ? 'Hebat! Tidak ada peserta yang terkunci atau melanggar aturan ujian.' 
                              : 'Tidak ada data peserta ditemukan pada filter ini.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      displayedList.map(p => {
                        const gName = groups.find(g => g.id === p.groupId)?.name || '-';
                        const isSelected = selectedResetIds.includes(p.id);

                        return (
                          <tr key={p.id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-indigo-50/25' : ''}`}>
                            <td className="px-4 py-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectReset(p.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-600 font-semibold">{p.examCardNo}</td>
                            <td className="px-5 py-3.5">
                              <span className="font-bold text-slate-900 block text-xs">{p.name}</span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                {gName}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold text-indigo-700">{p.username}</td>
                            <td className="px-5 py-3.5">
                              {p.isLocked ? (
                                <div className="space-y-1">
                                  <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 rounded-full text-xs font-black flex items-center gap-1.5 w-max">
                                    <ShieldAlert className="h-3.5 w-3.5 text-red-600 animate-pulse" /> Terkunci (Anti-Curang)
                                  </span>
                                  <p className="text-[11px] text-red-600 font-semibold leading-tight">
                                    {p.lockedReason || 'Terdeteksi keluar dari layar ujian atau membuka aplikasi lain.'}
                                  </p>
                                </div>
                              ) : p.isLoggedIn ? (
                                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5 w-max">
                                  <RefreshCw className="h-3 w-3 animate-spin text-amber-600" /> Sesi Ujian Aktif
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium w-max">
                                  Offline / Bebas
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {p.isLocked ? (
                                  <>
                                    {/* Primary Unlock Action: Keep answers and remaining time */}
                                    <button
                                      type="button"
                                      onClick={() => handleExecuteUnlock(p.id, p.name)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                      title="Buka Kunci: Siswa dapat masuk kembali & melanjutkan jawaban tersimpan"
                                    >
                                      <Unlock className="h-3.5 w-3.5" />
                                      <span>Buka Kunci (Lanjut Ujian)</span>
                                    </button>

                                    {/* Total Reset Attempt Action: Resets attempt to 0 */}
                                    <button
                                      type="button"
                                      onClick={() => setConfirmAttemptResetModal({ id: p.id, name: p.name })}
                                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                      title="Riset Total: Hapus jawaban dan mulai dari nomor 1 lagi"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      <span>Riset Total</span>
                                    </button>
                                  </>
                                ) : p.isLoggedIn ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onResetParticipantLogin(p.id, false);
                                      showToast(`Sesi login "${p.name}" berhasil diputuskan! Siswa dapat masuk kembali di HP/Laptop.`, 'success');
                                    }}
                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                    title="Putuskan sesi login aktif siswa"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    <span>Tombol Riset Sesi</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onResetParticipantLogin(p.id, false);
                                      showToast(`Akun ${p.name} berhasil di-reset. Siswa siap login di HP/Laptop.`, 'success');
                                    }}
                                    className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                    title="Bebaskan status akun & pastikan siap login di HP/Laptop"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5 text-sky-600" />
                                    <span>Tombol Riset Login</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Confirm Attempt Reset */}
            {confirmAttemptResetModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3 text-red-600">
                    <div className="p-3 bg-red-100 rounded-2xl">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Konfirmasi Riset Total Ujian</h3>
                      <p className="text-xs text-slate-500 font-medium">Tindakan ini menghapus lembar jawaban siswa</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-red-50/60 p-3.5 rounded-xl border border-red-100">
                    Apakah Anda yakin ingin meriset total sesi ujian peserta <strong>"{confirmAttemptResetModal.name}"</strong>? Seluruh jawaban yang telah dipilih akan dihapus dan peserta akan memulai ujian baru dari nomor 1.
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setConfirmAttemptResetModal(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteTotalReset(confirmAttemptResetModal.id, confirmAttemptResetModal.name)}
                      className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Ya, Riset Total Jawaban</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderEditParticipantModal = () => {
    if (!editingPart) return null;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden my-8 animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Edit Data Peserta Siswa</h3>
                <p className="text-xs text-slate-500 font-medium">Perbarui identitas, kelas, dan akun login siswa</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseEditModal}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSaveEditParticipant} className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Nama Lengkap Siswa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editPartName}
                onChange={(e) => setEditPartName(e.target.value)}
                placeholder="Nama Lengkap Siswa"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Username Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editPartUser}
                  onChange={(e) => setEditPartUser(e.target.value)}
                  placeholder="Username / NIS"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono text-indigo-700 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Password / Sandi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editPartPass}
                  onChange={(e) => setEditPartPass(e.target.value)}
                  placeholder="Password akun"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono text-emerald-700 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Grup / Kelas
                </label>
                <select
                  value={editPartGroup}
                  onChange={(e) => setEditPartGroup(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  No. Kartu Ujian
                </label>
                <input
                  type="text"
                  value={editPartCard}
                  onChange={(e) => setEditPartCard(e.target.value)}
                  placeholder="Nomor kartu ujian"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Security Lock Controls */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Status Keamanan & Kunci Anti-Curang
              </label>
              <div className="flex items-center gap-4 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editPartLocked"
                    checked={!editPartLocked}
                    onChange={() => {
                      setEditPartLocked(false);
                      setEditPartLockedReason('');
                    }}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <Unlock className="h-3.5 w-3.5" /> Normal (Tidak Terkunci)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editPartLocked"
                    checked={editPartLocked}
                    onChange={() => {
                      setEditPartLocked(true);
                      if (!editPartLockedReason) setEditPartLockedReason('Terkunci oleh operator/pengawas');
                    }}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Terkunci (Pelanggaran)
                  </span>
                </label>
              </div>

              {editPartLocked && (
                <div className="mt-2 bg-red-50/70 p-3 rounded-xl border border-red-200 animate-in fade-in">
                  <label className="text-[11px] font-bold text-red-800 uppercase block mb-1">
                    Alasan Pelanggaran / Catatan Kunci:
                  </label>
                  <input
                    type="text"
                    value={editPartLockedReason}
                    onChange={(e) => setEditPartLockedReason(e.target.value)}
                    placeholder="Contoh: Terdeteksi membuka browser tab baru"
                    className="w-full px-3 py-1.5 border border-red-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 text-red-900 font-semibold"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Status Sesi Ujian / Login
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editPartLoggedIn"
                    checked={!editPartLoggedIn}
                    onChange={() => setEditPartLoggedIn(false)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Offline / Belum Login</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editPartLoggedIn"
                    checked={editPartLoggedIn}
                    onChange={() => setEditPartLoggedIn(true)}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-semibold text-amber-700">Sedang Login Aktif (Ujian)</span>
                </label>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  handleCloseEditModal();
                  handleDeleteSingleParticipant(editingPart);
                }}
                className="px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Hapus Siswa</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDeleteParticipantModal = () => {
    if (!deletePartModal) return null;

    const isSingle = deletePartModal.type === 'single' && deletePartModal.participant;
    const p = deletePartModal.participant;
    const count = isSingle ? 1 : (deletePartModal.ids?.length || 0);

    const selectedList = !isSingle && deletePartModal.ids 
      ? participants.filter(item => deletePartModal.ids?.includes(item.id))
      : [];

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-6 text-center border-b border-slate-100">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {isSingle ? 'Konfirmasi Hapus Peserta' : `Hapus Masal ${count} Peserta`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isSingle 
                ? 'Tindakan ini akan menghapus peserta ini secara permanen dari basis data.'
                : 'Tindakan ini akan menghapus semua peserta yang dipilih secara permanen.'}
            </p>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            {isSingle && p ? (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Nama Siswa:</span>
                  <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">No Kartu:</span>
                  <span className="font-mono font-bold text-slate-700">{p.examCardNo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Username Login:</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{p.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Grup / Kelas:</span>
                  <span className="font-semibold text-slate-700">{groups.find(g => g.id === p.groupId)?.name || '-'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Anda akan menghapus <strong>{count} orang siswa</strong>. Semua riwayat pengerjaan ujian dan akun login mereka akan dibersihkan.
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50 space-y-1">
                  {selectedList.slice(0, 10).map(s => (
                    <div key={s.id} className="flex justify-between items-center text-[11px] px-2 py-1 bg-white rounded border border-slate-100">
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">{s.name}</span>
                      <span className="font-mono text-slate-500">{s.username}</span>
                    </div>
                  ))}
                  {selectedList.length > 10 && (
                    <p className="text-[10px] text-center text-slate-400 font-semibold pt-1">
                      + {selectedList.length - 10} siswa lainnya terpilih
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-medium">
              Data yang telah dihapus tidak dapat dikembalikan. Pastikan Anda telah mengonfirmasi tindakan ini.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDeletePartModal(null)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteParticipant}
              className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isSingle ? 'Ya, Hapus Siswa' : `Ya, Hapus ${count} Siswa Terpilih`}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteGroupModal = () => {
    if (!deleteGroupModal) return null;

    const isSingle = deleteGroupModal.type === 'single' && deleteGroupModal.group;
    const g = deleteGroupModal.group;
    const count = isSingle ? 1 : (deleteGroupModal.ids?.length || 0);

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
          <div className="p-6 text-center border-b border-slate-100">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {isSingle ? `Hapus Grup "${g?.name}"` : `Hapus ${count} Grup/Kelas Terpilih`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin menghapus {isSingle ? 'kelas ini' : `${count} grup/kelas yang dipilih`}?
            </p>
          </div>

          <div className="p-6 space-y-3 text-xs text-slate-600">
            <p>
              Catatan: Data siswa di dalam grup ini <strong>tidak akan terhapus</strong>, namun penempatan kelas siswa tersebut akan diatur menjadi tanpa kelas.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDeleteGroupModal(null)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteGroup}
              className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isSingle ? 'Ya, Hapus Grup' : `Ya, Hapus ${count} Grup`}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGenerateClassesModal = () => {
    if (!generateClassesList) return null;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
          <div className="p-6 text-center border-b border-slate-100">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Buat {generateClassesList.length} Kelas Otomatis
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sistem akan menambahkan kelas standar sekolah lengkap ke daftar grup.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50 flex flex-wrap gap-1.5">
              {generateClassesList.map((g, idx) => (
                <span key={idx} className="px-2 py-1 bg-white border border-indigo-100 text-indigo-700 rounded-md text-xs font-bold shadow-2xs">
                  {g.name}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setGenerateClassesList(null)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmGenerateClasses}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Buat {generateClassesList.length} Kelas Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderToastNotification = () => {
    if (!toastMessage) return null;

    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
        <div className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 max-w-sm ${
          toastMessage.type === 'error'
            ? 'bg-red-900 text-white border-red-800'
            : toastMessage.type === 'info'
            ? 'bg-slate-900 text-white border-slate-800'
            : 'bg-emerald-900 text-white border-emerald-800'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          ) : toastMessage.type === 'info' ? (
            <AlertCircle className="h-5 w-5 text-indigo-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-semibold leading-snug">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-all text-white/70 hover:text-white cursor-pointer ml-auto"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      {renderEditParticipantModal()}
      {renderDeleteParticipantModal()}
      {renderDeleteGroupModal()}
      {renderGenerateClassesModal()}
      {renderToastNotification()}
    </>
  );
}
