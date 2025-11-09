import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Breadcrumbs, TextField, Select, MenuItem,
  Button, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, TablePagination, IconButton, Tooltip,
  CircularProgress, Alert, Grid, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Snackbar, Chip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import {
  getContracts,
  deleteContract,
  Contract,
  ContractListParams
} from '../api/retail-contracts';
import { ContractEditorDialog } from '../components/ContractEditorDialog';

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
  // 状态管理
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选条件
  const [filters, setFilters] = useState<ContractListParams>({
    package_name: '',
    customer_name: '',
    status: 'all',
  });

  // 对话框状态
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'view'>('create');

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
        status: filters.status === 'all' ? undefined : filters.status,
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
  }, [page, pageSize]);

  // 操作处理
  const handleCreate = () => {
    setSelectedContract(null);
    setEditorMode('create');
    setIsEditorOpen(true);
  };

  const handleView = (contract: Contract) => {
    setSelectedContract(contract);
    setEditorMode('view');
    setIsEditorOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setSelectedContract(contract);
    setEditorMode('edit');
    setIsEditorOpen(true);
  };

  const handleDeleteClick = (contract: Contract) => {
    setContractToDelete(contract);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contractToDelete) return;

    try {
      await deleteContract(contractToDelete._id);
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
      status: 'all',
    });
    setPage(0);
  };

  const handleEditorSuccess = () => {
    setIsEditorOpen(false);
    setSelectedContract(null);
    fetchContracts();
    showSnackbar(
      editorMode === 'create' ? '合同创建成功' : '合同更新成功',
      'success'
    );
  };

  // 渲染操作按钮（根据状态控制）
  const renderTableActions = (contract: Contract) => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Tooltip title="查看">
        <IconButton size="small" onClick={() => handleView(contract)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>

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

  return (
    <Box sx={{ width: '100%' }}>
      {/* 面包屑导航 */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '1.2rem', fontWeight: 600 }}>
          合同管理
        </Typography>
        <Typography sx={{ fontSize: '1.2rem', fontWeight: 600 }}>
          零售合同
        </Typography>
      </Breadcrumbs>

      {/* 查询区域 */}
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="套餐名称"
              value={filters.package_name}
              onChange={(e) => setFilters({ ...filters, package_name: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="客户名称"
              value={filters.customer_name}
              onChange={(e) => setFilters({ ...filters, customer_name: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>状态</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                label="状态"
              >
                <MenuItem value="all">所有状态</MenuItem>
                <MenuItem value="pending">待生效</MenuItem>
                <MenuItem value="active">生效</MenuItem>
                <MenuItem value="expired">已过期</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSearch}
              >
                查询
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
              >
                重置
              </Button>
            </Box>
          </Grid>
        </Grid>
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

        {/* 数据表格 */}
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
                    <TableCell>合同编号</TableCell>
                    <TableCell>套餐名称</TableCell>
                    <TableCell>客户名称</TableCell>
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
                      <TableRow key={contract._id}>
                        <TableCell>{contract._id}</TableCell>
                        <TableCell>{contract.package_name}</TableCell>
                        <TableCell>{contract.customer_name}</TableCell>
                        <TableCell>{contract.purchasing_electricity_quantity.toLocaleString()}</TableCell>
                        <TableCell>{contract.purchase_start_month}</TableCell>
                        <TableCell>{contract.purchase_end_month}</TableCell>
                        <TableCell>
                          <Chip
                            label={statusMap[contract.status] || contract.status}
                            size="small"
                            color={getStatusChipColor(contract.status)}
                          />
                        </TableCell>
                        <TableCell align="right">{renderTableActions(contract)}</TableCell>
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
      </Paper>

      {/* 编辑对话框 */}
      <ContractEditorDialog
        open={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        mode={editorMode}
        onSuccess={handleEditorSuccess}
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
  );
};

export default RetailContractPage;
