import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    CircularProgress,
    Paper,
    Typography,
    Grid,
    Chip,
    useMediaQuery,
    useTheme,
    Alert,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Edit as EditIcon,
    ContentCopy as CopyIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Customer } from '../api/customer';
import customerApi from '../api/customer';

interface CustomerDetailsDialogProps {
    open: boolean;
    customerId: string | null;
    onClose: () => void;
    onEdit?: (id: string) => void;
    onCopy?: (id: string) => void;
}

export const CustomerDetailsDialog: React.FC<CustomerDetailsDialogProps> = ({
    open,
    customerId,
    onClose,
    onEdit,
    onCopy
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [data, setData] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 加载客户详情数据
    const loadCustomerDetails = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await customerApi.getCustomer(id);
            setData(response.data);
        } catch (err: any) {
            console.error('加载客户详情失败:', err);
            setError(err.response?.data?.detail || err.message || '加载客户详情失败');
        } finally {
            setLoading(false);
        }
    };

    // 当对话框打开且有客户ID时加载数据
    useEffect(() => {
        if (open && customerId) {
            loadCustomerDetails(customerId);
        } else if (!open) {
            // 对话框关闭时清除数据
            setData(null);
            setError(null);
        }
    }, [open, customerId]);

    // 获取状态颜色和文本
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

    // 防误操作：阻止背景点击关闭对话框
    const handleClose = (event: {}, reason: "backdropClick" | "escapeKeyDown") => {
        if (reason && reason === "backdropClick") {
            return;
        }
        onClose();
    };

    // 处理编辑操作
    const handleEdit = () => {
        if (customerId && onEdit) {
            onClose();
            onEdit(customerId);
        }
    };

    // 处理复制操作
    const handleCopy = () => {
        if (customerId && onCopy) {
            onClose();
            onCopy(customerId);
        }
    };

    // 渲染基本信息卡片
    const renderBasicInfo = () => (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
            <Typography variant="h6" gutterBottom>基本信息</Typography>
            <Grid container spacing={{ xs: 1, sm: 2 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">客户全称</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                        {data?.user_name || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">客户简称</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                        {data?.short_name || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">用户类型</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.user_type || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">行业</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.industry || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">电压等级</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.voltage || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">状态</Typography>
                    <Box sx={{ mt: 0.5 }}>
                        <Chip
                            label={getStatusText(data?.status || '')}
                            color={getStatusColor(data?.status || '') as any}
                            size="small"
                        />
                    </Box>
                </Grid>
            </Grid>
        </Paper>
    );

    // 渲染地理位置信息卡片
    const renderLocationInfo = () => (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
            <Typography variant="h6" gutterBottom>地理位置信息</Typography>
            <Grid container spacing={{ xs: 1, sm: 2 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">地市</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.region || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">区县</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.district || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">详细地址</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.address || '-'}
                    </Typography>
                </Grid>
                {data?.location && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">经度</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data.location.coordinates[0].toFixed(6)}
                        </Typography>
                    </Grid>
                )}
                {data?.location && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">纬度</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data.location.coordinates[1].toFixed(6)}
                        </Typography>
                    </Grid>
                )}
            </Grid>
        </Paper>
    );

    // 渲染联系信息卡片
    const renderContactInfo = () => (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
            <Typography variant="h6" gutterBottom>联系信息</Typography>
            <Grid container spacing={{ xs: 1, sm: 2 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">联系人</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.contact_person || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">联系电话</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.contact_phone || '-'}
                    </Typography>
                </Grid>
              </Grid>
        </Paper>
    );

    // 渲染户号信息卡片
    const renderAccountInfo = () => (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">户号信息</Typography>
                <Chip
                    label={`${data?.utility_accounts?.length || 0} 个户号`}
                    size="small"
                    color="primary"
                    variant="outlined"
                />
            </Box>

            {data?.utility_accounts?.map((account, index) => (
                <Box key={index} sx={{ mb: index < (data.utility_accounts!.length - 1) ? 2 : 0 }}>
                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.default' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                            户号: {account.account_id}
                        </Typography>

                        {account.metering_points && account.metering_points.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    计量点信息 ({account.metering_points.length}个)
                                </Typography>
                                {account.metering_points.map((point, pointIndex) => (
                                    <Box key={pointIndex} sx={{
                                        ml: 2,
                                        mt: 1,
                                        p: 1,
                                        backgroundColor: 'background.paper',
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider'
                                    }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                            计量点: {point.metering_point_id}
                                        </Typography>
                                        <Box sx={{ mt: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                电表资产号: {point.meter.meter_id}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                                                倍率: {point.meter.multiplier}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                                                分摊比例: {point.allocation_percentage}%
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}

                        {(!account.metering_points || account.metering_points.length === 0) && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                暂无计量点
                            </Typography>
                        )}
                    </Paper>
                </Box>
            ))}

            {(!data?.utility_accounts || data.utility_accounts.length === 0) && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                        暂无户号信息
                    </Typography>
                </Box>
            )}
        </Paper>
    );

    // 渲染系统信息卡片
    const renderSystemInfo = () => (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
            <Typography variant="h6" gutterBottom>系统信息</Typography>
            <Grid container spacing={{ xs: 1, sm: 2 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">创建时间</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.created_at ?
                            format(new Date(data.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) :
                            '-'
                        }
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">更新时间</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.updated_at ?
                            format(new Date(data.updated_at), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) :
                            '-'
                        }
                    </Typography>
                </Grid>
                {data?.created_by && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">创建人</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data.created_by}
                        </Typography>
                    </Grid>
                )}
                {data?.updated_by && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">更新人</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data.updated_by}
                        </Typography>
                    </Grid>
                )}
            </Grid>
        </Paper>
    );

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullScreen={isMobile}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    maxHeight: { xs: '100vh', sm: '90vh' },
                    overflowY: 'auto'
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pb: 1
            }}>
                <Typography variant="h6" component="div">
                    客户详情
                </Typography>
                <Tooltip title="关闭">
                    <IconButton edge="end" onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : data ? (
                    <Box>
                        {renderBasicInfo()}
                        {renderLocationInfo()}
                        {renderContactInfo()}
                        {renderAccountInfo()}
                        {renderSystemInfo()}
                    </Box>
                ) : null}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={onClose}>
                    关闭
                </Button>
                <Button
                    variant="outlined"
                    onClick={handleCopy}
                    disabled={!data}
                    startIcon={<CopyIcon />}
                >
                    复制
                </Button>
                <Button
                    variant="contained"
                    onClick={handleEdit}
                    disabled={!data || data?.status !== 'active'}
                    startIcon={<EditIcon />}
                >
                    编辑
                </Button>
            </DialogActions>
        </Dialog>
    );
};