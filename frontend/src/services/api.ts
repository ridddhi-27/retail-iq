import axios from 'axios';
import type {
  HealthResponse,
  WorkspaceOut,
  WorkspaceStatusResponse,
  ExcelSheetsResponse,
  ProductUpdateInput,
  DashboardSummary,
  SalesAnalytics,
  Product,
  ForecastRequest,
  ForecastResponse,
  InventoryResponse,
  ModelMetricsResponse,
  DataPreviewResponse,
  DataImportResponse,
  DataImportHistory,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 120000,
});

// Attach saved workspace token header if stored locally as fallback/override
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('retailiq_token');
  if (token && !config.headers['X-Workspace-Token']) {
    config.headers['X-Workspace-Token'] = token;
  }
  return config;
});

// Intercept responses to store newly assigned session tokens
apiClient.interceptors.response.use((response) => {
  if (response.data && response.data.session_token) {
    localStorage.setItem('retailiq_token', response.data.session_token);
  }
  return response;
});

export const api = {
  // ── Workspaces & Sessions ──
  initWorkspace: async (forceNew = false): Promise<WorkspaceOut> => {
    const response = await apiClient.post<WorkspaceOut>(`/workspaces/init${forceNew ? '?force_new=true' : ''}`);
    if (response.data.session_token) {
      localStorage.setItem('retailiq_token', response.data.session_token);
    }
    return response.data;
  },

  createSampleWorkspace: async (): Promise<WorkspaceOut> => {
    const response = await apiClient.post<WorkspaceOut>('/workspaces/sample');
    if (response.data.session_token) {
      localStorage.setItem('retailiq_token', response.data.session_token);
    }
    return response.data;
  },

  getCurrentWorkspace: async (): Promise<WorkspaceStatusResponse> => {
    const response = await apiClient.get<WorkspaceStatusResponse>('/workspaces/current');
    return response.data;
  },

  clearWorkspace: async (): Promise<{ status: string; deleted_sales: number; deleted_products: number }> => {
    const response = await apiClient.post('/workspaces/clear');
    return response.data;
  },

  // ── Health ──
  getHealth: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },

  // ── Dashboard ──
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  },

  // ── Sales Analytics ──
  getSalesAnalytics: async (params?: {
    start_date?: string;
    end_date?: string;
    product_id?: string;
    category?: string;
  }): Promise<SalesAnalytics> => {
    const response = await apiClient.get<SalesAnalytics>('/analytics/sales', { params });
    return response.data;
  },

  getCategories: async (): Promise<{ categories: Array<{ category: string; total_units: number; total_revenue: number }> }> => {
    const response = await apiClient.get('/analytics/categories');
    return response.data;
  },

  // ── Products ──
  getProducts: async (category?: string): Promise<Product[]> => {
    const response = await apiClient.get<Product[]>('/products', {
      params: category ? { category } : undefined,
    });
    return response.data;
  },

  updateProductInventory: async (productId: string, data: ProductUpdateInput): Promise<Product> => {
    const response = await apiClient.put<Product>(`/inventory/products/${encodeURIComponent(productId)}`, data);
    return response.data;
  },

  // ── Demand Forecasting ──
  getForecastProducts: async (): Promise<Array<{ product_id: string; product_name: string; category: string }>> => {
    const response = await apiClient.get('/forecast/products');
    return response.data;
  },

  generateForecast: async (data: ForecastRequest): Promise<ForecastResponse> => {
    const response = await apiClient.post<ForecastResponse>('/forecast', data);
    return response.data;
  },

  getForecastHistory: async (): Promise<any[]> => {
    const response = await apiClient.get('/forecast/history');
    return response.data;
  },

  // ── Inventory Intelligence ──
  getInventoryRecommendations: async (): Promise<InventoryResponse> => {
    const response = await apiClient.get<InventoryResponse>('/inventory/recommendations');
    return response.data;
  },

  // ── Model Status ──
  getModelMetrics: async (): Promise<ModelMetricsResponse> => {
    const response = await apiClient.get<ModelMetricsResponse>('/model/metrics');
    return response.data;
  },

  // ── Data Ingestion & Excel Support ──
  inspectSheets: async (file: File): Promise<ExcelSheetsResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ExcelSheetsResponse>('/data/sheets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  previewUpload: async (file: File, sheetName?: string): Promise<DataPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (sheetName) {
      formData.append('sheet_name', sheetName);
    }
    const response = await apiClient.post<DataPreviewResponse>('/data/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  importUpload: async (file: File, sheetName?: string): Promise<DataImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (sheetName) {
      formData.append('sheet_name', sheetName);
    }
    const response = await apiClient.post<DataImportResponse>('/data/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getImportHistory: async (): Promise<DataImportHistory[]> => {
    const response = await apiClient.get<DataImportHistory[]>('/data/imports');
    return response.data;
  },

  getTemplateDownloadUrl: (format: 'csv' | 'xlsx'): string => {
    return `${API_BASE_URL}/data/template/${format}`;
  },

  // ── Exports ──
  getSalesExportUrl: (params?: { start_date?: string; end_date?: string; product_id?: string }): string => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.product_id) searchParams.append('product_id', params.product_id);
    const query = searchParams.toString();
    return `${API_BASE_URL}/export/sales${query ? `?${query}` : ''}`;
  },
};
