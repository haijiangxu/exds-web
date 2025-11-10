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
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Contract } from '../api/retail-contracts';
import apiClient from '../api/client';
import usePricingModels from '../hooks/usePricingModels';
import { PricingDetails } from './pricing/details/PricingDetails';

interface ContractDetailsDialogProps {
    open: boolean;
    contractId: string | null;
    onClose: () => void;
    onEdit?: (id: string) => void;
    onCopy?: (id: string) => void;
}

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

export const ContractDetailsDialog: React.FC<ContractDetailsDialogProps> = ({
    open,
    contractId,
    onClose,
    onEdit,
    onCopy
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { getModelByCode } = usePricingModels();

    const [data, setData] = useState<Contract | null>(null);
    const [packageData, setPackageData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 加载合同详情数据
    const loadContractDetails = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(`/api/v1/retail-contracts/${id}`);
            setData(response.data);

            // 加载关联的套餐详情
            if (response.data.package_id) {
                try {
                    const packageResponse = await apiClient.get(`/api/v1/retail-packages/${response.data.package_id}`);
                    setPackageData(packageResponse.data);
                } catch (packageError) {
                    console.error('加载套餐详情失败:', packageError);
                    // 套餐加载失败不影响合同详情显示
                }
            }
        } catch (err: any) {
            console.error('加载合同详情失败:', err);
            setError(err.response?.data?.detail || err.message || '加载合同详情失败');
        } finally {
            setLoading(false);
        }
    };

    // 当对话框打开且有合同ID时加载数据
    useEffect(() => {
        if (open && contractId) {
            loadContractDetails(contractId);
        } else if (!open) {
            // 对话框关闭时清除数据
            setData(null);
            setPackageData(null);
            setError(null);
        }
    }, [open, contractId]);

    // 防误操作：阻止背景点击关闭对话框
    const handleClose = (event: {}, reason: "backdropClick" | "escapeKeyDown") => {
        if (reason && reason === "backdropClick") {
            return;
        }
        onClose();
    };

    // 处理编辑操作
    const handleEdit = () => {
        if (contractId && onEdit) {
            onClose();
            onEdit(contractId);
        }
    };

    // 处理复制操作
    const handleCopy = () => {
        if (contractId && onCopy) {
            onClose();
            onCopy(contractId);
        }
    };

    // 渲染合同基本信息卡片
    const renderContractInfo = () => (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
            <Typography variant="h6" gutterBottom>合同基本信息</Typography>
            <Grid container spacing={{ xs: 1, sm: 2 }}>
                <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">合同名称</Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            mt: 0.5,
                            fontWeight: 'medium',
                            wordBreak: 'break-all'
                        }}
                    >
                        {data?.contract_name || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">客户名称</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                        {data?.customer_name || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">套餐名称</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                        {data?.package_name || '-'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">购买电量</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.purchasing_electricity_quantity ?
                            `${data.purchasing_electricity_quantity.toLocaleString()} kWh` : '-'
                        }
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">购电月份</Typography>
                    <Box sx={{ mt: 0.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="body1">
                            {formatMonthDisplay(data?.purchase_start_month || '')}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            至
                        </Typography>
                        <Typography variant="body1">
                            {formatMonthDisplay(data?.purchase_end_month || '')}
                        </Typography>
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">状态</Typography>
                    <Box sx={{ mt: 0.5 }}>
                        <Chip
                            label={statusMap[data?.status || ''] || data?.status || '-'}
                            color={getStatusChipColor(data?.status || '') as any}
                            size="small"
                        />
                    </Box>
                </Grid>
            </Grid>
        </Paper>
    );

    // 渲染定价模型详情
    const renderPricingDetails = () => {
        if (!packageData?.model_code) {
            return null;
        }

        const model = getModelByCode(packageData.model_code);
        if (!model) {
            return (
                <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>定价模型详情</Typography>
                    <Alert severity="warning">
                        定价模型详情加载失败或模型不存在
                    </Alert>
                </Paper>
            );
        }

        const isGreenPower = packageData.is_green_power;

        return (
            <PricingDetails
                model={model}
                pricingConfig={packageData.pricing_config || {}}
                packageType={packageData.package_type}
                isGreenPower={isGreenPower}
            />
        );
    };

    // 渲染合同系统信息卡片
    const renderSystemInfo = () => (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
            <Typography variant="h6" gutterBottom>合同系统信息</Typography>
            <Grid container spacing={{ xs: 1, sm: 2 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">合同创建时间</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.created_at ?
                            format(new Date(data.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) :
                            '-'
                        }
                    </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">合同更新时间</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.updated_at ?
                            format(new Date(data.updated_at), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) :
                            '-'
                        }
                    </Typography>
                </Grid>
                {data?.created_by && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">合同创建人</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data.created_by}
                        </Typography>
                    </Grid>
                )}
                {data?.updated_by && (
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="body2" color="text.secondary">合同更新人</Typography>
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
            maxWidth="lg"
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
                    合同详情
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
                        {renderContractInfo()}
                        {renderPricingDetails()}
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
                    disabled={!data || data?.status !== 'pending'}
                    startIcon={<EditIcon />}
                >
                    编辑
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ContractDetailsDialog;