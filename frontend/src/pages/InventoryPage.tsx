import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Search,
  Download,
  Edit2,
  X,
  Save,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../services/api';
import type { InventoryResponse, InventoryRecommendation, ProductUpdateInput } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { useWorkspace } from '../context/WorkspaceContext';

export const InventoryPage: React.FC = () => {
  const { workspace, currency, createSampleWorkspace } = useWorkspace();
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'priority' | 'recommended_order_quantity' | 'current_stock'>('priority');

  // Edit Product Modal State
  const [editingItem, setEditingItem] = useState<InventoryRecommendation | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [editLeadTime, setEditLeadTime] = useState<number>(5);
  const [editSafetyStock, setEditSafetyStock] = useState<number>(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInventoryRecommendations();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load inventory recommendations:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch inventory intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [workspace?.workspace_id]);

  const categories = data
    ? Array.from(new Set(data.recommendations.map((r) => r.category))).filter(Boolean)
    : [];

  const filteredRecommendations = React.useMemo(() => {
    if (!data) return [];
    return data.recommendations
      .filter((item) => {
        const matchesSearch =
          item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.product_id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || item.category === selectedCategory;
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'REORDER' && (item.status === 'Reorder Required' || item.status === 'Out of Stock' || item.recommendation === 'REORDER')) ||
          (statusFilter === 'HEALTHY' && (item.status === 'Healthy' || item.recommendation === 'STOCK SUFFICIENT'));
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return a.priority - b.priority;
        if (sortBy === 'recommended_order_quantity')
          return b.recommended_order_quantity - a.recommended_order_quantity;
        if (sortBy === 'current_stock') return a.current_stock - b.current_stock;
        return 0;
      });
  }, [data, searchQuery, selectedCategory, statusFilter, sortBy]);

  const reorderCount =
    data?.recommendations.filter(
      (r) => r.status === 'Reorder Required' || r.status === 'Out of Stock' || r.recommended_order_quantity > 0
    ).length || 0;
  const totalSuggestedUnits =
    data?.recommendations.reduce((acc, r) => acc + r.recommended_order_quantity, 0) || 0;
  const healthyCount =
    data?.recommendations.filter(
      (r) => r.status === 'Healthy' || r.recommended_order_quantity === 0
    ).length || 0;

  const openEditModal = (item: InventoryRecommendation) => {
    setEditingItem(item);
    setEditStock(item.current_stock);
    setEditLeadTime(item.lead_time_days);
    setEditSafetyStock(item.safety_stock_units);
    setSaveSuccess(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      setSavingEdit(true);
      const updateData: ProductUpdateInput = {
        current_stock: Number(editStock),
        supplier_lead_time_days: Number(editLeadTime),
        safety_stock_units: Number(editSafetyStock),
      };
      await api.updateProductInventory(editingItem.product_id, updateData);
      setSaveSuccess(true);
      setTimeout(() => {
        setEditingItem(null);
        fetchInventory();
      }, 500);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update product inventory');
    } finally {
      setSavingEdit(false);
    }
  };

  const exportInventoryCSV = () => {
    if (!data) return;
    const headers = [
      'priority',
      'product_id',
      'product_name',
      'category',
      'current_stock',
      'lead_time_days',
      'forecast_demand_during_lead_time',
      'safety_stock_units',
      'recommended_order_quantity',
      'status',
    ];
    const rows = filteredRecommendations.map((r) => [
      r.priority,
      r.product_id,
      `"${r.product_name}"`,
      `"${r.category}"`,
      r.current_stock,
      r.lead_time_days,
      r.forecast_demand_during_lead_time,
      r.safety_stock_units,
      r.recommended_order_quantity,
      `"${r.status || r.recommendation}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `retailiq_inventory_plan_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!workspace?.has_data) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          title="No Inventory Records in Workspace"
          description="Upload your store sales data or launch the sample store to calculate lead times, stockout risks, and automated purchase quantities."
          icon={FileSpreadsheet}
          actionLabel="Load Sample Store"
          onAction={() => createSampleWorkspace()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="pastel-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)] font-bold uppercase">Reorder Triggers</span>
            <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
          </div>
          <p className="text-2xl font-extrabold text-[var(--warning)] mt-1">
            {reorderCount} <span className="text-xs text-[var(--text-secondary)] font-normal">Products</span>
          </p>
        </div>

        <div className="pastel-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)] font-bold uppercase">Total Recommended Order</span>
            <Boxes className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <p className="text-2xl font-extrabold text-[var(--primary)] mt-1">
            +{totalSuggestedUnits} <span className="text-xs text-[var(--text-secondary)] font-normal">Units</span>
          </p>
        </div>

        <div className="pastel-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)] font-bold uppercase">Healthy Stock</span>
            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
          </div>
          <p className="text-2xl font-extrabold text-[var(--success)] mt-1">
            {healthyCount} <span className="text-xs text-[var(--text-secondary)] font-normal">Products</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="pastel-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search product SKU or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex rounded-xl bg-[var(--surface-secondary)] p-0.5 border border-[var(--border)] text-xs">
            {(['ALL', 'REORDER', 'HEALTHY'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg transition-colors text-[11px] font-semibold cursor-pointer ${
                  statusFilter === s
                    ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {s === 'ALL' ? 'All' : s === 'REORDER' ? 'Reorder Needed' : 'Healthy Stock'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={exportInventoryCSV}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Replenishment Plan</span>
        </button>
      </div>

      {loading && <LoadingSpinner message="Calculating dynamic replenishment buffers..." />}
      {error && <ErrorBanner message={error} onRetry={fetchInventory} />}

      {/* Inventory Recommendations Table */}
      {!loading && data && (
        <div className="pastel-card p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold">
                  <th className="pb-3 pl-2">Priority</th>
                  <th className="pb-3">SKU</th>
                  <th className="pb-3">Product Name</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right">Current Stock</th>
                  <th className="pb-3 text-right">Lead Time</th>
                  <th className="pb-3 text-right">Lead Demand</th>
                  <th className="pb-3 text-right">Safety Stock</th>
                  <th className="pb-3 text-right">Order Qty</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-center pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredRecommendations.map((item) => {
                  const isReorder = item.recommended_order_quantity > 0;
                  return (
                    <tr
                      key={item.product_id}
                      className={`hover:bg-[var(--surface-secondary)] transition-colors ${
                        isReorder ? 'bg-[var(--warning)]/10' : ''
                      }`}
                    >
                      <td className="py-3 pl-2 font-mono font-bold text-[var(--text-secondary)]">
                        #{item.priority}
                      </td>
                      <td className="py-3 font-mono text-[var(--primary)] font-bold">
                        {item.product_id}
                      </td>
                      <td className="py-3 font-medium text-[var(--text-primary)]">
                        {item.product_name}
                      </td>
                      <td className="py-3 text-[var(--text-secondary)]">{item.category}</td>
                      <td className="py-3 text-right font-medium text-[var(--text-primary)]">
                        {item.current_stock}
                      </td>
                      <td className="py-3 text-right text-[var(--text-secondary)]">
                        {item.lead_time_days}d
                      </td>
                      <td className="py-3 text-right font-semibold text-[var(--primary)]">
                        {item.forecast_demand_during_lead_time.toFixed(1)}
                      </td>
                      <td className="py-3 text-right text-[var(--text-secondary)]">
                        {item.safety_stock_units}
                      </td>
                      <td className="py-3 text-right font-bold text-sm">
                        {item.recommended_order_quantity > 0 ? (
                          <span className="text-[var(--warning)]">
                            +{item.recommended_order_quantity}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)]">0</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {isReorder ? (
                          <span className="pastel-badge-warning inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" /> REORDER
                          </span>
                        ) : (
                          <span className="pastel-badge-mint inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> HEALTHY
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center pr-2">
                        <button
                          onClick={() => openEditModal(item)}
                          title="Edit Inventory Parameters"
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Inventory Parameters Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="pastel-card p-6 max-w-md w-full bg-[var(--surface)] shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Update Inventory Parameters
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {editingItem.product_name} ({editingItem.product_id})
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Current Stock On Hand (units)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={editStock}
                  onChange={(e) => setEditStock(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Supplier Delivery Lead Time (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  required
                  value={editLeadTime}
                  onChange={(e) => setEditLeadTime(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Safety Stock Buffer (units)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={editSafetyStock}
                  onChange={(e) => setEditSafetyStock(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Updated!</span>
                    </>
                  ) : savingEdit ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Parameters</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
