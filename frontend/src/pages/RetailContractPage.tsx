import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField,
  Button, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, TablePagination, IconButton, Tooltip,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Snackbar, Chip, useTheme, useMediaQuery,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation, matchPath } from 'react-router-dom';
import {
  getContracts,
  deleteContract,
  Contract,
  ContractListParams
} from '../api/retail-contracts';
import { ContractEditorDialog } from '../components/ContractEditorDialog';
import { ContractDetailsDialog } from '../components/ContractDetailsDialog';
import { getContract } from '../api/retail-contracts';

// 状态中文映射
const statusMap: { [key: string]: string } = {
  pending: '待生效',
  active: '生效',
  expired: '已过期',
};

// 根据状态获取Chip颜色
const getStatusChipColor = (status: string): 'default' | 'success' | 'warning' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'expired':
      return 'warning';
    case 'pending':
    default:
      return 'default';
  }
};

const RetailContractPage: React.FC = () => {
  // 路由参数和导航
  const params = useParams<{ contractId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // 响应式设计
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 使用 matchPath 解析当前路由状态
  const createMatch = matchPath('/customer/retail-contracts/create', location.pathname);
  const viewMatch = matchPath('/customer/retail-contracts/view/:contractId', location.pathname);
  const editMatch = matchPath('/customer/retail-contracts/edit/:contractId', location.pathname);

  // 根据当前路由确定状态
  const isCreateView = !!createMatch;
  const isDetailView = !!viewMatch;
  const isEditView = !!editMatch;
  const currentContractId = params.contractId;

  // 状态管理
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 查询区域折叠状态
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // 筛选条件
  const [filters, setFilters] = useState<ContractListParams>({
    contract_name: '',
    package_name: '',
    customer_name: '',
    status: undefined,
    purchase_start_month: undefined,
    purchase_end_month: undefined,
  });

  // 检查是否有活跃的筛选条件
  const hasActiveFilters = Boolean(
    filters.contract_name ||
    filters.package_name ||
    filters.customer_name ||
    filters.status ||
    filters.purchase_start_month ||
    filters.purchase_end_month
  );

  // 对话框状态 (仅桌面端使用)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'view'>('create');

  // 移动端合同详情状态
  const [mobileContractData, setMobileContractData] = useState<Contract | null>(null);
  const [mobileContractLoading, setMobileContractLoading] = useState(false);
  const [mobileContractError, setMobileContractError] = useState<string | null>(null);

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);

  // Snackbar状态
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Snackbar辅助函数
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 数据加载
  const fetchContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ContractListParams = {
        ...filters,
        page: page + 1,
        page_size: pageSize
      };
      const response = await getContracts(params);
      setContracts(response.data.items);
      setTotal(response.data.total);
    } catch (err: any) {
      console.error('加载合同列表失败:', err);
      const errorMsg = err.response?.data?.detail || err.message || '加载合同列表失败';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
      setContracts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [filters, page, pageSize]);

  // 监听location.state变化，处理移动端返回后的刷新
  useEffect(() => {
    if (location.state?.refresh) {
      fetchContracts();
      // 清除刷新状态，避免重复刷新
      navigate('/customer/retail-contracts', { replace: true, state: {} });
    }
  }, [location.state]);

  // 加载移动端合同详情数据
  const loadMobileContractData = async (contractId: string) => {
    setMobileContractLoading(true);
    setMobileContractError(null);
    try {
      const response = await getContract(contractId);
      setMobileContractData(response.data);
    } catch (err: any) {
      console.error('加载合同详情失败:', err);
      setMobileContractError(err.response?.data?.detail || err.message || '加载合同详情失败');
      setMobileContractData(null);
    } finally {
      setMobileContractLoading(false);
    }
  };

  // 根据路由参数加载移动端合同数据
  useEffect(() => {
    console.log('移动端数据加载:', { currentContractId, isDetailView, isEditView });
    if (currentContractId && (isDetailView || isEditView)) {
      loadMobileContractData(currentContractId);
    } else {
      setMobileContractData(null);
      setMobileContractError(null);
    }
  }, [currentContractId, isDetailView, isEditView]);

  // 移动端返回列表
  const handleBackToList = () => {
    navigate('/customer/retail-contracts');
  };

  // 操作处理
  const handleCreate = () => {
    if (isMobile) {
      // 移动端使用路由导航
      navigate('/customer/retail-contracts/create');
    } else {
      // 桌面端使用对话框
      setSelectedContract(null);
      setEditorMode('create');
      setIsEditorOpen(true);
    }
  };

  const handleView = (contract: Contract) => {
    if (isMobile) {
      // 移动端使用路由导航
      navigate(`/customer/retail-contracts/view/${contract.id}`);
    } else {
      // 桌面端使用详情对话框
      setSelectedContractId(contract.id);
      setIsDetailsDialogOpen(true);
    }
  };

  const handleEdit = async (contract: Contract) => {
    if (isMobile) {
      // 移动端使用路由导航
      navigate(`/customer/retail-contracts/edit/${contract.id}`);
    } else {
      // 桌面端使用编辑对话框，需要获取完整数据
      try {
        const response = await getContract(contract.id);
        setSelectedContract(response.data);
        setEditorMode('edit');
        setIsEditorOpen(true);
      } catch (err: any) {
        console.error('加载合同详情失败:', err);
        setSnackbar({
          open: true,
          message: err.response?.data?.detail || err.message || '加载合同详情失败',
          severity: 'error'
        });
      }
    }
  };

  const handleDeleteClick = (contract: Contract) => {
    setContractToDelete(contract);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contractToDelete) return;

    try {
      await deleteContract(contractToDelete.id);
      setDeleteDialogOpen(false);
      setContractToDelete(null);
      fetchContracts();
      showSnackbar('合同删除成功', 'success');
    } catch (error: any) {
      console.error('删除失败', error);
      const errorMsg = error.response?.data?.detail || '删除失败，请重试';
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setContractToDelete(null);
  };

  const handleSearch = () => {
    setPage(0);
    fetchContracts();
  };

  const handleReset = () => {
    setFilters({
      package_name: '',
      customer_name: '',
      status: undefined,
      purchase_start_month: undefined,
      purchase_end_month: undefined,
    });
    setPage(0);
    fetchContracts();
  };

  
  // 格式化月份显示
  const formatMonthDisplay = (dateString: string) => {
    try {
      if (!dateString) return '-';
      const date = parseISO(dateString);
      return format(date, 'yyyy-MM');
    } catch (error) {
      return dateString;
    }
  };

  // 移动端渲染移动卡片布局
  const renderMobileCards = () => (
    <Box>
      {contracts.map((contract) => (
        <Paper key={contract.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
          {/* 合同名称（作为卡片标题，可点击） */}
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' },
              fontWeight: 'bold',
              fontSize: '1.1rem',
              mb: 2
            }}
            onClick={() => handleView(contract)}
          >
            {contract.contract_name || '未命名合同'}
          </Typography>

          {/* 客户信息和套餐信息（两列布局） */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">客户名称:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                {contract.customer_name}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">套餐名称:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                {contract.package_name}
              </Typography>
            </Box>
          </Box>

          {/* 电量和时间信息 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">购买电量:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {contract.purchasing_electricity_quantity.toLocaleString()} kWh
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">购电月份:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {formatMonthDisplay(contract.purchase_start_month)} 至 {formatMonthDisplay(contract.purchase_end_month)}
              </Typography>
            </Box>
          </Box>

          {/* 状态和操作区域 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">状态:</Typography>
              <Chip
                label={statusMap[contract.status] || contract.status}
                color={getStatusChipColor(contract.status) as any}
                size="small"
              />
            </Box>

            {/* 操作按钮 */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {contract.status === 'pending' && (
                <>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => handleEdit(contract)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="删除">
                    <IconButton size="small" onClick={() => handleDeleteClick(contract)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>
        </Paper>
      ))}
    </Box>
  );

  // 渲染操作按钮（根据状态控制）
  const renderTableActions = (contract: Contract) => (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
      {contract.status === 'pending' && (
        <>
          <Tooltip title="编辑">
            <IconButton size="small" onClick={() => handleEdit(contract)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="删除">
            <IconButton size="small" onClick={() => handleDeleteClick(contract)}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Box>
  );

  // 详情对话框处理函数
  const handleCloseDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedContractId(null);
  };

  // 从详情对话框处理编辑
  const handleEditFromDetails = (contractId: string) => {
    if (isMobile) {
      // 移动端使用路由导航
      navigate(`/customer/retail-contracts/edit/${contractId}`);
    } else {
      // 桌面端关闭详情对话框，打开编辑对话框
      setIsDetailsDialogOpen(false);
      setSelectedContractId(null);

      // 获取合同数据并打开编辑对话框
      getContract(contractId)
        .then(response => {
          setSelectedContract(response.data);
          setEditorMode('edit');
          setIsEditorOpen(true);
        })
        .catch(err => {
          console.error('获取合同详情失败:', err);
          setError(err.response?.data?.detail || err.message || '获取合同详情失败');
        });
    }
  };

  // 从详情对话框处理复制
  const handleCopyFromDetails = (contractId: string) => {
    if (isMobile) {
      // 移动端使用路由导航
      navigate(`/customer/retail-contracts/create?copyFrom=${contractId}`);
    } else {
      // 桌面端关闭详情对话框，打开复制对话框
      setIsDetailsDialogOpen(false);
      setSelectedContractId(null);

      // 获取合同数据并打开复制对话框
      getContract(contractId)
        .then(response => {
          setSelectedContract(response.data);
          setEditorMode('create');
          setIsEditorOpen(true);
        })
        .catch(err => {
          console.error('获取合同详情失败:', err);
          setError(err.response?.data?.detail || err.message || '获取合同详情失败');
        });
    }
  };

  // 保存成功后的回调
  const handleSaveSuccess = () => {
    if (isMobile && isCreateView) {
      // 移动端新增成功后返回列表并刷新
      navigate('/customer/retail-contracts', { state: { refresh: true } });
    } else if (isMobile && isEditView) {
      // 移动端编辑成功后返回详情页
      if (currentContractId) {
        navigate(`/customer/retail-contracts/view/${currentContractId}`);
      } else {
        navigate('/customer/retail-contracts');
      }
    } else {
      // 桌面端成功后关闭对话框并重新加载列表
      setIsEditorOpen(false);
      setSelectedContract(null);
      fetchContracts();
      showSnackbar(
        editorMode === 'create' ? '合同创建成功' : '合同更新成功',
        'success'
      );
    }
  };

  // 移动端：渲染新增页面
  if (isMobile && isCreateView) {
    return (
      <Box sx={{ width: '100%' }}>
        {/* 返回按钮和标题 */}
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={handleBackToList} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">新增合同</Typography>
          </Box>
        </Paper>

        {/* 合同新增内容 */}
        <ContractEditorDialog
          open={true}
          mode="create"
          contract={null}
          onClose={handleBackToList}
          onSuccess={handleSaveSuccess}
        />
      </Box>
    );
  }

  // 移动端：渲染详情页面
  if (isMobile && isDetailView) {
    return (
      <Box sx={{ width: '100%' }}>
        {/* 返回按钮和标题 */}
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={handleBackToList} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">合同详情</Typography>
          </Box>
        </Paper>

        {/* 合同详情内容 */}
        {mobileContractLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>正在加载合同详情...</Typography>
          </Box>
        ) : mobileContractError ? (
          <Alert severity="error">{mobileContractError}</Alert>
        ) : mobileContractData ? (
          <ContractDetailsDialog
            open={true}
            contractId={currentContractId || null}
            onClose={handleBackToList}
            onEdit={(contractId) => navigate(`/customer/retail-contracts/edit/${contractId}`)}
            onCopy={(contractId) => navigate(`/customer/retail-contracts/create?copyFrom=${contractId}`)}
          />
        ) : currentContractId ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>正在加载合同数据...</Typography>
          </Box>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Typography variant="body2" color="text.secondary">
              未找到合同信息
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // 移动端：渲染编辑页面
  if (isMobile && isEditView) {
    return (
      <Box sx={{ width: '100%' }}>
        {/* 返回按钮和标题 */}
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={handleBackToList} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">编辑合同</Typography>
          </Box>
        </Paper>

        {/* 合同编辑内容 */}
        {mobileContractLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : mobileContractError ? (
          <Alert severity="error">{mobileContractError}</Alert>
        ) : mobileContractData ? (
          <ContractEditorDialog
            open={true}
            mode="edit"
            contract={mobileContractData}
            onClose={handleBackToList}
            onSuccess={handleSaveSuccess}
          />
        ) : null}
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
      <Box sx={{ width: '100%' }}>

        {/* 查询区域 */}
        <Paper variant="outlined" sx={{ mb: 2 }}>
          {/* 移动端折叠标题栏 */}
          {isMobile ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterListIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  筛选条件
                </Typography>
                {hasActiveFilters && (
                  <Chip
                    size="small"
                    label="已筛选"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
              {isFilterExpanded ? (
                <ExpandLessIcon sx={{ color: 'text.secondary' }} />
              ) : (
                <ExpandMoreIcon sx={{ color: 'text.secondary' }} />
              )}
            </Box>
          ) : null}

          {/* 桌面端始终显示，移动端展开时显示 */}
          {(!isMobile || isFilterExpanded) && (
            <Box sx={{ p: { xs: isMobile ? 1 : 2, sm: 2 } }}>
              <Box sx={{
                display: 'flex',
                gap: 2,
                flexWrap: 'wrap',
                alignItems: isMobile ? 'stretch' : 'center',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                {/* 第一行筛选字段 */}
                <Box sx={{
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  width: isMobile ? '100%' : 'auto'
                }}>
                  <TextField
                    label="合同名称"
                    variant="outlined"
                    size="small"
                    value={filters.contract_name}
                    onChange={(e) => setFilters({ ...filters, contract_name: e.target.value })}
                    sx={{ width: { xs: '100%', sm: '200px' } }}
                    placeholder="输入合同名称"
                  />
                  <TextField
                    label="套餐名称"
                    variant="outlined"
                    size="small"
                    value={filters.package_name}
                    onChange={(e) => setFilters({ ...filters, package_name: e.target.value })}
                    sx={{ width: { xs: '100%', sm: '200px' } }}
                    placeholder="输入套餐名称"
                  />
                  <TextField
                    label="客户名称"
                    variant="outlined"
                    size="small"
                    value={filters.customer_name}
                    onChange={(e) => setFilters({ ...filters, customer_name: e.target.value })}
                    sx={{ width: { xs: '100%', sm: '200px' } }}
                    placeholder="输入客户名称"
                  />
                </Box>

                {/* 第二行筛选字段 */}
                <Box sx={{
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  width: isMobile ? '100%' : 'auto'
                }}>
                  <DatePicker
                    views={['year', 'month']}
                    label="开始月份"
                    value={filters.purchase_start_month ? new Date(filters.purchase_start_month + '-01') : null}
                    onChange={(date) => {
                      const value = date ? format(date, 'yyyy-MM') : undefined;
                      setFilters({ ...filters, purchase_start_month: value });
                    }}
                    sx={{ width: { xs: '100%', sm: '180px' } }}
                    slotProps={{
                      textField: {
                        variant: "outlined",
                        size: "small",
                        placeholder: "选择开始月份"
                      }
                    }}
                    format="yyyy年MM月"
                  />
                  <DatePicker
                    views={['year', 'month']}
                    label="结束月份"
                    value={filters.purchase_end_month ? new Date(filters.purchase_end_month + '-01') : null}
                    onChange={(date) => {
                      const value = date ? format(date, 'yyyy-MM') : undefined;
                      setFilters({ ...filters, purchase_end_month: value });
                    }}
                    sx={{ width: { xs: '100%', sm: '180px' } }}
                    slotProps={{
                      textField: {
                        variant: "outlined",
                        size: "small",
                        placeholder: "选择结束月份"
                      }
                    }}
                    format="yyyy年MM月"
                  />
                  <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
                    <InputLabel>状态</InputLabel>
                    <Select
                      value={filters.status || ''}
                      label="状态"
                      onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                    >
                      <MenuItem value="">所有状态</MenuItem>
                      <MenuItem value="pending">待生效</MenuItem>
                      <MenuItem value="active">生效</MenuItem>
                      <MenuItem value="expired">已过期</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* 操作按钮 */}
                <Box sx={{
                  display: 'flex',
                  gap: 1,
                  justifyContent: isMobile ? 'stretch' : 'flex-start',
                  width: isMobile ? '100%' : 'auto',
                  mt: isMobile ? 1 : 0
                }}>
                  <Button
                    variant="contained"
                    onClick={handleSearch}
                    disabled={loading}
                    sx={{ width: isMobile ? '100%' : 'auto' }}
                  >
                    查询
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleReset}
                    sx={{ width: isMobile ? '100%' : 'auto' }}
                  >
                    重置
                  </Button>
                </Box>
              </Box>

              {/* 移动端展开时添加关闭按钮 */}
              {isMobile && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="text"
                    onClick={() => setIsFilterExpanded(false)}
                    startIcon={<ExpandLessIcon />}
                    sx={{ color: 'text.secondary' }}
                  >
                    收起筛选
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Paper>

      {/* 列表区域 */}
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 } }}>
        {/* 工具栏 */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreate}
          >
            + 新增
          </Button>
          <Button
            variant="outlined"
            onClick={() => {/* TODO: 导入功能 */}}
          >
            导入
          </Button>
          <Button
            variant="outlined"
            onClick={() => {/* TODO: 导出功能 */}}
          >
            导出
          </Button>
        </Box>

        {/* 根据设备类型显示不同的布局 */}
        {isMobile ? (
          // 移动端卡片布局
          <Box>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                <CircularProgress />
              </Box>
            ) : contracts.length === 0 ? (
              <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                <Typography color="text.secondary">
                  暂无数据
                </Typography>
              </Box>
            ) : (
              <>
                {renderMobileCards()}
                {/* 移动端分页 */}
                <TablePagination
                  rowsPerPageOptions={[10, 20]}
                  component="div"
                  count={total}
                  rowsPerPage={pageSize}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    const newSize = parseInt(e.target.value, 10);
                    setPageSize(newSize);
                    setPage(0);
                  }}
                  labelRowsPerPage="行数:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to}/${count}`}
                  sx={{
                    '& .MuiTablePagination-toolbar': {
                      paddingLeft: { xs: 1, sm: 2 },
                      paddingRight: { xs: 1, sm: 2 },
                    },
                    '& .MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    },
                    '& .MuiTablePagination-input': {
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    }
                  }}
                />
              </>
            )}
          </Box>
        ) : (
          // 桌面端表格布局
          <>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table sx={{
                    '& .MuiTableCell-root': {
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      px: { xs: 0.5, sm: 2 },
                    }
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>合同名称</TableCell>
                        <TableCell>客户名称</TableCell>
                        <TableCell>套餐名称</TableCell>
                        <TableCell>购买电量(kWh)</TableCell>
                        <TableCell>购电开始月份</TableCell>
                        <TableCell>购电结束月份</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell align="right">操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contracts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ textAlign: 'center', py: 3 }}>
                            <Typography variant="body2" color="text.secondary">暂无数据</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        contracts.map((contract) => (
                          <TableRow key={contract.id}>
                            <TableCell>
                              <Typography
                                sx={{
                                  cursor: 'pointer',
                                  color: 'primary.main',
                                  '&:hover': { textDecoration: 'underline' }
                                }}
                                onClick={() => handleView(contract)}
                              >
                                {contract.contract_name || '未命名合同'}
                              </Typography>
                            </TableCell>
                            <TableCell>{contract.customer_name}</TableCell>
                            <TableCell>{contract.package_name}</TableCell>
                            <TableCell>{contract.purchasing_electricity_quantity.toLocaleString()}</TableCell>
                            <TableCell>{formatMonthDisplay(contract.purchase_start_month)}</TableCell>
                            <TableCell>{formatMonthDisplay(contract.purchase_end_month)}</TableCell>
                            <TableCell>
                              <Chip
                                label={statusMap[contract.status] || contract.status}
                                size="small"
                                color={getStatusChipColor(contract.status)}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ pr: 1 }}>{renderTableActions(contract)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* 分页 */}
                <TablePagination
                  component="div"
                  count={total}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  labelRowsPerPage="每页行数"
                  rowsPerPageOptions={[5, 10, 20, 50]}
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
                />
              </>
            )}
          </>
        )}
      </Paper>

      {/* 详情对话框 */}
      <ContractDetailsDialog
        open={isDetailsDialogOpen}
        contractId={selectedContractId}
        onClose={handleCloseDetailsDialog}
        onEdit={handleEditFromDetails}
        onCopy={handleCopyFromDetails}
      />

      {/* 编辑对话框 */}
      <ContractEditorDialog
        open={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        mode={editorMode}
        onSuccess={() => {
          setIsEditorOpen(false);
          setSelectedContract(null);
          fetchContracts();
          showSnackbar(
            editorMode === 'create' ? '合同创建成功' : '合同更新成功',
            'success'
          );
        }}
      />

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={(event, reason) => {
          if (reason && reason === "backdropClick") {
            return;
          }
          handleDeleteCancel();
        }}
        disableEnforceFocus
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除合同"{contractToDelete?.package_name}"吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>取消</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 全局 Snackbar 反馈 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default RetailContractPage;
