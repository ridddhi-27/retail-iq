import React from 'react';
import {
  TrendingUp,
  Brain,
  ShieldCheck,
  Package,
  Layers,
  Database,
  CheckCircle2,
  FileSpreadsheet,
  Cpu,
  Info,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export const AboutPage: React.FC = () => {
  const { workspace } = useWorkspace();

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="pastel-card p-8 bg-[var(--surface)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">About RetailIQ</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
          RetailIQ is an intelligent demand forecasting and inventory decision-support platform designed for
          retail businesses. It transforms transactional sales histories into forward-looking forecasts,
          empowers proactive stock replenishment, and minimizes expensive stockouts.
        </p>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="pastel-card p-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)] flex items-center justify-center mb-4">
            <Brain className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-[var(--text-primary)]">Predictive Machine Learning</h3>
          <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            Utilizes an Extra Trees ensemble regressor trained on multi-scale retail sales signals,
            lagged velocity, calendar cyclicality (day of week, month), and promotional multipliers.
          </p>
        </div>

        <div className="pastel-card p-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-mint)] text-[var(--accent-mint-text)] flex items-center justify-center mb-4">
            <Package className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-[var(--text-primary)]">Inventory Replenishment</h3>
          <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            Calculates exact order quantities using:
            <code className="block mt-1 p-1.5 bg-[var(--surface-secondary)] rounded text-[11px] font-mono text-[var(--text-primary)]">
              Order Qty = max(0, Lead Demand + Safety Stock - Current Stock)
            </code>
          </p>
        </div>

        <div className="pastel-card p-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-cyan)] text-[var(--accent-cyan-text)] flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-[var(--text-primary)]">Multi-Tenant Privacy</h3>
          <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
            Zero sign-up barrier. Every user receives a private cryptographically isolated workspace.
            Your uploads and forecasts are strictly segregated from other visitors.
          </p>
        </div>
      </div>

      {/* Workflow Guide */}
      <div className="pastel-card p-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">End-to-End Operational Workflow</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[var(--surface-secondary)]">
            <div className="text-xs font-bold text-[var(--primary)] uppercase mb-1">Step 1</div>
            <div className="font-semibold text-sm text-[var(--text-primary)]">Data Ingestion</div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Upload your store's CSV or Excel (.xlsx/.xls) sales records, or explore with our demo store.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-secondary)]">
            <div className="text-xs font-bold text-[var(--primary)] uppercase mb-1">Step 2</div>
            <div className="font-semibold text-sm text-[var(--text-primary)]">Sales Analytics</div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Filter by custom date ranges and product categories to uncover volume trends and weekday patterns.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-secondary)]">
            <div className="text-xs font-bold text-[var(--primary)] uppercase mb-1">Step 3</div>
            <div className="font-semibold text-sm text-[var(--text-primary)]">Demand Forecasting</div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Project demand up to 30 days ahead per SKU to anticipate order surges and seasonal spikes.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-secondary)]">
            <div className="text-xs font-bold text-[var(--primary)] uppercase mb-1">Step 4</div>
            <div className="font-semibold text-sm text-[var(--text-primary)]">Order Placement</div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Review priority stockout alerts, adjust stock on hand, and generate purchase orders with one click.
            </p>
          </div>
        </div>
      </div>

      {/* Dataset & Evaluation Disclosure */}
      <div className="pastel-card p-6 border-l-4 border-l-[var(--primary)]">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Data Integrity &amp; Methodology Disclosure</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              The built-in sample store dataset is synthetic retail data generated specifically for demonstration
              and testing of the forecasting pipeline. It does not represent actual transactions from any single
              retailer. When you upload your business records, forecasts are generated dynamically using your own
              unique sales trends and catalogue.
            </p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Workspace sessions expire automatically after 7 days of inactivity, and you can clear your workspace
              records anytime in the Settings tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
