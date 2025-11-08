import apiClient from './client';

// 客户档案管理API接口定义
// 基于客户档案管理模块设计方案v2.md

// 基础数据类型定义
export interface Location {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Meter {
  meter_id: string;
  multiplier: number;
}

export interface MeteringPoint {
  metering_point_id: string;
  allocation_percentage: number; // 0-100
  meter: Meter;
}

export interface UtilityAccount {
  account_id: string;
  metering_points: MeteringPoint[];
}

export interface Customer {
  id: string;
  user_name: string;
  short_name: string;
  user_type?: string;
  industry?: string;
  voltage?: string;
  region?: string;
  district?: string;
  address?: string;
  location?: Location;
  contact_person?: string;
  contact_phone?: string;
  status: 'active' | 'inactive' | 'deleted';
  utility_accounts: UtilityAccount[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CustomerCreate {
  user_name: string;
  short_name: string;
  user_type?: string;
  industry?: string;
  voltage?: string;
  region?: string;
  district?: string;
  address?: string;
  location?: Location;
  contact_person?: string;
  contact_phone?: string;
  utility_accounts?: UtilityAccount[];
}

export interface CustomerUpdate {
  user_name?: string;
  short_name?: string;
  user_type?: string;
  industry?: string;
  voltage?: string;
  region?: string;
  district?: string;
  address?: string;
  location?: Location;
  contact_person?: string;
  contact_phone?: string;
  utility_accounts?: UtilityAccount[];
}

// 查询参数类型定义
// 客户列表项接口（对应后端CustomerListItem）
export interface CustomerListItem {
  id: string;
  user_name: string;
  short_name: string;
  user_type?: string;
  industry?: string;
  voltage?: string;
  region?: string;
  status: 'active' | 'inactive' | 'deleted';
  account_count: number;
  created_at: string;
  updated_at: string;
  // 添加列表中需要的额外字段（虽然在后端CustomerListItem中没有，但前端显示需要）
  contact_person?: string;
  contact_phone?: string;
  // 为了兼容表格中的utility_accounts字段
  utility_accounts?: { length: number };
}

export interface CustomerListParams {
  keyword?: string;
  user_type?: string;
  industry?: string;
  region?: string;
  status?: 'active' | 'inactive' | 'deleted';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// API接口函数实现

/**
 * 获取客户列表
 * @param params 查询参数
 */
export const getCustomers = (params?: CustomerListParams) => {
  return apiClient.get<PaginatedResponse<CustomerListItem>>('/api/v1/customers', { params });
};

/**
 * 获取客户详情
 * @param customerId 客户ID
 */
export const getCustomer = (customerId: string) => {
  return apiClient.get<Customer>(`/api/v1/customers/${customerId}`);
};

/**
 * 创建新客户
 * @param customerData 客户数据
 */
export const createCustomer = (customerData: CustomerCreate) => {
  return apiClient.post<Customer>('/api/v1/customers', customerData);
};

/**
 * 更新客户信息
 * @param customerId 客户ID
 * @param customerData 更新数据
 */
export const updateCustomer = (customerId: string, customerData: CustomerUpdate) => {
  return apiClient.put<Customer>(`/api/v1/customers/${customerId}`, customerData);
};

/**
 * 删除客户
 * @param customerId 客户ID
 */
export const deleteCustomer = (customerId: string) => {
  return apiClient.delete(`/api/v1/customers/${customerId}`);
};

// 户号管理接口

/**
 * 为客户添加户号
 * @param customerId 客户ID
 * @param accountData 户号数据
 */
export const addCustomerAccount = (customerId: string, accountData: { account_id: string }) => {
  return apiClient.post<UtilityAccount>(`/api/v1/customers/${customerId}/accounts`, accountData);
};

/**
 * 更新客户户号
 * @param customerId 客户ID
 * @param accountId 户号ID
 * @param accountData 更新数据
 */
export const updateCustomerAccount = (
  customerId: string,
  accountId: string,
  accountData: { account_id: string }
) => {
  return apiClient.put<UtilityAccount>(`/api/v1/customers/${customerId}/accounts/${accountId}`, accountData);
};

/**
 * 删除客户户号
 * @param customerId 客户ID
 * @param accountId 户号ID
 */
export const deleteCustomerAccount = (customerId: string, accountId: string) => {
  return apiClient.delete(`/api/v1/customers/${customerId}/accounts/${accountId}`);
};

// 计量点管理接口

/**
 * 为户号添加计量点
 * @param customerId 客户ID
 * @param accountId 户号ID
 * @param meteringPointData 计量点数据
 */
export const addMeteringPoint = (
  customerId: string,
  accountId: string,
  meteringPointData: {
    metering_point_id: string;
    allocation_percentage: number;
    meter: {
      meter_id: string;
      multiplier: number;
    };
  }
) => {
  return apiClient.post<MeteringPoint>(
    `/api/v1/customers/${customerId}/accounts/${accountId}/metering-points`,
    meteringPointData
  );
};

/**
 * 更新计量点信息
 * @param customerId 客户ID
 * @param accountId 户号ID
 * @param meteringPointId 计量点ID
 * @param meteringPointData 更新数据
 */
export const updateMeteringPoint = (
  customerId: string,
  accountId: string,
  meteringPointId: string,
  meteringPointData: {
    metering_point_id?: string;
    allocation_percentage?: number;
    meter?: {
      meter_id?: string;
      multiplier?: number;
    };
  }
) => {
  return apiClient.put<MeteringPoint>(
    `/api/v1/customers/${customerId}/accounts/${accountId}/metering-points/${meteringPointId}`,
    meteringPointData
  );
};

/**
 * 删除计量点
 * @param customerId 客户ID
 * @param accountId 户号ID
 * @param meteringPointId 计量点ID
 */
export const deleteMeteringPoint = (customerId: string, accountId: string, meteringPointId: string) => {
  return apiClient.delete(
    `/api/v1/customers/${customerId}/accounts/${accountId}/metering-points/${meteringPointId}`
  );
};

// 数据一致性管理接口

/**
 * 获取电表信息（用于自动填充）
 * @param meterId 电表ID
 */
export const getMeterInfo = (meterId: string) => {
  return apiClient.get<{
    meter_id: string;
    multiplier: number;
    [key: string]: any;
  }>(`/api/v1/meter-info/${meterId}`);
};

/**
 * 同步更新电表信息
 * @param meterId 电表ID
 * @param updateData 更新数据
 */
export const syncUpdateMeter = (
  meterId: string,
  updateData: {
    multiplier: number;
    sync_all: boolean;
  }
) => {
  return apiClient.post(`/api/v1/meters/${meterId}/sync-update`, updateData);
};

// 常用查询选项
export const USER_TYPES = [
  '标准工商业',
  '大型工商业',
  '农业用户',
  '居民用户'
];

export const INDUSTRIES = [
  '制造业',
  '建筑业',
  '批发和零售业',
  '交通运输业',
  '住宿和餐饮业',
  '信息传输业',
  '金融业',
  '房地产业',
  '租赁和商务服务业',
  '科学研究和技术服务业',
  '水利环境和公共设施管理业',
  '居民服务和其他服务业',
  '教育',
  '卫生和社会工作',
  '文化体育和娱乐业',
  '公共管理和社会组织',
  '国际组织'
];

export const VOLTAGE_LEVELS = [
  '220V',
  '380V',
  '10kV',
  '35kV',
  '110kV',
  '220kV',
  '500kV'
];

export const REGIONS = [
  '南昌市',
  '九江市',
  '景德镇市',
  '萍乡市',
  '新余市',
  '鹰潭市',
  '赣州市',
  '宜春市',
  '上饶市',
  '吉安市',
  '抚州市'
];

export default {
  // 基础CRUD
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,

  // 户号管理
  addCustomerAccount,
  updateCustomerAccount,
  deleteCustomerAccount,

  // 计量点管理
  addMeteringPoint,
  updateMeteringPoint,
  deleteMeteringPoint,

  // 数据一致性
  getMeterInfo,
  syncUpdateMeter,

  // 常量
  USER_TYPES,
  INDUSTRIES,
  VOLTAGE_LEVELS,
  REGIONS
};