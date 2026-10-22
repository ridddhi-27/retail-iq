import React, { useState, useEffect } from 'react';
import {
  LineChart as LineChartIcon,
  Filter,
  Download,
  CalendarDays,
  Tag,
  TrendingUp,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import type { SalesAnalytics, Product } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { useWorkspace } from '../context/WorkspaceContext';

export const SalesAnalyticsPage: React.FC = () => {
  const { workspace, currency, isDark, createSampleWorkspace } = useWorkspace();
  const [data, setData] = useState<SalesAnalytics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Theme-aware chart colors
  const gridStroke = isDark ? '#293650' : '#E5E9F2';
  const axisStroke = isDark ? '#7885A0' : '#8993A7';
  const tooltipBg = isDark ? '#151E33' : '#FFFFFF';
  const tooltipBorder = isDark ? '#293650' : '#E5E9F2';
  const tooltipText = isDark ? '#F4F6FF' : '#252B42';
  const primaryStroke = isDark ? '#A49BFF' : '#7778E8';
  const successStroke = isDark ? '#49D6A0' : '#23966D';
  const barFillBlue = isDark ? '#5B6EC7' : '#B8C7F5';
  const barFillMint = isDark ? '#3DA876' : '#B9E8D0';

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSalesAnalytics({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        product_id: selectedProduct || undefined,
        category: selectedCategory || undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch sales analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const prods = await api.getProducts();
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load products list:', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [workspace?.workspace_id]);

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, selectedProduct, selectedCategory, workspace?.workspace_id]);

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const formatCurrency = (val: number) =>
    `${currency} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val)}`;

  const formatUnits = (val: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);

  const handlePreset = (days: number | 'all') => {
    if (days === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedProduct('');
    setSelectedCategory('');
  };

  const handleExport = () => {
    const url = api.getSalesExportUrl({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      product_id: selectedProduct || undefined,
    });
    window.open(url, '_blank');
  };

  if (!workspace?.has_data) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          title="No Sales Analytics Available"
          description="Upload your store sales data or load the sample store demo to explore sales velocity, revenue trends, and day-of-week seasonality."
          icon={FileSpreadsheet}
          actionLabel="Load Sample Store"
          onAction={() => createSampleWorkspace()}
        />
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: tooltipBg,
    borderColor: tooltipBorder,
    color: tooltipText,
    borderRadius: '0.75rem',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="pastel-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Analytics Filters &amp; Dimension Controls
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handlePreset(7)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-secondary)] hover:opacity-80 text-[var(--text-primary)] transition-all cursor-pointer"
            >
              Last 7d
            </button>
            <button
              onClick={() => handlePreset(30)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-secondary)] hover:opacity-80 text-[var(--text-primary)] transition-all cursor-pointer"
            >
              Last 30d
            </button>
            <button
              onClick={() => handlePreset('all')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-secondary)] hover:opacity-80 text-[var(--text-primary)] transition-all cursor-pointer"
            >
              All Time
            </button>
            {(startDate || endDate || selectedCategory || selectedProduct) && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer ml-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedProduct('');
              }}
              className="w-full px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Product SKU
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="">All Products</option>
              {products
                .filter((p) => !selectedCategory || p.category === selectedCategory)
                .map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_id} - {p.product_name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner message="Calculating sales aggregates and trends..." />}
      {error && <ErrorBanner message={error} onRetry={fetchAnalytics} />}

      {data && !loading && (
        <>
          {/* Daily Sales Velocity Trend */}
          <div className="pastel-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                  Daily Sales Velocity (Units &amp; Revenue)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">Timeline of daily retail volume</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily_sales.slice(-60)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" stroke={axisStroke} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke={primaryStroke} tick={{ fontSize: 10 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={successStroke}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: tooltipText }}
                    formatter={(val: any, name: any) =>
                      name === 'Revenue' ? [formatCurrency(Number(val)), name] : [formatUnits(Number(val)), name]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: axisStroke }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="units_sold"
                    name="Units Sold"
                    stroke={primaryStroke}
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={successStroke}
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2-Column: Day of Week & Promotion Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Day of Week Pattern */}
            <div className="pastel-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[var(--primary)]" />
                    Day-of-Week Seasonality
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">Average units sold by day of the week</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.day_of_week_patterns}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="dayofweek" stroke={axisStroke} tick={{ fontSize: 11 }} />
                    <YAxis stroke={axisStroke} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: tooltipText }}
                      formatter={(val: any) => [formatUnits(Number(val)), 'Avg Units']}
                    />
                    <Bar dataKey="avg_units" fill={barFillBlue} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Promotion & Discount Analysis */}
            <div className="pastel-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[var(--success)]" />
                    Promotion Impact Analysis
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">Comparing discounted vs regular price daily velocity</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.discount_analysis}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="has_discount" stroke={axisStroke} tick={{ fontSize: 11 }} />
                    <YAxis stroke={axisStroke} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: tooltipText }}
                      formatter={(val: any) => [formatUnits(Number(val)), 'Avg Units/Day']}
                    />
                    <Bar dataKey="avg_units" fill={barFillMint} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Product Rankings Table */}
          <div className="pastel-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-[var(--primary)]" />
                  Product Sales Volume &amp; Revenue Leaderboard
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">Aggregated ranking based on current filters</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
                    <th className="pb-3 pl-2">SKU</th>
                    <th className="pb-3">Product Name</th>
                    <th className="pb-3 text-right">Units Sold</th>
                    <th className="pb-3 text-right pr-2">Total Gross Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.product_rankings.map((prod) => (
                    <tr key={prod.product_id} className="hover:bg-[var(--surface-secondary)] transition-colors">
                      <td className="py-3 pl-2 font-mono text-[var(--primary)] font-bold">
                        {prod.product_id}
                      </td>
                      <td className="py-3 font-medium text-[var(--text-primary)]">
                        {prod.product_name || prod.product_id}
                      </td>
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
        </>
      )}
    </div>
  );
};
