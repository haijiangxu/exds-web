import React, { useState, useEffect } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, CircularProgress, Button, TextField, InputAdornment, Select, MenuItem, InputLabel, FormControl, SelectChangeEvent, Typography, TablePagination, useMediaQuery, useTheme, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Alert, Tooltip, Snackbar } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArchiveIcon from '@mui/icons-material/Archive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../components/PageHeader';
import apiClient from '../api/client';
import { format } from 'date-fns';
import { PackageEditorDialog } from '../components/PackageEditorDialog';
import { PackageDetailsDialog } from '../components/PackageDetailsDialog';

interface Package {
  id?: string;          // 可选，新后端返回
  _id?: string;         // 可选，旧后端返回
  package_name: string;
  package_type: 'time_based' | 'non_time_based';
  pricing_mode: 'fixed_linked' | 'price_spread';
  has_green_power: boolean;
  has_price_cap: boolean;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

// 辅助函数：获取套餐ID（兼容 id 和 _id）
const getPackageId = (pkg: Package): string => {
  return pkg.id || pkg._id || '';
};

// 状态中文映射
const statusMap: { [key: string]: string } = {
  draft: '草稿',
  active: '生效',
  archived: '归档',
};

// 根据状态获取Chip颜色
const getStatusChipColor = (status: string): 'success' | 'warning' | 'default' => {
    switch (status) {
        case 'active':
            return 'success';
        case 'archived':
            return 'warning';
        case 'draft':
        default:
            return 'default';
    }
};

const RetailPackagePage: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    keyword: '',
    package_type: '',
    pricing_mode: '', // Added pricing_mode filter
    status: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [isEditorOpen, setEditorOpen] = useState(false);
  const [editPackageId, setEditPackageId] = useState<string | undefined>(undefined);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'copy'>('create');

