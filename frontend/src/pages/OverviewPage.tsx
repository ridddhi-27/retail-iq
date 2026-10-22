import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  DollarSign,
  Package,
  Layers,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../services/api';
import type { DashboardSummary } from '../types';
import { StatCard } from '../components/StatCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { useWorkspace } from '../context/WorkspaceContext';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { workspace, currency, isDark, createSampleWorkspace } = useWorkspace();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err: any) {
      console.error('Error fetching dashboard summary:', err);
      setError(err?.response?.data?.detail || 'Failed to load executive summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [workspace?.workspace_id]);

  if (loading) {
    return <LoadingSpinner message="Calculating retail telemetry and predictive alerts..." />;
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorBanner message={error || 'Unable to load overview'} onRetry={fetchDashboard} />
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    `${currency} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val)}`;

  const formatUnits = (val: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);

  // If workspace has no data, show clean empty state
  if (!data.has_data && data.total_units_sold === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          title="No Sales Records in Workspace"
          description="Your private workspace is initialized and ready. Upload your store's sales records (.csv or .xlsx) or explore with our pre-loaded sample dataset."
          icon={FileSpreadsheet}
          actionLabel="Upload Sales File"
          onAction={() => navigate('/app/data')}
          secondaryActionLabel="Try Sample Store"
          onSecondaryAction={async () => {
            await createSampleWorkspace();
            fetchDashboard();
          }}
        />
      </div>
    );
  }

  // Theme-aware chart colors
  const primaryStroke = isDark ? '#A49BFF' : '#7778E8';
  const secondaryBar = isDark ? '#72D7F0' : '#7BCFE0';
  const gridStroke = isDark ? '#293650' : '#E5E9F2';
  const axisStroke = isDark ? '#7885A0' : '#8993A7';
  const tooltipBg = isDark ? '#151E33' : '#FFFFFF';
  const tooltipBorder = isDark ? '#293650' : '#E5E9F2';
  const tooltipText = isDark ? '#F4F6FF' : '#252B42';

  return (
    <div className="space-y-6">
      {/* Top Banner: Workspace Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              {workspace?.is_sample ? 'Sample Retail Store' : 'Active Store Workspace'}
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Historical data: {data.data_date_range?.start || 'N/A'} to {data.data_date_range?.end || 'N/A'} &bull; {data.total_products} Active SKUs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/forecasting"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold transition-all shadow-sm shadow-[var(--primary)]/25"
          >
            <span>Run Forecast</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Units Sold"
          value={formatUnits(data.total_units_sold)}
          subtitle="Observed sales volume"
          icon={ShoppingBag}
          accentColor="primary"
        />
        <StatCard
          title="Gross Revenue"
          value={formatCurrency(data.total_revenue)}
          subtitle="Net product turnover"
          icon={DollarSign}
          accentColor="cyan"
        />
        <StatCard
          title="Product Catalog"
          value={data.total_products}
          subtitle={`Across ${data.total_categories} retail categories`}
          icon={Package}
          accentColor="mint"
        />
        <StatCard
          title="Reorder Alerts"
          value={data.reorder_alerts.length}
          subtitle="Stock below lead demand + safety"
          icon={AlertTriangle}
          accentColor="amber"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Trend */}
        <div className="pastel-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                Monthly Sales Volume
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">Total units sold per month</p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)]">
              Units
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthly_sales}>
                <defs>
                  <linearGradient id="unitsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryStroke} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={primaryStroke} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" stroke={axisStroke} tick={{ fontSize: 11 }} />
                <YAxis stroke={axisStroke} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    color: tooltipText,
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value: any) => [formatUnits(Number(value)), 'Units Sold']}
                />
                <Area
                  type="monotone"
                  dataKey="units_sold"
                  stroke={primaryStroke}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#unitsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="pastel-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[var(--success)]" />
                Monthly Revenue Performance
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">Gross revenue generated per month</p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--accent-mint)] text-[var(--accent-mint-text)]">
              {currency}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenue_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" stroke={axisStroke} tick={{ fontSize: 11 }} />
                <YAxis
                  stroke={axisStroke}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `${currency}${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    color: tooltipText,
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                />
                <Bar dataKey="revenue" fill={secondaryBar} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Performance & Reorder Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (2 Cols) */}
        <div className="lg:col-span-2 pastel-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--secondary)]" />
                Category Performance
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">Revenue contribution by product category</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data.category_performance.slice(0, 8)}
                margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis
                  type="number"
                  stroke={axisStroke}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `${currency}${(val / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke={axisStroke}
                  tick={{ fontSize: 11 }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    color: tooltipText,
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  itemStyle={{ color: tooltipText }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                />
                <Bar dataKey="revenue" fill={secondaryBar} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Urgent Reorder Alerts Panel (1 Col) */}
        <div className="pastel-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
                Urgent Replenishments
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full pastel-badge-warning">
                {data.reorder_alerts.length} Items
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Products where stock is insufficient to cover lead time demand & safety stock.
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {data.reorder_alerts.slice(0, 5).map((item) => (
                <div
                  key={item.product_id}
                  className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] block truncate">
                      {item.product_name}
                    </span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      Stock: {item.current_stock} &bull; Lead: {item.lead_time_days}d
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[var(--warning)] block">
                      +{item.recommended_order_quantity}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">Order Qty</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[var(--border)]">
            <Link
              to="/app/inventory"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl pastel-badge-warning hover:opacity-90 text-xs font-semibold transition-all"
            >
              <span>View Full Inventory Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Top 5 Products Table */}
      <div className="pastel-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--primary)]" />
              Top Revenue Products
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">Leading performers ranked by sales volume and gross revenue</p>
          </div>
          <Link
            to="/app/analytics"
            className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            <span>All Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
                <th className="pb-3 pl-2">Product</th>
                <th className="pb-3">Category</th>
                <th className="pb-3 text-right">Units Sold</th>
                <th className="pb-3 text-right pr-2">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {data.top_products.slice(0, 5).map((prod) => (
                <tr key={prod.product_id} className="hover:bg-[var(--surface-secondary)] transition-colors">
                  <td className="py-3 pl-2 font-medium text-[var(--text-primary)]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--accent-lavender-text)] bg-[var(--accent-lavender)] px-1.5 py-0.5 rounded">
                        {prod.product_id}
                      </span>
                      <span>{prod.product_name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-[var(--text-secondary)]">{prod.category}</td>
                  <td className="py-3 text-right font-medium text-[var(--text-primary)]">
                    {formatUnits(prod.total_units)}
                  </td>
                  <td className="py-3 text-right pr-2 font-bold text-[var(--text-primary)]">
                    {formatCurrency(prod.total_revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
