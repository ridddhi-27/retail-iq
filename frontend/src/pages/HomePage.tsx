import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  FileSpreadsheet,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ThemeToggle } from '../components/ThemeToggle';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { createSampleWorkspace, initNewWorkspace } = useWorkspace();
  const [loadingSample, setLoadingSample] = useState(false);
  const [loadingNew, setLoadingNew] = useState(false);

  const handleGetStarted = async () => {
    try {
      setLoadingNew(true);
      await initNewWorkspace();
      navigate('/app/data');
    } catch (e) {
      navigate('/app');
    } finally {
      setLoadingNew(false);
    }
  };

  const handleTrySample = async () => {
    try {
      setLoadingSample(true);
      await createSampleWorkspace();
      navigate('/app');
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--accent-lavender)] selection:text-[var(--accent-lavender-text)] transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface-header)]/85 backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white shadow-sm shadow-[var(--primary)]/25">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">RetailIQ</span>
              <span className="text-xs ml-2 px-2.5 py-0.5 rounded-full font-semibold bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)]">
                Demand Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <button
              onClick={() => navigate('/app')}
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 transition-colors cursor-pointer"
            >
              Open Workspace
            </button>
            <button
              onClick={handleGetStarted}
              disabled={loadingNew}
              className="text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-4 py-2 rounded-xl transition-all shadow-sm shadow-[var(--primary)]/25 flex items-center gap-2 cursor-pointer"
            >
              {loadingNew ? 'Initializing...' : 'Get Started'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)] mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Driven Retail Demand Forecasting & Inventory Optimization</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] max-w-4xl mx-auto leading-tight">
            Make Smarter Retail Decisions with Confident Demand Insights
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto font-normal leading-relaxed">
            Upload your sales spreadsheets to forecast future demand, stop stockouts before they happen,
            and automate replenishment orders — entirely in a private, registration-free workspace.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGetStarted}
              disabled={loadingNew}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-base transition-all shadow-md shadow-[var(--primary)]/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingNew ? 'Setting up Workspace...' : 'Get Started Free'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleTrySample}
              disabled={loadingSample}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] font-semibold text-base border border-[var(--border)] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Database className="w-4 h-4 text-[var(--primary)]" />
              {loadingSample ? 'Loading Demo Store...' : 'Try with Sample Data'}
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)]" /> No login or sign-up needed
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)]" /> Private isolated session
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--success)]" /> CSV, XLSX & XLS support
            </span>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-16 bg-[var(--surface)] border-y border-[var(--border)] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Engineered for Modern Retailers
            </h2>
            <p className="mt-3 text-[var(--text-secondary)] text-base">
              From sales analytics to proactive stock replenishment, everything you need to run an efficient store.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)] flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Demand Forecasting</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                Recursive machine learning models forecast sales 1 to 30 days ahead, accounting for seasonality, day of week, and promotional lifts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-mint)] text-[var(--accent-mint-text)] flex items-center justify-center mb-5">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Inventory Intelligence</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                Dynamic reorder recommendations based on supplier lead times, safety stocks, and predicted demand during fulfillment cycles.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-cyan)] text-[var(--accent-cyan-text)] flex items-center justify-center mb-5">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Flexible File Ingestion</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                Drag-and-drop CSV or Excel (.xlsx/.xls) files with multi-worksheet selection, automatic column synonym matching, and diagnostics.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-blue)] text-[var(--accent-blue-text)] flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Zero-Login Privacy</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                Each visitor automatically receives an isolated workspace secured by token cookies. Your store data is never mixed or exposed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Workflow */}
      <section className="py-16 bg-[var(--background)] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Three Simple Steps to Optimize Your Stock
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[var(--surface)] p-7 rounded-2xl border border-[var(--border)] shadow-xs relative">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Upload Sales Data</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                Import historical sales records via CSV or multi-sheet Excel, or test drive instantly with the pre-populated sample store.
              </p>
            </div>

            <div className="bg-[var(--surface)] p-7 rounded-2xl border border-[var(--border)] shadow-xs relative">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Analyze Trends & Velocity</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                Filter by date ranges, categories, and specific SKUs to pinpoint top sellers, sales velocity, and day-of-week demand patterns.
              </p>
            </div>

            <div className="bg-[var(--surface)] p-7 rounded-2xl border border-[var(--border)] shadow-xs relative">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Generate Forecasts & POs</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                Run recursive forecasts up to 30 days and view precise replenishment purchase order quantities to eliminate out-of-stock events.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={handleGetStarted}
              className="px-8 py-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold transition-all shadow-md shadow-[var(--primary)]/20 inline-flex items-center gap-2 cursor-pointer"
            >
              Start Forecasting Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)] py-8 text-center text-xs text-[var(--text-secondary)] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--text-primary)]">RetailIQ</span>
            <span>&copy; {new Date().getFullYear()} — Intelligent Demand Forecasting</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/app/about')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
              About & Methodology
            </button>
            <button onClick={() => navigate('/app/data')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
              Data Templates
            </button>
            <button onClick={() => navigate('/app/settings')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
              Settings & Privacy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