  // 详情对话框相关状态
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsPackageId, setDetailsPackageId] = useState<string | null>(null);

  // 删除功能相关状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 归档功能相关状态
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [packageToArchive, setPackageToArchive] = useState<string | null>(null);

  // 激活功能相关状态
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [packageToActivate, setPackageToActivate] = useState<string | null>(null);


  // Snackbar状态管理
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 状态判断函数（根据状态机规则）
  const canEdit = (status: string) => status === 'draft';
  const canDelete = (status: string) => status === 'draft';
  const canActivate = (status: string) => status === 'draft';
  const canArchive = (status: string) => status === 'active';
  const canCopy = (status: string) => true; // 所有状态都能复制

  // Snackbar辅助函数
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/retail-packages', {
        params: {
          ...filters,
          page: page + 1, // API is 1-indexed
          page_size: rowsPerPage,
        }
      });
      console.log("API响应:", response.data); // 调试信息
      setPackages(response.data.items);
      setTotalCount(response.data.total);
    } catch (error: any) {
        console.error("Failed to fetch packages", error);
        console.error("错误详情:", error.response?.data); // 打印详细错误
        const errorMsg = error.response?.data?.detail || error.message || "加载套餐列表失败";
        showSnackbar(errorMsg, 'error');
        setPackages([]); // 确保清空列表
        setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [filters, page, rowsPerPage]);

  const handleFilterChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name as string]: value
    }));
    setPage(0); // Reset to first page on filter change
  };

  const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      keyword: event.target.value
    }));
    setPage(0); // Reset to first page on keyword change
  };

  const handleSearch = () => {
    setPage(0); // Ensure search starts from the first page
    fetchPackages();
  };

  const handleResetFilters = () => {
    setFilters({
      keyword: '',
      package_type: '',
      pricing_mode: '',
      status: ''
    });
    setPage(0);
  };

  const handleArchive = async (packageId: string) => {
    setPackageToArchive(packageId);
    setArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!packageToArchive) return;

    try {
      await apiClient.post(`/api/v1/retail-packages/${packageToArchive}/archive`);
      setArchiveDialogOpen(false);
      setPackageToArchive(null);
      fetchPackages();
      showSnackbar('套餐归档成功', 'success');
    } catch (error: any) {
      console.error("归档失败", error);
      const errorMsg = error.response?.data?.detail || '归档失败，请重试';
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleArchiveCancel = () => {
    setArchiveDialogOpen(false);
    setPackageToArchive(null);
  };

  const handleActivate = async (packageId: string) => {
    setPackageToActivate(packageId);
    setActivateDialogOpen(true);
  };

  const handleActivateConfirm = async () => {
    if (!packageToActivate) return;

    try {
      await apiClient.post(`/api/v1/retail-packages/${packageToActivate}/activate`);
      setActivateDialogOpen(false);
      setPackageToActivate(null);
      fetchPackages();
      showSnackbar('套餐激活成功', 'success');
    } catch (error: any) {
      console.error("激活失败", error);
      const errorMsg = error.response?.data?.detail || '激活失败，请重试';
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleActivateCancel = () => {
    setActivateDialogOpen(false);
    setPackageToActivate(null);
  };

  // 查看详情处理函数
  const handleViewDetails = (packageId: string) => {
    setDetailsPackageId(packageId);
    setDetailsDialogOpen(true);
  };

  const handleEdit = (packageId: string) => {
    setEditPackageId(packageId);
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const handleCopy = (packageId: string) => {
    setEditPackageId(packageId);
    setEditorMode('copy');
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditPackageId(undefined);
    setEditorMode('create');
    setEditorOpen(true);
  };

  const handleSave = async (data: any, asDraft: boolean) => {
    console.log("Saving package:", data, "as draft:", asDraft);
    const payload = {
        ...data,
        save_as_draft: asDraft
    };

    try {
        if (editorMode === 'edit') {
            await apiClient.put(`/api/v1/retail-packages/${editPackageId}`, payload);
            showSnackbar('套餐更新成功', 'success');
        } else { // create or copy mode
            await apiClient.post('/api/v1/retail-packages', payload);
            if (editorMode === 'copy') {
                showSnackbar('套餐复制成功', 'success');
            } else {
                showSnackbar('套餐创建成功', 'success');
            }
        }
        setEditorOpen(false);
        fetchPackages(); // Refresh the list
    } catch (error: any) {
        console.error("Failed to save package", error);
        const errorMsg = error.response?.data?.detail || '操作失败，请重试';
        showSnackbar(errorMsg, 'error');
        // 不要关闭对话框，让用户可以修改后重试
        throw error;
    }
  };

  // 删除功能相关处理函数
  const handleDeleteClick = (packageId: string) => {
    setPackageToDelete(packageId);
    setDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!packageToDelete) return;

    try {
      await apiClient.delete(`/api/v1/retail-packages/${packageToDelete}`);
      setDeleteDialogOpen(false);
      setPackageToDelete(null);
      fetchPackages(); // 刷新列表
      showSnackbar('套餐删除成功', 'success');
    } catch (error: any) {
      console.error("删除失败", error);
      const errorMsg = error.response?.data?.detail || "删除失败，请重试";
      setDeleteError(errorMsg);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPackageToDelete(null);
    setDeleteError(null);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>


      {/* Query Card */}
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
              label="套餐名称"
              variant="outlined"
              size="small"
              value={filters.keyword}
              onChange={handleKeywordChange}
              InputProps={{
                  startAdornment: (
                      <InputAdornment position="start">
                          <SearchIcon />
                      </InputAdornment>
                  ),
              }}
              sx={{ width: { xs: '100%', sm: '200px' } }}
          />
          <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
              <InputLabel>套餐类型</InputLabel>
              <Select
                  name="package_type"
                  value={filters.package_type}
                  onChange={handleFilterChange}
                  label="套餐类型"
              >
                  <MenuItem value="">所有</MenuItem>
                  <MenuItem value="time_based">分时段</MenuItem>
                  <MenuItem value="non_time_based">不分时段</MenuItem>
              </Select>
          </FormControl>
          <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
              <InputLabel>定价模式</InputLabel>
              <Select
                  name="pricing_mode"
                  value={filters.pricing_mode}
                  onChange={handleFilterChange}
                  label="定价模式"
              >
                  <MenuItem value="">所有</MenuItem>
                  <MenuItem value="fixed_linked">固定+联动</MenuItem>
                  <MenuItem value="price_spread">价差分成</MenuItem>
              </Select>
          </FormControl>
          <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
              <InputLabel>状态</InputLabel>
              <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="状态"
              >
                  <MenuItem value="">所有</MenuItem>
                  <MenuItem value="draft">草稿</MenuItem>
                  <MenuItem value="active">生效</MenuItem>
                  <MenuItem value="archived">归档</MenuItem>
              </Select>
          </FormControl>
          <Button variant="contained" onClick={handleSearch}>刷新</Button>
          <Button variant="outlined" onClick={handleResetFilters}>重置</Button>
        </Box>
      </Paper>

      {/* List Card */}
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 } }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="contained" color="primary" onClick={handleCreate}>+ 新增</Button>
        </Box>
        {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <CircularProgress />
              </Box>
            ) : packages.length === 0 ? (
              isMobile ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                  <Typography variant="body2" color="text.secondary">暂无数据</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table
                    sx={{
                        '& .MuiTableCell-root': {
                            fontSize: { xs: '0.75rem', sm: '0.875rem'},
                            px: { xs: 0.5, sm: 2},
                        }
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell>套餐名称</TableCell>
                        <TableCell>套餐类型</TableCell>
                        <TableCell>定价模式</TableCell>
                        <TableCell>附加套餐</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell>创建时间</TableCell>
                        <TableCell align="right">操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3 }}>
                          <Typography variant="body2" color="text.secondary">暂无数据</Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )

            ) : isMobile ? (
              <Box>
                {packages.map(pkg => (
                  <Paper key={getPackageId(pkg)} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      sx={{
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                      onClick={() => handleViewDetails(getPackageId(pkg))}
                    >
                      {pkg.package_name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">类型:</Typography>
                      <Chip label={pkg.package_type === 'time_based' ? '分时段' : '不分时段'} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">定价模式:</Typography>
                      <Chip label={pkg.pricing_mode === 'fixed_linked' ? '固定+联动' : '价差分成'} size="small" color="primary" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">附加套餐:</Typography>
                      <Box>
                        {pkg.has_green_power && <Chip label="绿电" size="small" color="success" sx={{ mr: 0.5 }} />}
                        {pkg.has_price_cap && <Chip label="封顶" size="small" color="warning" />}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">状态:</Typography>
                      <Chip label={statusMap[pkg.status] || pkg.status} size="small" color={getStatusChipColor(pkg.status)} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">创建时间:</Typography>
                      <Typography variant="body2">{format(new Date(pkg.created_at), 'yyyy-MM-dd HH:mm')}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      {canEdit(pkg.status) && (
                        <Tooltip title="编辑套餐">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(getPackageId(pkg))}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="复制套餐">
                        <IconButton size="small" onClick={() => handleCopy(getPackageId(pkg))}>
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                      {canActivate(pkg.status) && (
                        <Tooltip title="激活套餐">
                          <IconButton
                            size="small"
                            onClick={() => handleActivate(getPackageId(pkg))}
                            color="success"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canArchive(pkg.status) && (
                        <Tooltip title="归档套餐">
                          <IconButton
                            size="small"
                            onClick={() => handleArchive(getPackageId(pkg))}
                            color="warning"
                          >
                            <ArchiveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* 新增：删除按钮（仅草稿可见） */}
                      {pkg.status === 'draft' && (
                        <Tooltip title="删除套餐">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(getPackageId(pkg))}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <TableContainer>
                <Table
                  sx={{
                      '& .MuiTableCell-root': {
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },  // 响应式字体
                          px: { xs: 0.5, sm: 2 },  // 响应式内边距
                      }
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>套餐名称</TableCell>
                      <TableCell>套餐类型</TableCell>
                      <TableCell>定价模式</TableCell>
                      <TableCell>附加套餐</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>创建时间</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {packages.map(pkg => (
                        <TableRow key={getPackageId(pkg)}>
                          <TableCell>
                            <Typography
                              sx={{
                                cursor: 'pointer',
                                color: 'primary.main',
                                '&:hover': { textDecoration: 'underline' }
                              }}
                              onClick={() => handleViewDetails(getPackageId(pkg))}
                            >
                              {pkg.package_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={pkg.package_type === 'time_based' ? '分时段' : '不分时段'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={pkg.pricing_mode === 'fixed_linked' ? '固定+联动' : '价差分成'}
                              size="small"
                              color="primary"
                            />
                          </TableCell>
                          <TableCell>
                            {pkg.has_green_power && <Chip label="绿电" size="small" color="success" />}
                            {pkg.has_price_cap && <Chip label="封顶" size="small" color="warning" />}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusMap[pkg.status] || pkg.status}
                              size="small"
                              color={getStatusChipColor(pkg.status)}
                            />
                          </TableCell>
                          <TableCell>{format(new Date(pkg.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                          <TableCell align="right">
                            {canEdit(pkg.status) && (
                              <Tooltip title="编辑套餐">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(getPackageId(pkg))}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="复制套餐">
                              <IconButton size="small" onClick={() => handleCopy(getPackageId(pkg))}>
                                <ContentCopyIcon />
                              </IconButton>
                            </Tooltip>
                            {canActivate(pkg.status) && (
                              <Tooltip title="激活套餐">
                                <IconButton
                                  size="small"
                                  onClick={() => handleActivate(getPackageId(pkg))}
                                  color="success"
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canArchive(pkg.status) && (
                              <Tooltip title="归档套餐">
                                <IconButton
                                  size="small"
                                  onClick={() => handleArchive(getPackageId(pkg))}
                                  color="warning"
                                >
                                  <ArchiveIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {/* 新增：删除按钮（仅草稿可见） */}
                            {pkg.status === 'draft' && (
                              <Tooltip title="删除套餐">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteClick(getPackageId(pkg))}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 20]}
              labelRowsPerPage="每页行数:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
            />
          </Paper>

          <PackageEditorDialog
              open={isEditorOpen}
              onClose={() => setEditorOpen(false)}
              packageId={editPackageId}
              mode={editorMode}
              onSave={handleSave}
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
                确定要删除这个套餐吗？此操作不可撤销。
              </DialogContentText>
              {deleteError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {deleteError}
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDeleteCancel}>取消</Button>
              <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                删除
              </Button>
            </DialogActions>
          </Dialog>

          {/* 归档确认对话框 */}
          <Dialog
            open={archiveDialogOpen}
            onClose={(event, reason) => {
              if (reason && reason === "backdropClick") {
                return;
              }
              handleArchiveCancel();
            }}
            disableEnforceFocus
            aria-labelledby="archive-dialog-title"
          >
            <DialogTitle id="archive-dialog-title">确认归档</DialogTitle>
            <DialogContent>
              <DialogContentText>
                归档后的套餐将不能再编辑或激活，确定要归档吗？
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleArchiveCancel}>取消</Button>
              <Button onClick={handleArchiveConfirm} color="warning" variant="contained">
                归档
              </Button>
            </DialogActions>
          </Dialog>

          {/* 激活确认对话框 */}
          <Dialog
            open={activateDialogOpen}
            onClose={(event, reason) => {
              if (reason && reason === "backdropClick") {
                return;
              }
              handleActivateCancel();
            }}
            disableEnforceFocus
            aria-labelledby="activate-dialog-title"
          >
            <DialogTitle id="activate-dialog-title">确认激活</DialogTitle>
            <DialogContent>
              <DialogContentText>
                激活后的套餐将对用户可见并可供选择，确定要激活吗？
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleActivateCancel}>取消</Button>
              <Button onClick={handleActivateConfirm} color="success" variant="contained">
                激活
              </Button>
            </DialogActions>
          </Dialog>

          {/* 详情对话框 */}
          <PackageDetailsDialog
            open={detailsDialogOpen}
            packageId={detailsPackageId}
            onClose={() => {
              setDetailsDialogOpen(false);
              setDetailsPackageId(null);
            }}
            onEdit={(id) => {
              setDetailsDialogOpen(false);
              handleEdit(id);
            }}
            onCopy={(id) => {
              setDetailsDialogOpen(false);
              handleCopy(id);
            }}
          />

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

export default RetailPackagePage;