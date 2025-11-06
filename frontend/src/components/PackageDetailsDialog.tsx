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

  // 渲染定价模式卡片
  const renderPricingMode = () => {
    const pricingMode = data?.pricing_mode;
    const packageType = data?.package_type;

    return (
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Typography variant="h6" gutterBottom>定价模式</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary">定价模式</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={pricingMode === 'fixed_linked' ? '固定价格 + 联动价格 + 浮动费用' : '价差分成 + 浮动费用'}
                size="small"
                color="primary"
              />
            </Box>
          </Grid>

          {/* 固定+联动定价模式展示 */}
          {pricingMode === 'fixed_linked' && (
            <>
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>固定价格 (Fixed Price)</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="body2" color="text.secondary">定价方式</Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.fixed_linked_config?.fixed_price?.pricing_method === 'custom' ? '自定义价格' : '按参考价'}
                      </Typography>
                    </Grid>

                    {/* 自定义价格展示 - 分时 */}
                    {packageType === 'time_based' && data?.fixed_linked_config?.fixed_price?.pricing_method === 'custom' && (
                      <>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <Typography variant="body2" color="text.secondary">尖峰时段价格</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data?.fixed_linked_config?.fixed_price?.custom_prices?.peak || 0} 元/MWh
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <Typography variant="body2" color="text.secondary">峰时段价格</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data?.fixed_linked_config?.fixed_price?.custom_prices?.high || 0} 元/MWh
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <Typography variant="body2" color="text.secondary">平时段价格</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data?.fixed_linked_config?.fixed_price?.custom_prices?.flat || 0} 元/MWh
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <Typography variant="body2" color="text.secondary">谷时段价格</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data?.fixed_linked_config?.fixed_price?.custom_prices?.valley || 0} 元/MWh
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                          <Typography variant="body2" color="text.secondary">深谷时段价格</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data?.fixed_linked_config?.fixed_price?.custom_prices?.deep_valley || 0} 元/MWh
                          </Typography>
                        </Grid>

                        {/* 价格比例校验结果展示 */}
                        {data?.validation && !data.validation.price_ratio_compliant && (
                          <Grid size={{ xs: 12 }}>
                            <Alert severity="warning" sx={{ mt: 1 }}>
                              当前价格比例不满足463号文要求，结算时将自动调整为标准比例 (1.6:1:0.4:0.3)
                            </Alert>
                          </Grid>
                        )}
                      </>
                    )}

                    {/* 自定义价格展示 - 不分时 */}
                    {packageType === 'non_time_based' && data?.fixed_linked_config?.fixed_price?.pricing_method === 'custom' && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="body2" color="text.secondary">自定义价格</Typography>
                          <Typography variant="body1" sx={{ mt: 0.5 }}>
                            {data?.fixed_linked_config?.fixed_price?.custom_prices?.all_day || 0} 元/MWh
                          </Typography>
                        </Grid>
                    )}

                    {/* 参考价展示 */}
                    {data?.fixed_linked_config?.fixed_price?.pricing_method === 'reference' && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" color="text.secondary">参考标的</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                          {data?.fixed_linked_config?.fixed_price?.reference_target === 'grid_agency_price'
                            ? '电网代理购电价格(分时)'
                            : '电力市场月度交易均价(分时)'}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>

              {/* 联动价格展示 */}
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>联动价格 (Linked Price)</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">联动比例 (α)</Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.fixed_linked_config?.linked_price?.ratio || 0}%
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">联动标的</Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.fixed_linked_config?.linked_price?.target === 'day_ahead_avg'
                          ? '日前市场均价(分时)'
                          : '实时市场均价(分时)'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* 浮动费用展示 */}
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>浮动费用 (Floating Fee)</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">浮动费用</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {data?.fixed_linked_config?.floating_fee || 0} 元/MWh
                  </Typography>
                </Paper>
              </Grid>
            </>
          )}

          {/* 价差分成定价模式展示 */}
          {pricingMode === 'price_spread' && (
            <>
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>参考价 (Reference Price)</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">参考标的</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {data?.price_spread_config?.reference_price?.target === 'market_monthly_avg'
                      ? '电力市场月度交易均价'
                      : data?.price_spread_config?.reference_price?.target === 'grid_agency'
                        ? '电网代理购电价格'
                        : '批发侧结算均价'}
                  </Typography>
                </Paper>
              </Grid>

              {/* 价差分成展示 */}
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>价差分成 (Price-spread Sharing)</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">约定价差</Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.price_spread_config?.price_spread?.agreed_spread || 0} 元/MWh
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">分成比例 (k)</Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {data?.price_spread_config?.price_spread?.sharing_ratio || 0}%
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* 浮动费用展示 */}
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>浮动费用 (Floating Fee)</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">浮动费用</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {data?.price_spread_config?.floating_fee || 0} 元/MWh
                  </Typography>
                </Paper>
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
    );
  };

  // 渲染附加条款卡片
  const renderAdditionalTerms = () => (
    <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
      <Typography variant="h6" gutterBottom>附加条款</Typography>
      <Grid container spacing={2}>
        {/* 绿色电力套餐 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1">绿色电力套餐</Typography>
              <Chip
                label={data?.additional_terms?.green_power?.enabled ? '已启用' : '未启用'}
                size="small"
                color={data?.additional_terms?.green_power?.enabled ? 'success' : 'default'}
                sx={{ ml: 1 }}
              />
            </Box>
            {data?.additional_terms?.green_power?.enabled && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">月度绿色电力环境价值</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      {data?.additional_terms?.green_power?.monthly_env_value || 0} 元/MWh
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">偏差补偿比例</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      {data?.additional_terms?.green_power?.deviation_compensation_ratio || 0}%
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
                      双方用电量与约定电量偏差时，将按此比例进行补偿
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* 封顶价格条款 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1">封顶价格条款</Typography>
              <Chip
                label={data?.additional_terms?.price_cap?.enabled ? '已启用' : '未启用'}
                size="small"
                color={data?.additional_terms?.price_cap?.enabled ? 'warning' : 'default'}
                sx={{ ml: 1 }}
              />
            </Box>
            {data?.additional_terms?.price_cap?.enabled && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">参考价格标的</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      电网代理购电发布的电力市场当月平均上网电价
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">非尖峰月份上浮</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      {data?.additional_terms?.price_cap?.non_peak_markup || 0}%
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary">尖峰月份上浮</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      {data?.additional_terms?.price_cap?.peak_markup || 0}%
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
                      结算时，若套餐结算价高于封顶价，将按封顶价结算
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>
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
            {renderPricingMode()}
            {renderAdditionalTerms()}
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
