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
    Tooltip,
    Collapse,
    useTheme
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
    Search as SearchIcon,
    ArrowBack as ArrowBackIcon,
    FilterList as FilterListIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation, matchPath } from 'react-router-dom';
import { Customer, CustomerListItem, CustomerListParams, PaginatedResponse } from '../api/customer';
import { CustomerEditorDialog } from '../components/CustomerEditorDialog';
import { CustomerDetailsDialog } from '../components/CustomerDetailsDialog';
import customerApi from '../api/customer';

export const CustomerManagementPage: React.FC = () => {
    // 路由参数和导航
    const params = useParams<{ customerId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // 响应式设计
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // 使用 matchPath 解析当前路由状态
    const createMatch = matchPath('/customer/profiles/create', location.pathname);
    const viewMatch = matchPath('/customer/profiles/view/:customerId', location.pathname);
    const editMatch = matchPath('/customer/profiles/edit/:customerId', location.pathname);
    const copyMatch = matchPath('/customer/profiles/copy/:customerId', location.pathname);

    // 根据当前路由确定状态
    const isCreateView = !!createMatch;
    const isDetailView = !!viewMatch;
    const isEditView = !!editMatch;
    const isCopyView = !!copyMatch;
    const currentCustomerId = params.customerId;

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
        keyword: '',
        user_type: '',
        industry: '',
        region: '',
        status: undefined
    });

    // 编辑对话框状态 (仅桌面端使用)
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view' | 'copy'>('create');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    // 客户详情对话框状态 (仅桌面端使用)
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    // 移动端客户详情状态
    const [mobileCustomerData, setMobileCustomerData] = useState<Customer | null>(null);
    const [mobileCustomerLoading, setMobileCustomerLoading] = useState(false);
    const [mobileCustomerError, setMobileCustomerError] = useState<string | null>(null);

    // 移动端筛选折叠状态
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

    // 检查是否有激活的筛选条件
    const hasActiveFilters = Boolean(
        searchParams.keyword ||
        searchParams.user_type ||
        searchParams.industry ||
        searchParams.region ||
        searchParams.status
    );

    // 加载客户列表
    const loadCustomers = async () => {
        setLoading(true);
        setError(null);

        try {
            // 构造API参数，使用当前状态
            const params = {
                keyword: searchParams.keyword,
                user_type: searchParams.user_type,
                industry: searchParams.industry,
                region: searchParams.region,
                status: searchParams.status,
                page: page + 1, // API is 1-indexed
                page_size: rowsPerPage, // 后端使用page_size而不是size
            };

            const response = await customerApi.getCustomers(params);
            const data: PaginatedResponse<CustomerListItem> = response.data;

            setCustomers(data.items);
            setTotalCount(data.total);
        } catch (err: any) {
            console.error('加载客户列表失败:', err);
            setError(err.response?.data?.detail || err.message || '加载客户列表失败');
            setCustomers([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    // 加载移动端客户详情数据
    const loadMobileCustomerData = async (customerId: string) => {
        setMobileCustomerLoading(true);
        setMobileCustomerError(null);
        try {
            const response = await customerApi.getCustomer(customerId);
            setMobileCustomerData(response.data);
        } catch (err: any) {
            console.error('加载客户详情失败:', err);
            setMobileCustomerError(err.response?.data?.detail || err.message || '加载客户详情失败');
            setMobileCustomerData(null);
        } finally {
            setMobileCustomerLoading(false);
        }
    };

    // 根据路由参数加载移动端客户数据
    useEffect(() => {
        if (currentCustomerId && (isDetailView || isEditView || isCopyView)) {
            loadMobileCustomerData(currentCustomerId);
        } else {
            setMobileCustomerData(null);
            setMobileCustomerError(null);
        }
    }, [currentCustomerId, isDetailView, isEditView, isCopyView]);

    // 监听搜索参数变化自动重新加载
    useEffect(() => {
        loadCustomers();
    }, [searchParams, page, rowsPerPage]);

    // 分页处理函数
    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
        const newParams = {
            ...searchParams,
            page: newPage + 1, // Material-UI pagination is 0-based
            size: rowsPerPage // 保持当前的每页行数
        };
        setSearchParams(newParams);
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
    };

  
    // 处理筛选条件变化（自动查询）
    const handleFilterChange = (field: keyof CustomerListParams, value: string | undefined) => {
        const newParams = {
            ...searchParams,
            [field]: value,
        };
        setSearchParams(newParams);
        setPage(0); // Material-UI pagination is 0-based，重置到第一页
    };

    // 搜索函数
    const handleSearch = () => {
        setPage(0); // Ensure search starts from the first page
        loadCustomers();
    };

    // 打开客户对话框
    const handleOpenDialog = async (mode: 'create' | 'edit' | 'view' | 'copy', customer?: CustomerListItem) => {
        if (isMobile) {
            // 移动端使用路由导航
            if (mode === 'create') {
                // 移动端新增也使用独立路由
                navigate('/customer/profiles/create');
            } else if (customer && (mode === 'view' || mode === 'edit' || mode === 'copy')) {
                let route = `/customer/profiles`;
                if (mode === 'view') {
                    route += `/view/${customer.id}`;
                } else if (mode === 'edit') {
                    route += `/edit/${customer.id}`;
                } else if (mode === 'copy') {
                    route += `/copy/${customer.id}`;
                }
                navigate(route);
            }
            return;
        }

        // 桌面端使用对话框
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
        if (isMobile) {
            // 移动端使用路由导航
            navigate(`/customer/profiles/edit/${customerId}`);
        } else {
            // 桌面端关闭详情对话框，打开编辑对话框
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
        }
    };

    // 从详情对话框处理复制
    const handleCopyFromDetails = (customerId: string) => {
        if (isMobile) {
            // 移动端使用路由导航
            navigate(`/customer/profiles/copy/${customerId}`);
        } else {
            // 桌面端关闭详情对话框，打开复制对话框
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
        }
    };

    // 移动端返回列表
    const handleBackToList = () => {
        navigate('/customer/profiles');
    };

    // 重置筛选条件
    const handleResetFilters = () => {
        const resetParams: CustomerListParams = {
            keyword: '',
            user_type: '',
            industry: '',
            region: '',
            status: undefined
        };
        setSearchParams(resetParams);
        setPage(0); // 重置页码
        loadCustomers();
    };

    // 保存成功后的回调
    const handleSaveSuccess = () => {
        if (isMobile && isCreateView) {
            // 移动端新增成功后返回列表
            navigate('/customer/profiles');
        } else if (isMobile && (isEditView || isCopyView)) {
            // 移动端编辑/复制成功后返回详情页
            if (currentCustomerId) {
                navigate(`/customer/profiles/view/${currentCustomerId}`);
            } else {
                navigate('/customer/profiles');
            }
        } else {
            // 桌面端成功后关闭对话框并重新加载列表
            handleCloseDialog();
            loadCustomers(); // 重新加载列表
        }
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
                            <Typography variant="body2" color="text.secondary">地市:</Typography>
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
                        <Typography variant="h6">新增客户</Typography>
                    </Box>
                </Paper>

                {/* 客户新增内容 */}
                <CustomerEditorDialog
                    open={true}
                    mode="create"
                    customer={null}
                    onClose={handleBackToList}
                    onSave={handleSaveSuccess}
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
                        <Typography variant="h6">客户详情</Typography>
                    </Box>
                </Paper>

                {/* 客户详情内容 */}
                {mobileCustomerLoading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                        <CircularProgress />
                    </Box>
                ) : mobileCustomerError ? (
                    <Alert severity="error">{mobileCustomerError}</Alert>
                ) : mobileCustomerData ? (
                    <CustomerDetailsDialog
                        open={true}
                        customerId={mobileCustomerData.id}
                        onClose={handleBackToList}
                        onEdit={handleEditFromDetails}
                        onCopy={handleCopyFromDetails}
                    />
                ) : null}
            </Box>
        );
    }

    // 移动端：渲染编辑页面
    if (isMobile && (isEditView || isCopyView)) {
        const mode = isEditView ? 'edit' : 'copy';
        return (
            <Box sx={{ width: '100%' }}>
                {/* 返回按钮和标题 */}
                <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton onClick={handleBackToList} size="small">
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6">
                            {mode === 'edit' ? '编辑客户' : '复制客户'}
                        </Typography>
                    </Box>
                </Paper>

                {/* 客户编辑内容 */}
                {mobileCustomerLoading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                        <CircularProgress />
                    </Box>
                ) : mobileCustomerError ? (
                    <Alert severity="error">{mobileCustomerError}</Alert>
                ) : mobileCustomerData ? (
                    <CustomerEditorDialog
                        open={true}
                        mode={mode}
                        customer={mobileCustomerData}
                        onClose={handleBackToList}
                        onSave={handleSaveSuccess}
                    />
                ) : null}
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>

            {/* 查询筛选区域 */}
            <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
                {/* 移动端折叠标题 */}
                {isMobile ? (
                    <Box
                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            py: 1
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FilterListIcon />
                            <Typography variant="subtitle1">筛选条件</Typography>
                            {hasActiveFilters && (
                                <Chip
                                    label="已筛选"
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            )}
                        </Box>
                        {isFilterExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </Box>
                ) : null}

                {/* 桌面端始终显示，移动端折叠显示 */}
                <Collapse in={!isMobile || isFilterExpanded}>
                    <Box sx={{
                        display: 'flex',
                        gap: 2,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        mt: isMobile ? 1 : 0
                    }}>
                        <TextField
                            label="客户名称"
                            variant="outlined"
                            size="small"
                            value={searchParams.keyword || ''}
                            onChange={(e) => handleFilterChange('keyword', e.target.value)}
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
                            <InputLabel>地市</InputLabel>
                            <Select
                                value={searchParams.region || ''}
                                label="地市"
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
                </Collapse>
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
                                    <TableCell sx={{ minWidth: 100 }}>地市</TableCell>
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
                    rowsPerPageOptions={isMobile ? [10, 20] : [5, 10, 20]}
                    component="div"
                    count={totalCount}
                    rowsPerPage={rowsPerPage || 10}
                    page={page || 0}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage={isMobile ? "行数:" : "每页行数:"}
                    labelDisplayedRows={({ from, to, count }) =>
                        isMobile ? `${from}-${to}/${count}` : `${from}-${to} 共 ${count} 条`
                    }
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