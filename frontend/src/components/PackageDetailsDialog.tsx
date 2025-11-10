import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, CircularProgress, Paper, Typography, Grid, Chip,
  useMediaQuery, useTheme, Alert, Divider
} from '@mui/material';
import apiClient from '../api/client';
import { format } from 'date-fns';
import usePricingModels from '../hooks/usePricingModels';
import { PricingDetails } from './pricing/details/PricingDetails';

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
  const { getModelByCode } = usePricingModels();

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
          <Typography variant="body2" color="text.secondary">合同数</Typography>
          <Typography variant="body1" sx={{ mt: 0.5 }}>
            {data?.contract_count || 0}
          </Typography>
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
            {data.model_code && (
              <PricingDetails
                model={getModelByCode(data.model_code)}
                pricingConfig={data.pricing_config}
                packageType={data.package_type}
              />
            )}
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
