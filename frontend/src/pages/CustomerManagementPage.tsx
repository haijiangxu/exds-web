import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    Chip,
    InputAdornment,
    Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { Customer, CustomerListItem, CustomerListParams, PaginatedResponse } from '../api/customer';
import { CustomerEditorDialog } from '../components/CustomerEditorDialog';
import { CustomerDetailsDialog } from '../components/CustomerDetailsDialog';
import customerApi from '../api/customer';

export const CustomerManagementPage: React.FC = () => {
    // 响应式设计
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // 列表数据状态
    const [customers, setCustomers] = useState<CustomerListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 分页状态
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    // 查询参数状态
    const [searchParams, setSearchParams] = useState<CustomerListParams>({
        page: 1,
        size: 10,
        search: '',
        user_type: '',
        industry: '',
        region: '',
        status: undefined
    });

    // 编辑对话框状态
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view' | 'copy'>('create');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    // 客户详情对话框状态
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    // 加载客户列表
    const loadCustomers = async (params: CustomerListParams = searchParams) => {
        setLoading(true);
        setError(null);

        try {
            // 修正API参数，与零售套餐页面保持一致
            const apiParams = {
                ...params,
                page_size: params.size || 10, // 使用 page_size 而不是 size
                size: undefined // 移除 size 参数
            };

            const response = await customerApi.getCustomers(apiParams);
            const data: PaginatedResponse<CustomerListItem> = response.data;

            setCustomers(data.items);
            setPage(data.page - 1); // Material-UI pagination is 0-based
            setRowsPerPage(data.size || 10); // 添加默认值保护
            setTotalCount(data.total);
        } catch (err: any) {
            console.error('加载客户列表失败:', err);
            setError(err.response?.data?.detail || err.message || '加载客户列表失败');
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    // 初始加载
    useEffect(() => {
        loadCustomers();
    }, []);

    // 分页处理函数
    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
        const newParams = {
            ...searchParams,
            page: newPage + 1, // Material-UI pagination is 0-based
            size: rowsPerPage // 保持当前的每页行数
        };
        setSearchParams(newParams);
        loadCustomers(newParams);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = parseInt(event.target.value, 10);
        setRowsPerPage(newSize);
        setPage(0);
        const newParams = {
            ...searchParams,
            page: 1,
            size: newSize
        };
        setSearchParams(newParams);
        loadCustomers(newParams);
    };

    // 处理搜索
    const handleSearch = () => {
        const newParams = {
            ...searchParams,
            page: 1 // 重置到第一页
        };
        setSearchParams(newParams);
        loadCustomers(newParams);
    };

    // 处理筛选条件变化（自动查询）
    const handleFilterChange = (field: keyof CustomerListParams, value: string | undefined) => {
        const newParams = {
            ...searchParams,
            [field]: value,
            page: 1 // 重置到第一页
        };
        setSearchParams(newParams);
        loadCustomers(newParams); // 自动触发查询
    };

    // 打开客户对话框
    const handleOpenDialog = async (mode: 'create' | 'edit' | 'view' | 'copy', customer?: CustomerListItem) => {
        if (mode === 'view' && customer) {
            // 查看模式使用新的详情对话框
            setSelectedCustomerId(customer.id);
            setDetailsDialogOpen(true);
            return;
        }

        // 其他模式使用编辑对话框
        setDialogMode(mode);

        if (mode === 'create') {
            // 创建模式不需要客户数据
            setSelectedCustomer(null);
            setDialogOpen(true);
        } else if (customer) {
            // 编辑、复制模式需要获取完整的客户数据
            try {
                const response = await customerApi.getCustomer(customer.id);
                setSelectedCustomer(response.data);
                setDialogOpen(true);
            } catch (err: any) {
                console.error('获取客户详情失败:', err);
                setError(err.response?.data?.detail || err.message || '获取客户详情失败');
            }
        }
    };

    // 关闭编辑对话框
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedCustomer(null);
    };

    // 关闭详情对话框
    const handleCloseDetailsDialog = () => {
        setDetailsDialogOpen(false);
        setSelectedCustomerId(null);
    };

    // 从详情对话框处理编辑
    const handleEditFromDetails = (customerId: string) => {
        // 关闭详情对话框，打开编辑对话框
        setDetailsDialogOpen(false);
        setSelectedCustomerId(null);

        // 获取客户数据并打开编辑对话框
        customerApi.getCustomer(customerId)
            .then(response => {
                setSelectedCustomer(response.data);
                setDialogMode('edit');
                setDialogOpen(true);
            })
            .catch(err => {
                console.error('获取客户详情失败:', err);
                setError(err.response?.data?.detail || err.message || '获取客户详情失败');
            });
    };

    // 从详情对话框处理复制
    const handleCopyFromDetails = (customerId: string) => {
        // 关闭详情对话框，打开复制对话框
        setDetailsDialogOpen(false);
        setSelectedCustomerId(null);

        // 获取客户数据并打开复制对话框
        customerApi.getCustomer(customerId)
            .then(response => {
                setSelectedCustomer(response.data);
                setDialogMode('copy');
                setDialogOpen(true);
            })
            .catch(err => {
                console.error('获取客户详情失败:', err);
                setError(err.response?.data?.detail || err.message || '获取客户详情失败');
            });
    };

    // 重置筛选条件
    const handleResetFilters = () => {
        const resetParams: CustomerListParams = {
            page: 1,
            size: 10,
            search: '',
            user_type: '',
            industry: '',
            region: '',
            status: undefined
        };
        setSearchParams(resetParams);
        loadCustomers(resetParams);
    };

    // 保存成功后的回调
    const handleSaveSuccess = () => {
        handleCloseDialog();
        loadCustomers(); // 重新加载列表
    };

    // 删除客户
    const handleDeleteCustomer = async (customer: CustomerListItem) => {
        if (!window.confirm(`确定要删除客户"${customer.user_name}"吗？此操作不可撤销。`)) {
            return;
        }

        try {
            await customerApi.deleteCustomer(customer.id);
            loadCustomers(); // 重新加载列表
        } catch (err: any) {
            console.error('删除客户失败:', err);
            setError(err.response?.data?.detail || err.message || '删除客户失败');
        }
    };

    // 获取状态颜色
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'inactive':
                return 'warning';
            case 'deleted':
                return 'error';
            default:
                return 'default';
        }
    };

    // 获取状态文本
    const getStatusText = (status: string) => {
        switch (status) {
            case 'active':
                return '正常';
            case 'inactive':
                return '停用';
            case 'deleted':
                return '已删除';
            default:
                return status;
        }
    };

    // 状态判断函数（根据状态机规则）
    const canEdit = (status: string) => status === 'active' || status === 'inactive';
    const canDelete = (status: string) => status === 'inactive';

    // 渲染移动端卡片布局
    const renderMobileCards = () => (
        <Box>
            {customers.map((customer) => (
                <Paper key={customer.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    {/* 客户名称（可点击） */}
                    <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{
                            cursor: 'pointer',
                            color: 'primary.main',
                            '&:hover': { textDecoration: 'underline' },
                            fontWeight: 'bold'
                        }}
                        onClick={() => handleOpenDialog('view', customer)}
                    >
                        {customer.user_name}
                    </Typography>

                    {/* 基本信息 */}
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">客户简称:</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>{customer.short_name || '-'}</Typography>

                        <Typography variant="body2" color="text.secondary">用户类型:</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>{customer.user_type || '-'}</Typography>

                        <Typography variant="body2" color="text.secondary">行业:</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>{customer.industry || '-'}</Typography>
                    </Box>

                    {/* 详细信息（两列布局） */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                        <Box sx={{ flex: '1 1 45%' }}>
                            <Typography variant="body2" color="text.secondary">电压等级:</Typography>
                            <Typography variant="body2">{customer.voltage || '-'}</Typography>
                        </Box>
                        <Box sx={{ flex: '1 1 45%' }}>
                            <Typography variant="body2" color="text.secondary">地区:</Typography>
                            <Typography variant="body2">{customer.region || '-'}</Typography>
                        </Box>
                        <Box sx={{ flex: '1 1 45%' }}>
                            <Typography variant="body2" color="text.secondary">联系人:</Typography>
                            <Typography variant="body2">{customer.contact_person || '-'}</Typography>
                        </Box>
                        <Box sx={{ flex: '1 1 45%' }}>
                            <Typography variant="body2" color="text.secondary">联系电话:</Typography>
                            <Typography variant="body2">{customer.contact_phone || '-'}</Typography>
                        </Box>
                    </Box>

                    {/* 状态和操作区域 */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">状态:</Typography>
                            <Chip
                                label={getStatusText(customer.status)}
                                color={getStatusColor(customer.status) as any}
                                size="small"
                            />
                            <Chip
                                label={`户号: ${customer.account_count}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        </Box>

                        {/* 操作按钮 */}
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {canEdit(customer.status) && (
                                <Tooltip title="编辑客户">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleOpenDialog('edit', customer)}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Tooltip title="复制客户">
                                <IconButton size="small" onClick={() => handleOpenDialog('copy', customer)}>
                                    <CopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            {canDelete(customer.status) && (
                                <Tooltip title="删除客户">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDeleteCustomer(customer)}
                                        color="error"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    </Box>
                </Paper>
            ))}
        </Box>
    );

    return (
        <Box sx={{ width: '100%' }}>

            {/* 查询筛选区域 */}
            <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        label="客户名称"
                        variant="outlined"
                        size="small"
                        value={searchParams.search || ''}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
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
                        <InputLabel>用户类型</InputLabel>
                        <Select
                            value={searchParams.user_type || ''}
                            label="用户类型"
                            onChange={(e) => handleFilterChange('user_type', e.target.value)}
                        >
                            <MenuItem value="">全部</MenuItem>
                            {customerApi.USER_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
                        <InputLabel>行业</InputLabel>
                        <Select
                            value={searchParams.industry || ''}
                            label="行业"
                            onChange={(e) => handleFilterChange('industry', e.target.value)}
                        >
                            <MenuItem value="">全部</MenuItem>
                            {customerApi.INDUSTRIES.map((industry) => (
                                <MenuItem key={industry} value={industry}>
                                    {industry}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
                        <InputLabel>地区</InputLabel>
                        <Select
                            value={searchParams.region || ''}
                            label="地区"
                            onChange={(e) => handleFilterChange('region', e.target.value)}
                        >
                            <MenuItem value="">全部</MenuItem>
                            {customerApi.REGIONS.map((region) => (
                                <MenuItem key={region} value={region}>
                                    {region}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
                        <InputLabel>状态</InputLabel>
                        <Select
                            value={searchParams.status || ''}
                            label="状态"
                            onChange={(e) => {
                                const targetValue = e.target.value as string;
                                if (targetValue === '') {
                                    handleFilterChange('status', undefined);
                                } else {
                                    handleFilterChange('status', targetValue as 'active' | 'inactive' | 'deleted');
                                }
                            }}
                        >
                            <MenuItem value="">所有</MenuItem>
                            <MenuItem value="active">正常</MenuItem>
                            <MenuItem value="inactive">停用</MenuItem>
                            <MenuItem value="deleted">已删除</MenuItem>
                        </Select>
                    </FormControl>
                    <Button variant="contained" onClick={handleSearch} disabled={loading}>刷新</Button>
                    <Button variant="outlined" onClick={handleResetFilters}>重置</Button>
                </Box>
            </Paper>

            {/* 错误提示 */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* 列表区域 */}
            <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 } }}>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button variant="contained" color="primary" onClick={() => handleOpenDialog('create')}>
                        + 新增
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
                        ) : customers.length === 0 ? (
                            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                                <Typography color="text.secondary">
                                    暂无数据
                                </Typography>
                            </Box>
                        ) : (
                            renderMobileCards()
                        )}
                    </Box>
                ) : (
                    // 桌面端表格布局
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table
                            sx={{
                                '& .MuiTableCell-root': {
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    px: { xs: 0.5, sm: 2 },
                                }
                            }}
                            aria-label="客户列表"
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ minWidth: 120 }}>客户名称</TableCell>
                                    <TableCell sx={{ minWidth: 100 }}>客户简称</TableCell>
                                    <TableCell sx={{ minWidth: 100 }}>用户类型</TableCell>
                                    <TableCell sx={{ minWidth: 100 }}>行业</TableCell>
                                    <TableCell sx={{ minWidth: 80 }}>电压等级</TableCell>
                                    <TableCell sx={{ minWidth: 100 }}>地区</TableCell>
                                    <TableCell sx={{ minWidth: 120 }}>联系人</TableCell>
                                    <TableCell sx={{ minWidth: 80 }}>户号数量</TableCell>
                                    <TableCell sx={{ minWidth: 80 }}>状态</TableCell>
                                    <TableCell sx={{ minWidth: 120 }}>操作</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : customers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                暂无数据
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map((customer) => (
                                        <TableRow key={customer.id} hover>
                                            <TableCell>
                                                <Typography
                                                    sx={{
                                                        cursor: 'pointer',
                                                        color: 'primary.main',
                                                        '&:hover': { textDecoration: 'underline' }
                                                    }}
                                                    onClick={() => handleOpenDialog('view', customer)}
                                                >
                                                    {customer.user_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{customer.short_name}</TableCell>
                                            <TableCell>{customer.user_type || '-'}</TableCell>
                                            <TableCell>{customer.industry || '-'}</TableCell>
                                            <TableCell>{customer.voltage || '-'}</TableCell>
                                            <TableCell>{customer.region || '-'}</TableCell>
                                            <TableCell>
                                                {customer.contact_person && (
                                                    <Box>
                                                        <Typography variant="body2">
                                                            {customer.contact_person}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {customer.contact_phone || '-'}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={customer.account_count}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={getStatusText(customer.status)}
                                                    color={getStatusColor(customer.status) as any}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    {canEdit(customer.status) && (
                                                        <Tooltip title="编辑客户">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenDialog('edit', customer)}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="复制客户">
                                                        <IconButton size="small" onClick={() => handleOpenDialog('copy', customer)}>
                                                            <CopyIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {canDelete(customer.status) && (
                                                        <Tooltip title="删除客户">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleDeleteCustomer(customer)}
                                                                color="error"
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* 分页 */}
                <TablePagination
                    rowsPerPageOptions={[5, 10, 20]}
                    component="div"
                    count={totalCount}
                    rowsPerPage={rowsPerPage || 10}
                    page={page || 0}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="每页行数:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
                />
            </Paper>

            {/* 客户编辑对话框 */}
            <CustomerEditorDialog
                open={dialogOpen}
                mode={dialogMode}
                customer={selectedCustomer}
                onClose={handleCloseDialog}
                onSave={handleSaveSuccess}
            />

            {/* 客户详情对话框 */}
            <CustomerDetailsDialog
                open={detailsDialogOpen}
                customerId={selectedCustomerId}
                onClose={handleCloseDetailsDialog}
                onEdit={handleEditFromDetails}
                onCopy={handleCopyFromDetails}
            />
        </Box>
    );
};