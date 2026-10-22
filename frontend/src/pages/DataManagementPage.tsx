import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  History,
  Download,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import type { DataPreviewResponse, DataImportResponse, DataImportHistory, ExcelSheetsResponse } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { useWorkspace } from '../context/WorkspaceContext';

export const DataManagementPage: React.FC = () => {
  const { workspace, refreshWorkspace, createSampleWorkspace } = useWorkspace();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [preview, setPreview] = useState<DataPreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<DataImportResponse | null>(null);
  const [history, setHistory] = useState<DataImportHistory[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    try {
      const data = await api.getImportHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load import history:', err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [workspace?.workspace_id]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setPreview(null);
    setImportResult(null);
    setError(null);
    setAvailableSheets([]);
    setSelectedSheet('');
    setLoadingPreview(true);

    try {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      let sheetToLoad: string | undefined = undefined;

      if (isExcel) {
        const sheetInfo = await api.inspectSheets(file);
        if (sheetInfo.sheets && sheetInfo.sheets.length > 0) {
          setAvailableSheets(sheetInfo.sheets);
          sheetToLoad = sheetInfo.default_sheet || sheetInfo.sheets[0];
          setSelectedSheet(sheetToLoad);
        }
      }

      const res = await api.previewUpload(file, sheetToLoad);
      setPreview(res);
    } catch (err: any) {
      console.error('File preview error:', err);
      setError(err?.response?.data?.detail || 'Failed to inspect file structure.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!selectedFile) return;
    setSelectedSheet(sheetName);
    setLoadingPreview(true);
    setError(null);
    try {
      const res = await api.previewUpload(selectedFile, sheetName);
      setPreview(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to read worksheet "${sheetName}".`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    setLoadingImport(true);
    setError(null);

    try {
      const res = await api.importUpload(selectedFile, selectedSheet || undefined);
      setImportResult(res);
      setPreview(null);
      setSelectedFile(null);
      setAvailableSheets([]);
      setSelectedSheet('');
      await loadHistory();
      await refreshWorkspace();
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to persist records to workspace.');
    } finally {
      setLoadingImport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Zone */}
      <div className="pastel-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[var(--primary)]" />
              Data Ingestion & Spreadsheet Upload
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Upload daily retail sales logs in CSV or Excel (.xlsx/.xls) format
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={api.getTemplateDownloadUrl('csv')}
              download="retailiq_template.csv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] hover:opacity-80 text-[var(--text-primary)] text-xs font-semibold border border-[var(--border)] transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Sample CSV</span>
            </a>
            <a
              href={api.getTemplateDownloadUrl('xlsx')}
              download="retailiq_template.xlsx"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-lavender)] hover:opacity-90 text-[var(--accent-lavender-text)] text-xs font-semibold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample Excel (.xlsx)</span>
            </a>
          </div>
        </div>

        {/* Drag & Drop Box */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-[#8B8FE8] bg-[var(--accent-lavender)]/20'
              : 'border-[var(--border)] hover:border-[#8B8FE8] bg-[var(--surface-secondary)]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)] flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {selectedFile ? selectedFile.name : 'Drag and drop your spreadsheet here, or browse files'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Supports .CSV, .XLSX, and .XLS with automatic header normalization
              </p>
            </div>
          </div>
        </div>
      </div>

      {loadingPreview && <LoadingSpinner message="Inspecting file structure, columns, and row integrity..." />}
      {error && <ErrorBanner message={error} />}

      {/* Success Banner */}
      {importResult && (
        <div className="p-4 rounded-xl bg-[var(--accent-mint)] text-[var(--accent-mint-text)] flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">{importResult.message}</p>
            <p className="font-mono">
              Imported: {importResult.rows_imported} | Skipped: {importResult.rows_skipped} | Errors: {importResult.rows_errors}
            </p>
          </div>
        </div>
      )}

      {/* Multi-Sheet Selection & Preview Card */}
      {preview && !loadingPreview && (
        <div className="pastel-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--primary)]" />
                File Diagnostics & Preview
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                File: <span className="font-semibold text-[var(--text-primary)]">{preview.filename}</span> (
                {(preview.file_size_bytes / 1024).toFixed(1)} KB, {preview.total_rows} rows)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] hover:opacity-80 text-[var(--text-primary)] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!preview.valid || loadingImport}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all shadow-sm shadow-[var(--primary)]/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingImport ? 'Importing...' : 'Confirm & Ingest Records'}
              </button>
            </div>
          </div>

          {/* Excel Worksheet Selector */}
          {availableSheets.length > 1 && (
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center gap-3">
              <Layers className="w-4 h-4 text-[var(--primary)] shrink-0" />
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Select Worksheet:
                </span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="px-3 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                  {availableSheets.map((sh) => (
                    <option key={sh} value={sh}>
                      {sh}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Validation Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                preview.valid
                  ? 'bg-[var(--accent-mint)]/40 border-[var(--accent-mint)] text-[var(--accent-mint-text)]'
                  : 'bg-[var(--danger)]/20 border-[var(--danger)]/30 text-[var(--danger)]'
              }`}
            >
              <span className="font-bold block">Required Schema:</span>
              <span>
                {preview.valid
                  ? 'All core sales columns recognized'
                  : `Missing: ${preview.missing_required_columns.join(', ')}`}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)]">
              <span className="font-bold block">Total Rows:</span>
              <span>{preview.total_rows} rows inspected</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)]">
              <span className="font-bold block">Duplicate Records:</span>
              <span>{preview.duplicate_count} duplicate keys handled</span>
            </div>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
                <tr>
                  {preview.columns.map((col) => (
                    <th key={col} className="py-2 px-2.5 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {preview.preview_rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[var(--surface-secondary)] dark:hover:bg-[#1F2436]">
                    {preview.columns.map((col) => (
                      <td key={col} className="py-2 px-2.5 whitespace-nowrap font-mono text-[var(--text-primary)]">
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import History Table */}
      <div className="pastel-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--primary)]" />
              Workspace Ingestion History
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">Audit log of spreadsheets imported into this workspace</p>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] py-6 text-center">
            No previous file uploads recorded in this workspace.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
                  <th className="pb-3 pl-2">ID</th>
                  <th className="pb-3">Filename</th>
                  <th className="pb-3">File Size</th>
                  <th className="pb-3 text-right">Rows Total</th>
                  <th className="pb-3 text-right">Imported</th>
                  <th className="pb-3 text-right">Skipped</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right pr-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-[var(--surface-secondary)] dark:hover:bg-[#1F2436]">
                    <td className="py-2.5 pl-2 font-mono text-[var(--text-secondary)]">#{h.id}</td>
                    <td className="py-2.5 font-medium text-[var(--text-primary)]">{h.filename}</td>
                    <td className="py-2.5 text-[var(--text-secondary)]">
                      {h.file_size_bytes ? `${(h.file_size_bytes / 1024).toFixed(1)} KB` : '-'}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[var(--text-primary)]">{h.rows_total}</td>
                    <td className="py-2.5 text-right font-mono text-[#319C76] font-bold">+{h.rows_imported}</td>
                    <td className="py-2.5 text-right font-mono text-[var(--text-secondary)]">{h.rows_skipped}</td>
                    <td className="py-2.5 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#B9E8D0] text-[#175438]">
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right pr-2 text-[var(--text-secondary)]">
                      {new Date(h.imported_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

