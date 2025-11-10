import apiClient from './client';

// 零售合同管理API接口定义
// 基于零售合同管理模块设计方案

// 基础数据类型定义
export interface Contract {
  id: string;
  _id?: string; // 保持向后兼容
  contract_name: string;
  package_name: string;
  package_id: string;
  customer_name: string;
  customer_id: string;
  purchasing_electricity_quantity: number;
  purchase_start_month: string;
  purchase_end_month: string;
  status: 'pending' | 'active' | 'expired';
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// 列表响应类型
export interface ContractListResponse {
  items: Contract[];
  total: number;
  page: number;
  page_size: number;
}

// 表单数据类型（用于创建/编辑）
export interface ContractFormData {
  contract_name: string;
  package_name: string;
  package_id: string;
  customer_name: string;
  customer_id: string;
  purchasing_electricity_quantity: number;
  purchase_start_month: Date | null;
  purchase_end_month: Date | null;
}

// 创建合同请求类型
export interface ContractCreate {
  contract_name?: string;
  package_name: string;
  package_id: string;
  customer_name: string;
  customer_id: string;
  purchasing_electricity_quantity: number;
  purchase_start_month: string;
  purchase_end_month: string;
}

// 更新合同请求类型
export interface ContractUpdate {
  contract_name?: string;
  package_name?: string;
  package_id?: string;
  customer_name?: string;
  customer_id?: string;
  purchasing_electricity_quantity?: number;
  purchase_start_month?: string;
  purchase_end_month?: string;
}

// 查询参数类型
export interface ContractListParams {
  contract_name?: string;
  package_name?: string;
  customer_name?: string;
  status?: 'pending' | 'active' | 'expired' | 'all';
  purchase_start_month?: string;
  purchase_end_month?: string;
  page?: number;
  page_size?: number;
}

// 导入结果类型
export interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
  suggestion?: string;
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: ImportError[];
}

// 导出参数类型
export interface ExportParams {
  package_name?: string;
  customer_name?: string;
  status?: 'pending' | 'active' | 'expired' | 'all';
  start_month?: string;
  end_month?: string;
}

// API接口函数实现

/**
 * 获取合同列表
 * @param params 查询参数
 */
export const getContracts = (params?: ContractListParams) => {
  return apiClient.get<ContractListResponse>('/api/v1/retail-contracts', { params });
};

/**
 * 获取合同详情
 * @param contractId 合同ID
 */
export const getContract = (contractId: string) => {
  return apiClient.get<Contract>(`/api/v1/retail-contracts/${contractId}`);
};

/**
 * 创建新合同
 * @param contractData 合同数据
 */
export const createContract = (contractData: ContractCreate) => {
  return apiClient.post<Contract>('/api/v1/retail-contracts', contractData);
};

/**
 * 更新合同信息
 * @param contractId 合同ID
 * @param contractData 更新数据
 */
export const updateContract = (contractId: string, contractData: ContractUpdate) => {
  return apiClient.put<Contract>(`/api/v1/retail-contracts/${contractId}`, contractData);
};

/**
 * 删除合同
 * @param contractId 合同ID
 */
export const deleteContract = (contractId: string) => {
  return apiClient.delete(`/api/v1/retail-contracts/${contractId}`);
};

/**
 * 导入合同（Excel）
 * @param file Excel文件
 */
export const importContracts = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<ImportResult>('/api/v1/retail-contracts/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

/**
 * 导出合同（Excel）
 * @param params 查询参数（用于筛选导出数据）
 */
export const exportContracts = (params?: ExportParams) => {
  return apiClient.get('/api/v1/retail-contracts/export', {
    params,
    responseType: 'blob'
  });
};

// 导出默认对象
export default {
  getContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
  importContracts,
  exportContracts
};
