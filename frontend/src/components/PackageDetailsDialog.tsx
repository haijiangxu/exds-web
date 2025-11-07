import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, CircularProgress, Paper, Typography, Grid, Chip,
  useMediaQuery, useTheme, Alert, Divider
} from '@mui/material';
import apiClient from '../api/client';
import { format } from 'date-fns';

interface PackageDetailsDialogProps {
  open: boolean;
  packageId: string | null;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onCopy?: (id: string) => void;
}

export const PackageDetailsDialog: React.FC<PackageDetailsDialogProps> = ({
  open, packageId, onClose, onEdit, onCopy
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 阻止背景点击关闭对话框
  const handleClose = (event: {}, reason: "backdropClick" | "escapeKeyDown") => {
    if (reason && reason === "backdropClick") {
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!open) {
      // 对话框关闭时重置状态
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!packageId) {
      return;
    }

    // open=true 且 packageId 有值，开始加载数据
    setLoading(true);
    setError(null);
    setData(null);

    apiClient.get(`/api/v1/retail-packages/${packageId}`)
      .then(response => {
        setData(response.data);
      })
      .catch(error => {
        console.error('加载套餐详情失败', error);
        setError(error.response?.data?.detail || '加载失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, packageId]);

  // 渲染基本信息卡片
  const renderBasicInfo = () => (
    <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
      <Typography variant="h6" gutterBottom>基本信息</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="body2" color="text.secondary">套餐名称</Typography>
          <Typography variant="body1" sx={{ mt: 0.5 }}>{data?.package_name}</Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="body2" color="text.secondary">套餐类型</Typography>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={data?.package_type === 'time_based' ? '分时段零售套餐' : '不分时段零售套餐'}
              size="small"
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="body2" color="text.secondary">绿电套餐</Typography>
          <Box sx={{ mt: 0.5 }}>
            {data?.is_green_power ? (
              <Chip label="是" size="small" color="success" />
            ) : (
              <Chip label="否" size="small" variant="outlined" />
            )}
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="body2" color="text.secondary">状态</Typography>
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={data?.status === 'draft' ? '草稿' : data?.status === 'active' ? '生效' : '归档'}
              size="small"
              color={data?.status === 'active' ? 'success' : 'default'}
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="body2" color="text.secondary">创建时间</Typography>
          <Typography variant="body1" sx={{ mt: 0.5 }}>
            {data?.created_at ? format(new Date(data.created_at), 'yyyy-MM-dd HH:mm:ss') : '-'}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="body2" color="text.secondary">更新时间</Typography>
          <Typography variant="body1" sx={{ mt: 0.5 }}>
            {data?.updated_at ? format(new Date(data.updated_at), 'yyyy-MM-dd HH:mm:ss') : '-'}
          </Typography>
        </Grid>
        {data?.status === 'active' && data?.activated_at && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">激活时间</Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {format(new Date(data.activated_at), 'yyyy-MM-dd HH:mm:ss')}
            </Typography>
          </Grid>
        )}
        {data?.status === 'archived' && data?.archived_at && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">归档时间</Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {format(new Date(data.archived_at), 'yyyy-MM-dd HH:mm:ss')}
            </Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  );

  // 渲染定价配置卡片（临时版本 - 将在会话7中完整重构）
  const renderPricingMode = () => {
    const modelCode = data?.model_code;
    const pricingConfig = data?.pricing_config;

    return (
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Typography variant="h6" gutterBottom>定价配置</Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          【临时展示】完整的定价配置展示将在会话7中实现
        </Alert>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary">定价模型代码</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={modelCode || '未知模型'}
                size="small"
                color="primary"
              />
            </Box>
          </Grid>

          {pricingConfig && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">配置详情（JSON）</Typography>
              <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: 'grey.50' }}>
                <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(pricingConfig, null, 2)}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  };

  // 渲染绿电配置卡片
  const renderGreenPowerConfig = () => {
    if (!data?.is_green_power || !data?.green_power_config) return null;

    return (
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Typography variant="h6" gutterBottom>绿色电力配置</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">月度绿色电力环境价值</Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {data?.green_power_config?.monthly_env_value || 0} 元/MWh
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">偏差补偿比例</Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {data?.green_power_config?.deviation_compensation_ratio || 0}%
            </Typography>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
              双方用电量与约定电量偏差时，将按此比例进行补偿
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  // 渲染价格说明卡片
  const renderPriceDescription = () => (
    <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
      <Typography variant="h6" gutterBottom>价格说明</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          封顶价格条款
        </Typography>

        <Alert severity="info" sx={{ mt: 1 }}>
          <Typography variant="body2">
            零售用户月度结算均价封顶，零售用户月度结算均价对比参考价（按照电网代理购电发布的电力市场月度交易均价(当月平均上网电价)）上浮不超过5%(非尖峰月份）、上浮不超过10%（尖峰月份），若零售套餐结算价格高于封顶价格时，按照封顶价格结算。
          </Typography>
        </Alert>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          注：此条款为系统默认条款，不可编辑
        </Typography>
      </Paper>
    </Paper>
  );

  return (
    <Dialog open={open} onClose={handleClose} fullScreen={isMobile} maxWidth="md" fullWidth>
      <DialogTitle>套餐详情</DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : data ? (
          <>
            {renderBasicInfo()}
            {renderPricingMode()}
            {renderGreenPowerConfig()}
            {renderPriceDescription()}
          </>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        <Button
          variant="outlined"
          onClick={() => {
            if (packageId && onCopy) {
              onClose();
              onCopy(packageId);
            }
          }}
          disabled={!data}
        >
          复制
        </Button>
        {data?.status === 'draft' && (
          <Button
            variant="contained"
            onClick={() => {
              if (packageId && onEdit) {
                onClose();
                onEdit(packageId);
              }
            }}
          >
            编辑
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
