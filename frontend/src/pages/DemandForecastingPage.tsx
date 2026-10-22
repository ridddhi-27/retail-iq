import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  Download,
  Package,
  ArrowRight,
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
  Legend,
} from 'recharts';
import { api } from '../services/api';
import type { ForecastResponse } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { useWorkspace } from '../context/WorkspaceContext';

export const DemandForecastingPage: React.FC = () => {
  const { workspace, currency, isDark, createSampleWorkspace } = useWorkspace();
  const [availableProducts, setAvailableProducts] = useState<
    Array<{ product_id: string; product_name: string; category: string }>
  >([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme-aware chart colors
  const gridStroke = isDark ? '#293650' : '#E5E9F2';
  const axisStroke = isDark ? '#7885A0' : '#8993A7';
  const tooltipBg = isDark ? '#151E33' : '#FFFFFF';
  const tooltipBorder = isDark ? '#293650' : '#E5E9F2';
  const tooltipText = isDark ? '#F4F6FF' : '#252B42';
  const chartColors = isDark
    ? ['#A49BFF', '#49D6A0', '#72D7F0', '#C4BFFF', '#F2BB67', '#FF8495']
    : ['#7778E8', '#23966D', '#7BCFE0', '#8B8FE8', '#C88A26', '#D95365'];

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const prods = await api.getForecastProducts();
        setAvailableProducts(prods);
        if (prods.length > 0) {
          const initial = prods.slice(0, 3).map((p) => p.product_id);
          setSelectedProductIds(initial);
        }
      } catch (err: any) {
        console.error('Failed to load forecast products:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    loadProducts();
  }, [workspace?.workspace_id]);

  const handleGenerateForecast = async (overrideProducts?: string[], overrideHorizon?: number) => {
    const pids = overrideProducts || selectedProductIds;
    const hdays = overrideHorizon !== undefined ? overrideHorizon : horizonDays;

    if (pids.length === 0) {
      setError('Please select at least one product for demand forecasting.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.generateForecast({
        product_ids: pids,
        horizon_days: hdays,
      });
      setForecastData(res);
    } catch (err: any) {
      console.error('Forecast generation error:', err);
      setError(err?.response?.data?.detail || 'Failed to generate demand forecast.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductIds.length > 0 && !initialLoading) {
      handleGenerateForecast();
    }
  }, [initialLoading]);

  const toggleProduct = (pid: string) => {
    setSelectedProductIds((prev) => {
      const next = prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid];
      return next.length === 0 ? prev : next;
    });
  };

  const selectAll = () => {
    setSelectedProductIds(availableProducts.map((p) => p.product_id));
  };

  const selectTop5 = () => {
    setSelectedProductIds(availableProducts.slice(0, 5).map((p) => p.product_id));
  };

  const chartData = React.useMemo(() => {
    if (!forecastData || !forecastData.forecasts) return [];
    const dateMap: Record<string, any> = {};
    forecastData.forecasts.forEach((item) => {
      if (!dateMap[item.forecast_date]) {
        dateMap[item.forecast_date] = { date: item.forecast_date, total_predicted: 0 };
      }
      dateMap[item.forecast_date][item.product_id] = item.predicted_units_sold;
      dateMap[item.forecast_date].total_predicted += item.predicted_units_sold;
    });
    return Object.values(dateMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [forecastData]);

  const exportForecastCSV = () => {
    if (!forecastData || !forecastData.forecasts) return;
    const headers = [
      'date', 'product_id', 'product_name', 'category',
      'predicted_units_sold', 'assumed_unit_price', 'assumed_discount_pct', 'assumed_promotion_flag',
    ];
    const rows = forecastData.forecasts.map((f) => [
      f.forecast_date, f.product_id, `"${f.product_name || ''}"`, `"${f.category || ''}"`,
      f.predicted_units_sold, f.assumed_unit_price || 0, f.assumed_discount_pct || 0, f.assumed_promotion_flag || 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `retailiq_forecast_${forecastData.horizon_days}d_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (initialLoading) {
    return <LoadingSpinner message="Initializing predictive forecast engine..." />;
  }

  if (!workspace?.has_data && availableProducts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          title="No Products Available to Forecast"
          description="Upload your store sales data or launch the sample store to compute forward-looking demand forecasts."
          icon={FileSpreadsheet}
          actionLabel="Load Sample Store"
          onAction={() => createSampleWorkspace()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Parameter Control Panel */}
      <div className="pastel-card p-5 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--primary)]" />
              Demand Forecasting Engine
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Project future unit demand based on historical velocity, seasonality, and promotional trends.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-2.5 py-1 rounded-lg bg-[var(--surface-secondary)] hover:opacity-80 text-[var(--text-primary)] text-xs font-semibold cursor-pointer transition-all"
            >
              Select All
            </button>
            <button
              onClick={selectTop5}
              className="px-2.5 py-1 rounded-lg bg-[var(--surface-secondary)] hover:opacity-80 text-[var(--text-primary)] text-xs font-semibold cursor-pointer transition-all"
            >
              Top 5 Only
            </button>
            <button
              onClick={() => handleGenerateForecast()}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Computing...' : 'Generate Forecast'}
            </button>
          </div>
        </div>

        {/* Forecast Horizon Slider */}
        <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
              Forecast Horizon:{' '}
              <span className="text-[var(--primary)] font-bold">{horizonDays} Days Ahead</span>
            </span>
            <div className="flex gap-1.5">
              {[7, 14, 21, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setHorizonDays(d);
                    handleGenerateForecast(undefined, d);
                  }}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    horizonDays === d
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            value={horizonDays}
            onChange={(e) => setHorizonDays(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
            style={{ backgroundColor: 'var(--border)' }}
          />
        </div>

        {/* Product Selector Pills */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
            Target Products ({selectedProductIds.length} selected):
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
            {availableProducts.map((p) => {
              const isSelected = selectedProductIds.includes(p.product_id);
              return (
                <button
                  key={p.product_id}
                  onClick={() => toggleProduct(p.product_id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-lavender)] text-[var(--accent-lavender-text)] font-semibold shadow-xs'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="font-mono text-[10px] mr-1 opacity-75">{p.product_id}</span>
                  {p.product_name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => handleGenerateForecast()} />}
      {loading && <LoadingSpinner message="Calculating predictive sales projections..." />}

      {/* Forecast Visualizations & Output */}
      {forecastData && !loading && (
        <>
          {/* Summary Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="pastel-card p-5">
              <span className="text-xs text-[var(--text-secondary)] uppercase font-bold">Total Projected Demand</span>
              <p className="text-2xl font-extrabold text-[var(--primary)] mt-1">
                {new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(
                  forecastData.total_predicted_units
                )}{' '}
                <span className="text-xs text-[var(--text-secondary)] font-normal">units</span>
              </p>
            </div>
            <div className="pastel-card p-5">
              <span className="text-xs text-[var(--text-secondary)] uppercase font-bold">Planning Horizon</span>
              <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-1">
                {forecastData.horizon_days} Days Ahead
              </p>
            </div>
          </div>

          {/* Forecast Trend Chart */}
          <div className="pastel-card p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                  Projected Daily Sales Horizon
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">Forecasted units by day</p>
              </div>
              <button
                onClick={exportForecastCSV}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--accent-lavender)] hover:opacity-90 text-[var(--accent-lavender-text)] text-xs font-semibold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Forecast CSV</span>
              </button>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" stroke={axisStroke} tick={{ fontSize: 10 }} />
                  <YAxis stroke={axisStroke} tick={{ fontSize: 10 }} />
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
                    formatter={(val: any, name: any) => [
                      `${Number(val).toFixed(1)} units`,
                      availableProducts.find((p) => p.product_id === name)?.product_name || name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: axisStroke }} />
                  {selectedProductIds.slice(0, 6).map((pid, idx) => {
                    const prodName =
                      availableProducts.find((p) => p.product_id === pid)?.product_name || pid;
                    return (
                      <Line
                        key={pid}
                        type="monotone"
                        dataKey={pid}
                        name={prodName}
                        stroke={chartColors[idx % chartColors.length]}
                        strokeWidth={2.5}
                        dot={{ r: 2 }}
                        activeDot={{ r: 5 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Forecast Table */}
          <div className="pastel-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--primary)]" />
                  Detailed Daily Forecast Ledger
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Itemized projected sales per product SKU
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
                  <tr>
                    <th className="py-2.5 pl-2">Forecast Date</th>
                    <th className="py-2.5">Product SKU</th>
                    <th className="py-2.5">Product Name</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5 text-right">Predicted Demand</th>
                    <th className="py-2.5 text-right pr-2">Assumed Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {forecastData.forecasts.map((item, idx) => (
                    <tr
                      key={`${item.product_id}-${item.forecast_date}-${idx}`}
                      className="hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <td className="py-2.5 pl-2 font-mono text-[var(--text-secondary)]">
                        {item.forecast_date}
                      </td>
                      <td className="py-2.5 font-mono text-[var(--primary)] font-bold">
                        {item.product_id}
                      </td>
                      <td className="py-2.5 text-[var(--text-primary)] font-medium">
                        {item.product_name}
                      </td>
                      <td className="py-2.5 text-[var(--text-secondary)]">{item.category}</td>
                      <td className="py-2.5 text-right font-bold text-[var(--primary)]">
                        {item.predicted_units_sold.toFixed(1)}
                      </td>
                      <td className="py-2.5 text-right pr-2 font-medium text-[var(--text-primary)]">
                        {currency} {item.assumed_unit_price?.toFixed(2) || '0.00'}
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
