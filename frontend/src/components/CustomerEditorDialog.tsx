import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Typography,
    Box,
    Alert,
    CircularProgress,
    Chip,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useMediaQuery,
    useTheme
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import {
    Customer,
    CustomerCreate,
    CustomerUpdate,
    UtilityAccount,
    MeteringPoint
} from '../api/customer';
import customerApi from '../api/customer';

export interface CustomerEditorDialogProps {
    open: boolean;
    mode: 'create' | 'edit' | 'view' | 'copy';
    customer?: Customer | null;
    onClose: () => void;
    onSave: () => void;
}

export const CustomerEditorDialog: React.FC<CustomerEditorDialogProps> = ({
    open,
    mode,
    customer,
    onClose,
    onSave
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const isReadOnly = mode === 'view';
    const isEdit = mode === 'edit' || mode === 'copy';
    const isCreate = mode === 'create' || mode === 'copy';

    // 表单数据状态
    const [formData, setFormData] = useState<CustomerCreate>({
        user_name: '',
        short_name: '',
        user_type: '',
        industry: '',
        voltage: '',
        region: '',
        district: '',
        address: '',
        location: undefined,
        contact_person: '',
        contact_phone: '',
        utility_accounts: []
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 行政区划数据
    const [administrativeDivisions, setAdministrativeDivisions] = useState<Array<{
        city: string;
        divisions: string[];
    }>>([]);
    const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

    // 户号管理状态
    const [showAccountDialog, setShowAccountDialog] = useState(false);
    const [editingAccount, setEditingAccount] = useState<(UtilityAccount & { accountIndex: number }) | null>(null);
    const [accountFormData, setAccountFormData] = useState({ account_id: '' });

    // 计量点管理状态
    const [showMeteringPointDialog, setShowMeteringPointDialog] = useState(false);
    const [editingMeteringPoint, setEditingMeteringPoint] = useState<{
        accountIndex: number;
        meteringPoint: MeteringPoint | null;
    } | null>(null);
    const [meteringPointFormData, setMeteringPointFormData] = useState({
        metering_point_id: '',
        allocation_percentage: 100,
        meter: {
            meter_id: '',
            multiplier: 1
        }
    });

    // 加载行政区划数据
    useEffect(() => {
        const loadAdministrativeDivisions = async () => {
            try {
                const response = await fetch('/jiangxi_administrative_divisions.json');
                const data = await response.json();
                setAdministrativeDivisions(data);
            } catch (error) {
                console.error('加载行政区划数据失败:', error);
            }
        };

        loadAdministrativeDivisions();
    }, []);

    // 当地区变化时，更新可用的区县列表
    useEffect(() => {
        if (formData.region) {
            const regionData = administrativeDivisions.find(item => item.city === formData.region);
            if (regionData) {
                setAvailableDistricts(regionData.divisions);
                // 如果当前选择的区县不在新的地市下，清空区县选择
                if (formData.district && !regionData.divisions.includes(formData.district)) {
                    setFormData(prev => ({ ...prev, district: '' }));
                }
            } else {
                setAvailableDistricts([]);
                setFormData(prev => ({ ...prev, district: '' }));
            }
        } else {
            setAvailableDistricts([]);
            setFormData(prev => ({ ...prev, district: '' }));
        }
    }, [formData.region, administrativeDivisions]);

    // 初始化表单数据
    useEffect(() => {
        if (open && customer) {
            setFormData({
                user_name: mode === 'copy' ? `${customer.user_name} (副本)` : customer.user_name,
                short_name: mode === 'copy' ? `${customer.short_name} (副本)` : customer.short_name,
                user_type: customer.user_type || '',
                industry: customer.industry || '',
                voltage: customer.voltage || '',
                region: customer.region || '',
                district: customer.district || '',
                address: customer.address || '',
                location: mode === 'copy' ? undefined : customer.location,
                contact_person: customer.contact_person || '',
                contact_phone: customer.contact_phone || '',
                utility_accounts: mode === 'copy' ? [] : [...(customer.utility_accounts || [])]
            });
        } else if (open && isCreate) {
            setFormData({
                user_name: '',
                short_name: '',
                user_type: '',
                industry: '',
                voltage: '',
                region: '',
                district: '',
                address: '',
                location: undefined,
                contact_person: '',
                contact_phone: '',
                utility_accounts: []
            });
        }
    }, [open, customer, mode, isCreate]);

    // 防误操作：阻止背景点击关闭对话框
    const handleDialogClose = (event: {}, reason: "backdropClick" | "escapeKeyDown") => {
        if (loading) return;
        if (reason && reason === "backdropClick") {
            return;
        }
        setError(null);
        setShowAccountDialog(false);
        setShowMeteringPointDialog(false);
        setEditingAccount(null);
        setEditingMeteringPoint(null);
        onClose();
    };

    // 关闭对话框时重置状态
    const handleClose = () => {
        setError(null);
        setShowAccountDialog(false);
        setShowMeteringPointDialog(false);
        setEditingAccount(null);
        setEditingMeteringPoint(null);
        onClose();
    };

    // 处理表单字段变化
    const handleFieldChange = (field: keyof CustomerCreate, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // 添加户号
    const handleAddAccount = () => {
        setAccountFormData({ account_id: '' });
        setEditingAccount(null);
        setShowAccountDialog(true);
    };

    // 编辑户号
    const handleEditAccount = (accountIndex: number) => {
        const utilityAccounts = formData.utility_accounts || [];
        const account = utilityAccounts[accountIndex];
        if (!account) return;
        setAccountFormData({ account_id: account.account_id });
        setEditingAccount({ ...account, accountIndex });
        setShowAccountDialog(true);
    };

    // 保存户号
    const handleSaveAccount = () => {
        if (!accountFormData.account_id.trim()) {
            setError('户号不能为空');
            return;
        }

        if (editingAccount) {
            // 编辑模式
            const newAccounts = [...(formData.utility_accounts || [])];
            newAccounts[editingAccount.accountIndex] = {
                account_id: accountFormData.account_id,
                metering_points: editingAccount.metering_points
            };
            setFormData(prev => ({
                ...prev,
                utility_accounts: newAccounts
            }));
        } else {
            // 添加模式
            setFormData(prev => ({
                ...prev,
                utility_accounts: [
                    ...(prev.utility_accounts || []),
                    {
                        account_id: accountFormData.account_id,
                        metering_points: []
                    }
                ]
            }));
        }

        setShowAccountDialog(false);
        setEditingAccount(null);
    };

    // 删除户号
    const handleDeleteAccount = (accountIndex: number) => {
        if (!window.confirm('确定要删除该户号吗？')) {
            return;
        }

        const newAccounts = (formData.utility_accounts || []).filter((_, index) => index !== accountIndex);
        setFormData(prev => ({
            ...prev,
            utility_accounts: newAccounts
        }));
    };

    // 添加计量点
    const handleAddMeteringPoint = (accountIndex: number) => {
        setMeteringPointFormData({
            metering_point_id: '',
            allocation_percentage: 100,
            meter: {
                meter_id: '',
                multiplier: 1
            }
        });
        setEditingMeteringPoint({ accountIndex, meteringPoint: null });
        setShowMeteringPointDialog(true);
    };

    // 编辑计量点
    const handleEditMeteringPoint = (accountIndex: number, meteringPointIndex: number) => {
        const meteringPoint = formData.utility_accounts?.[accountIndex]?.metering_points?.[meteringPointIndex];
        if (!meteringPoint) return;
        setMeteringPointFormData({
            metering_point_id: meteringPoint.metering_point_id,
            allocation_percentage: meteringPoint.allocation_percentage,
            meter: { ...meteringPoint.meter }
        });
        setEditingMeteringPoint({ accountIndex, meteringPoint });
        setShowMeteringPointDialog(true);
    };

    // 保存计量点
    const handleSaveMeteringPoint = () => {
        if (!meteringPointFormData.metering_point_id.trim()) {
            setError('计量点ID不能为空');
            return;
        }

        if (!meteringPointFormData.meter.meter_id.trim()) {
            setError('电表资产号不能为空');
            return;
        }

        if (editingMeteringPoint) {
            const { accountIndex, meteringPoint } = editingMeteringPoint;
            const newAccounts = [...(formData.utility_accounts || [])];

            if (meteringPoint) {
                // 编辑模式
                const mpIndex = newAccounts[accountIndex].metering_points.findIndex(
                    mp => mp.metering_point_id === meteringPoint.metering_point_id
                );
                if (mpIndex !== -1) {
                    newAccounts[accountIndex].metering_points[mpIndex] = {
                        metering_point_id: meteringPointFormData.metering_point_id,
                        allocation_percentage: meteringPointFormData.allocation_percentage,
                        meter: meteringPointFormData.meter
                    };
                }
            } else {
                // 添加模式
                newAccounts[accountIndex].metering_points.push({
                    metering_point_id: meteringPointFormData.metering_point_id,
                    allocation_percentage: meteringPointFormData.allocation_percentage,
                    meter: meteringPointFormData.meter
                });
            }

            setFormData(prev => ({
                ...prev,
                utility_accounts: newAccounts
            }));
        }

        setShowMeteringPointDialog(false);
        setEditingMeteringPoint(null);
    };

    // 删除计量点
    const handleDeleteMeteringPoint = (accountIndex: number, meteringPointIndex: number) => {
        if (!window.confirm('确定要删除该计量点吗？')) {
            return;
        }

        const newAccounts = [...(formData.utility_accounts || [])];
        newAccounts[accountIndex].metering_points = newAccounts[accountIndex].metering_points.filter(
            (_, index) => index !== meteringPointIndex
        );
        setFormData(prev => ({
            ...prev,
            utility_accounts: newAccounts
        }));
    };

    // 保存客户
    const handleSaveCustomer = async () => {
        if (!formData.user_name.trim()) {
            setError('客户全称不能为空');
            return;
        }

        if (!formData.short_name.trim()) {
            setError('客户简称不能为空');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (isEdit && customer) {
                // 更新客户
                const updateData: CustomerUpdate = {
                    ...formData,
                    utility_accounts: formData.utility_accounts
                };
                console.log('Debug - 保存客户数据:', { customer_id: customer.id, updateData });
                await customerApi.updateCustomer(customer.id, updateData);
            } else {
                // 创建客户
                await customerApi.createCustomer(formData);
            }

            onSave();
        } catch (err: any) {
            console.error('保存客户失败:', err);
            setError(err.response?.data?.detail || err.message || '保存客户失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleDialogClose}
            fullScreen={isMobile}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                {mode === 'create' && '新增客户'}
                {mode === 'edit' && '编辑客户'}
                {mode === 'copy' && '复制客户'}
                {mode === 'view' && '查看客户详情'}
            </DialogTitle>

            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* 基本信息分区 */}
                <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>客户基本信息</Typography>
                        <Grid container spacing={{ xs: 1, sm: 2 }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="客户全称"
                                    required
                                    disabled={isReadOnly}
                                    value={formData.user_name}
                                    onChange={(e) => handleFieldChange('user_name', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="客户简称"
                                    required
                                    disabled={isReadOnly}
                                    value={formData.short_name}
                                    onChange={(e) => handleFieldChange('short_name', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth disabled={isReadOnly}>
                                    <InputLabel>用户类型</InputLabel>
                                    <Select
                                        value={formData.user_type || ''}
                                        label="用户类型"
                                        onChange={(e) => handleFieldChange('user_type', e.target.value)}
                                    >
                                        {customerApi.USER_TYPES.map((type) => (
                                            <MenuItem key={type} value={type}>
                                                {type}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth disabled={isReadOnly}>
                                    <InputLabel>行业</InputLabel>
                                    <Select
                                        value={formData.industry || ''}
                                        label="行业"
                                        onChange={(e) => handleFieldChange('industry', e.target.value)}
                                    >
                                        {customerApi.INDUSTRIES.map((industry) => (
                                            <MenuItem key={industry} value={industry}>
                                                {industry}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth disabled={isReadOnly}>
                                    <InputLabel>电压等级</InputLabel>
                                    <Select
                                        value={formData.voltage || ''}
                                        label="电压等级"
                                        onChange={(e) => handleFieldChange('voltage', e.target.value)}
                                    >
                                        {customerApi.VOLTAGE_LEVELS.map((voltage) => (
                                            <MenuItem key={voltage} value={voltage}>
                                                {voltage}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth disabled={isReadOnly}>
                                    <InputLabel>地区</InputLabel>
                                    <Select
                                        value={formData.region || ''}
                                        label="地区"
                                        onChange={(e) => handleFieldChange('region', e.target.value)}
                                    >
                                        {administrativeDivisions.map((region) => (
                                            <MenuItem key={region.city} value={region.city}>
                                                {region.city}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FormControl fullWidth disabled={isReadOnly || !formData.region}>
                                    <InputLabel>区县</InputLabel>
                                    <Select
                                        value={formData.district || ''}
                                        label="区县"
                                        onChange={(e) => handleFieldChange('district', e.target.value)}
                                    >
                                        {availableDistricts.map((district) => (
                                            <MenuItem key={district} value={district}>
                                                {district}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="详细地址"
                                    multiline
                                    rows={2}
                                    disabled={isReadOnly}
                                    value={formData.address || ''}
                                    onChange={(e) => handleFieldChange('address', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="经度"
                                    type="number"
                                    inputProps={{
                                        step: "any",
                                        min: -180,
                                        max: 180
                                    }}
                                    disabled={isReadOnly}
                                    value={formData.location?.coordinates[0] || ''}
                                    onChange={(e) => {
                                        const longitude = parseFloat(e.target.value);
                                        const latitude = formData.location?.coordinates[1];
                                        if (!isNaN(longitude)) {
                                            handleFieldChange('location', {
                                                type: "Point",
                                                coordinates: [longitude, latitude || 0]
                                            });
                                        }
                                    }}
                                    placeholder="例如: 115.89215"
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="纬度"
                                    type="number"
                                    inputProps={{
                                        step: "any",
                                        min: -90,
                                        max: 90
                                    }}
                                    disabled={isReadOnly}
                                    value={formData.location?.coordinates[1] || ''}
                                    onChange={(e) => {
                                        const latitude = parseFloat(e.target.value);
                                        const longitude = formData.location?.coordinates[0];
                                        if (!isNaN(latitude)) {
                                            handleFieldChange('location', {
                                                type: "Point",
                                                coordinates: [longitude || 0, latitude]
                                            });
                                        }
                                    }}
                                    placeholder="例如: 28.67649"
                                />
                            </Grid>
                        </Grid>
                </Paper>

                {/* 联系信息分区 */}
                <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>联系信息</Typography>
                        <Grid container spacing={{ xs: 1, sm: 2 }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="联系人"
                                    disabled={isReadOnly}
                                    value={formData.contact_person || ''}
                                    onChange={(e) => handleFieldChange('contact_person', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="联系电话"
                                    disabled={isReadOnly}
                                    value={formData.contact_phone || ''}
                                    onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
                                />
                            </Grid>
                          </Grid>
                </Paper>

                {/* 户号与计量点分区 */}
                <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">户号与计量点</Typography>
                        <Chip
                            label={formData.utility_accounts?.length || 0}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    </Box>
                        {!isReadOnly && (
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={handleAddAccount}
                                sx={{ mb: 2 }}
                            >
                                添加户号
                            </Button>
                        )}

                        {(formData.utility_accounts || []).map((account, accountIndex) => (
                            <Paper key={accountIndex} variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="subtitle1">
                                        户号: {account.account_id}
                                    </Typography>
                                    {!isReadOnly && (
                                        <Box>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditAccount(accountIndex)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteAccount(accountIndex)}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    )}
                                </Box>

                                {/* 计量点列表 */}
                                {!isReadOnly && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleAddMeteringPoint(accountIndex)}
                                        sx={{ mb: 1 }}
                                    >
                                        添加计量点
                                    </Button>
                                )}

                                {account.metering_points.length > 0 && (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>计量点ID</TableCell>
                                                    <TableCell align="right">分摊比例(%)</TableCell>
                                                    <TableCell>电表资产号</TableCell>
                                                    <TableCell align="right">倍率</TableCell>
                                                    {!isReadOnly && <TableCell>操作</TableCell>}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {account.metering_points.map((meteringPoint, mpIndex) => (
                                                    <TableRow key={mpIndex}>
                                                        <TableCell>{meteringPoint.metering_point_id}</TableCell>
                                                        <TableCell align="right">{meteringPoint.allocation_percentage}</TableCell>
                                                        <TableCell>{meteringPoint.meter.meter_id}</TableCell>
                                                        <TableCell align="right">{meteringPoint.meter.multiplier}</TableCell>
                                                        {!isReadOnly && (
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleEditMeteringPoint(accountIndex, mpIndex)}
                                                                    >
                                                                        <EditIcon fontSize="small" />
                                                                    </IconButton>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleDeleteMeteringPoint(accountIndex, mpIndex)}
                                                                        color="error"
                                                                    >
                                                                        <DeleteIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Box>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}

                                {account.metering_points.length === 0 && (
                                    <Typography color="text.secondary" sx={{ py: 1 }}>
                                        暂无计量点
                                    </Typography>
                                )}
                            </Paper>
                        ))}

                        {(!formData.utility_accounts || formData.utility_accounts.length === 0) && (
                            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                暂无户号，点击上方按钮添加
                            </Typography>
                        )}
                </Paper>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    {isReadOnly ? '关闭' : '取消'}
                </Button>
                {(mode === 'create' || mode === 'edit' || mode === 'copy') && (
                    <Button
                        onClick={handleSaveCustomer}
                        variant="contained"
                        disabled={loading}
                        startIcon={loading && <CircularProgress size={16} />}
                    >
                        {loading ? '保存中...' : '保存'}
                    </Button>
                )}
            </DialogActions>

            {/* 户号编辑对话框 */}
            <Dialog open={showAccountDialog} onClose={() => setShowAccountDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingAccount ? '编辑户号' : '添加户号'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="户号"
                        required
                        value={accountFormData.account_id}
                        onChange={(e) => setAccountFormData({ account_id: e.target.value })}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowAccountDialog(false)}>取消</Button>
                    <Button onClick={handleSaveAccount} variant="contained">确定</Button>
                </DialogActions>
            </Dialog>

            {/* 计量点编辑对话框 */}
            <Dialog open={showMeteringPointDialog} onClose={() => setShowMeteringPointDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingMeteringPoint?.meteringPoint ? '编辑计量点' : '添加计量点'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={12}>
                            <TextField
                                fullWidth
                                label="计量点ID"
                                required
                                value={meteringPointFormData.metering_point_id}
                                onChange={(e) => setMeteringPointFormData(prev => ({
                                    ...prev,
                                    metering_point_id: e.target.value
                                }))}
                            />
                        </Grid>
                        <Grid size={12}>
                            <TextField
                                fullWidth
                                label="电表资产号"
                                required
                                value={meteringPointFormData.meter.meter_id}
                                onChange={(e) => setMeteringPointFormData(prev => ({
                                    ...prev,
                                    meter: {
                                        ...prev.meter,
                                        meter_id: e.target.value
                                    }
                                }))}
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                label="倍率"
                                type="number"
                                inputProps={{ step: 0.1, min: 0 }}
                                value={meteringPointFormData.meter.multiplier}
                                onChange={(e) => setMeteringPointFormData(prev => ({
                                    ...prev,
                                    meter: {
                                        ...prev.meter,
                                        multiplier: parseFloat(e.target.value) || 0
                                    }
                                }))}
                            />
                        </Grid>
                        <Grid size={6}>
                            <TextField
                                fullWidth
                                label="分摊比例(%)"
                                type="number"
                                inputProps={{ step: 0.1, min: 0, max: 100 }}
                                value={meteringPointFormData.allocation_percentage}
                                onChange={(e) => setMeteringPointFormData(prev => ({
                                    ...prev,
                                    allocation_percentage: parseFloat(e.target.value) || 0
                                }))}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowMeteringPointDialog(false)}>取消</Button>
                    <Button onClick={handleSaveMeteringPoint} variant="contained">确定</Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};