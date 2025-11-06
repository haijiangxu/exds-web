import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, CircularProgress,
  useMediaQuery, useTheme, Paper, Typography, Grid, TextField, FormControl,
  FormLabel, RadioGroup, FormControlLabel, Radio, InputLabel, Select,
  MenuItem, Switch, FormHelperText, Alert
} from '@mui/material';
import { usePackageForm, PackageFormData } from '../hooks/usePackageForm';
import { Control, Controller } from 'react-hook-form';

import apiClient from '../api/client'; // Added apiClient

interface PackageEditorDialogProps {
  open: boolean;
  packageId?: string;
  mode: 'create' | 'edit' | 'copy';
  onClose: () => void;
  onSave: (data: PackageFormData, asDraft: boolean) => Promise<void>;
}

export const PackageEditorDialog: React.FC<PackageEditorDialogProps> = ({
  open, packageId, mode, onClose, onSave
}) => {

  const { control, handleSubmit, watch, reset, setError, clearErrors, formState: { errors } } = usePackageForm();
  const [loadingPackageData, setLoadingPackageData] = useState(false); // New state for loading
  const [saving, setSaving] = useState(false); // 新增：保存状态

  // 阻止背景点击关闭对话框
  const handleClose = (event: {}, reason: "backdropClick" | "escapeKeyDown") => {
    // 在保存期间，禁用所有关闭操作
    if (saving) return;

    if (reason && reason === "backdropClick") {
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        reset(); // Reset to default values for create mode
      } else if (packageId) {
        setLoadingPackageData(true);
        apiClient.get(`/api/v1/retail-packages/${packageId}`)
          .then(response => {
            let fetchedData = response.data;
            if (mode === 'copy') {
              fetchedData.package_name = fetchedData.package_name + '_副本';
              // 当复制时，删除原始ID，确保后端能创建新实体
              delete fetchedData.id;
              delete fetchedData._id;
            }
            reset(fetchedData); // Pre-fill form with fetched or modified data
          })
          .catch(error => {
            console.error("Failed to fetch package data for editing/copying", error);
            // Optionally show an error message to the user
            onClose(); // Close dialog on error
          })
          .finally(() => {
            setLoadingPackageData(false);
          });
      }
    } else {
      // When dialog closes, reset form
      reset();
    }
  }, [open, packageId, mode, reset, onClose]); // Added onClose to dependency array

  // Helper render functions
  const renderBasicInfoSection = (control: Control<PackageFormData>) => (
    <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
      <Typography variant="h6" gutterBottom>基本信息</Typography>
      <Grid container spacing={{ xs: 1, sm: 2 }}>
        <Grid size={{ xs: 12 }}>
          <Controller
            name="package_name"
            control={control}
            rules={{ required: '套餐名称不能为空' }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label="套餐名称"
                fullWidth
                required
                error={!!error}
                helperText={error?.message}
                onChange={(e) => {
                  field.onChange(e);
                  clearErrors('package_name'); // 输入时清除错误
                }}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">套餐类型</FormLabel>
            <Controller
              name="package_type"
              control={control}
              render={({ field }) => (
                <RadioGroup {...field} row>
                  <FormControlLabel value="time_based" control={<Radio />} label="分时段零售套餐" />
                  <FormControlLabel value="non_time_based" control={<Radio />} label="不分时段零售套餐" />
                </RadioGroup>
              )}
            />
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderPricingModeSection = (control: Control<PackageFormData>) => {
    const pricingMode = watch('pricing_mode');
    const packageType = watch('package_type');
    const fixedPricingMethod = watch('fixed_linked_config.fixed_price.pricing_method');

    // 监听自定义价格变化
    const customPrices = watch('fixed_linked_config.fixed_price.custom_prices');

    // 计算价格比例并判断是否符合标准
    const calculateRatioCompliance = () => {
      if (!customPrices || !customPrices.flat || customPrices.flat === 0) {
        return { compliant: true, ratios: null };
      }

      const ratios = {
        high_to_flat: customPrices.high / customPrices.flat,
        valley_to_flat: customPrices.valley / customPrices.flat,
        deep_valley_to_flat: customPrices.deep_valley / customPrices.flat,
      };

      // 标准比例：1.6:1:0.4:0.3
      const STANDARD_RATIOS = {
        high_to_flat: 1.6,
        valley_to_flat: 0.4,
        deep_valley_to_flat: 0.3,
      };

      // 判断是否符合（允许0.01的误差）
      const compliant =
        Math.abs(ratios.high_to_flat - STANDARD_RATIOS.high_to_flat) < 0.01 &&
        Math.abs(ratios.valley_to_flat - STANDARD_RATIOS.valley_to_flat) < 0.01 &&
        Math.abs(ratios.deep_valley_to_flat - STANDARD_RATIOS.deep_valley_to_flat) < 0.01;

      return { compliant, ratios };
    };

    const { compliant, ratios } = calculateRatioCompliance();

    return (
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Typography variant="h6" gutterBottom>定价模式</Typography>
        <Grid container spacing={{ xs: 1, sm: 2 }}>
          <Grid size={{ xs: 12 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">选择定价模式</FormLabel>
              <Controller
                name="pricing_mode"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field} row>
                    <FormControlLabel value="fixed_linked" control={<Radio />} label="固定价格 + 联动价格 + 浮动费用" />
                    <FormControlLabel value="price_spread" control={<Radio />} label="价差分成 + 浮动费用" />
                  </RadioGroup>
                )}
              />
            </FormControl>
          </Grid>

          {pricingMode === 'fixed_linked' && (
            <Grid size={{ xs: 12 }}>
              {/* FixedLinkedForm content */}
              <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>固定+联动定价配置</Typography>
                <Grid container spacing={2}> {/* Outer Grid container for the whole form */}
                  <Grid size={{ xs: 12 }}> {/* Fixed Price Section */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>固定价格 (Fixed Price)</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <FormControl component="fieldset">
                                <FormLabel component="legend">定价方式</FormLabel>
                                <Controller
                                    name="fixed_linked_config.fixed_price.pricing_method"
                                    control={control}
                                    render={({ field }) => (
                                    <RadioGroup {...field} row>
                                        <FormControlLabel value="custom" control={<Radio />} label="自定义价格" />
                                        <FormControlLabel value="reference" control={<Radio />} label="按参考价" />
                                    </RadioGroup>
                                    )}
                                />
                                </FormControl>
                            </Grid>

                            {packageType === 'time_based' && fixedPricingMethod === 'custom' && (
                                <>
                                    <Grid size={{ xs: 6, sm: 4 }}>
                                        <Controller
                                        name="fixed_linked_config.fixed_price.custom_prices.peak"
                                        control={control}
                                        render={({ field }) => <TextField {...field} type="number" label="尖峰时段价格 (元/MWh)" fullWidth variant="standard" />} 
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 4 }}>
                                        <Controller
                                        name="fixed_linked_config.fixed_price.custom_prices.high"
                                        control={control}
                                        render={({ field }) => <TextField {...field} type="number" label="峰时段价格 (元/MWh)" fullWidth variant="standard" />} 
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 4 }}>
                                        <Controller
                                        name="fixed_linked_config.fixed_price.custom_prices.flat"
                                        control={control}
                                        render={({ field }) => <TextField {...field} type="number" label="平时段价格 (元/MWh)" fullWidth variant="standard" />} 
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 4 }}>
                                        <Controller
                                        name="fixed_linked_config.fixed_price.custom_prices.valley"
                                        control={control}
                                        render={({ field }) => <TextField {...field} type="number" label="谷时段价格 (元/MWh)" fullWidth variant="standard" />} 
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 4 }}>
                                        <Controller
                                        name="fixed_linked_config.fixed_price.custom_prices.deep_valley"
                                        control={control}
                                        render={({ field }) => <TextField {...field} type="number" label="深谷时段价格 (元/MWh)" fullWidth variant="standard" />} 
                                        />
                                    </Grid>

                                    {/* 价格比例警告 */}
                                    {ratios && !compliant && (
                                      <Grid size={{ xs: 12 }}>
                                        <Alert severity="warning" sx={{ mt: 2 }}>
                                          当前自定义价格比例不满足463号文要求，结算时将自动调整为标准比例 (1.6:1:0.4:0.3)。
                                          <br />
                                          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                                            当前比例：峰/平={ratios.high_to_flat.toFixed(2)}，
                                            谷/平={ratios.valley_to_flat.toFixed(2)}，
                                            深谷/平={ratios.deep_valley_to_flat.toFixed(2)}
                                          </Typography>
                                        </Alert>
                                      </Grid>
                                    )}
                                </>
                            )}
                            {packageType === 'non_time_based' && fixedPricingMethod === 'custom' && (
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Controller
                                    name="fixed_linked_config.fixed_price.custom_prices.all_day"
                                    control={control}
                                    render={({ field }) => <TextField {...field} type="number" label="自定义价格 (元/MWh)" fullWidth variant="standard" />} 
                                    />
                                </Grid>
                            )}

                            {/* Reference pricing method for fixed price */}
                            {fixedPricingMethod === 'reference' && (
                                <Grid size={{ xs: 12 }}>
                                    <FormControl fullWidth variant="standard">
                                        <InputLabel>参考标的</InputLabel>
                                        <Controller
                                            name="fixed_linked_config.fixed_price.reference_target"
                                            control={control}
                                            render={({ field }) => (
                                                <Select {...field} label="参考标的">
                                                    <MenuItem value="grid_agency_price">电网代理购电价格(分时)</MenuItem>
                                                    <MenuItem value="market_monthly_avg">电力市场月度交易均价(分时)</MenuItem>
                                                </Select>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>
                  </Grid>

                  {/* Linked Price Section */}
                  <Grid size={{ xs: 12 }}> 
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>联动价格 (Linked Price)</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Controller
                            name="fixed_linked_config.linked_price.ratio"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                label="联动比例 (α) (%)"
                                fullWidth
                                variant="standard"
                                inputProps={{ step: "1" }} 
                                helperText="提示: 10%~20%，特定用户可为0"
                              />
                            )}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth variant="standard">
                            <InputLabel>联动标的</InputLabel>
                            <Controller
                              name="fixed_linked_config.linked_price.target"
                              control={control}
                              render={({ field }) => (
                                <Select {...field} label="联动标的">
                                  <MenuItem value="day_ahead_avg">日前市场均价(分时)</MenuItem>
                                  <MenuItem value="real_time_avg">实时市场均价(分时)</MenuItem>
                                </Select>
                              )}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  {/* Floating Fee Section */}
                  <Grid size={{ xs: 12 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>浮动费用 (Floating Fee)</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                          <Controller
                            name="fixed_linked_config.floating_fee"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                label="浮动费用 (元/MWh)"
                                fullWidth
                                variant="standard"
                                inputProps={{ step: "0.01" }}
                                helperText="提示: 可选项，大于等于0"
                              />
                            )}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}

          {pricingMode === 'price_spread' && (
            <Grid size={{ xs: 12 }}>
              {/* PriceSpreadForm content */}
              <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>价差分成定价配置</Typography>
                <Grid container spacing={2}> {/* Outer Grid container for the whole form */}
                  <Grid size={{ xs: 12 }}> {/* Reference Price Section */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>参考价 (Reference Price)</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                          <FormControl fullWidth variant="standard">
                            <InputLabel>参考标的</InputLabel>
                            <Controller
                              name="price_spread_config.reference_price.target"
                              control={control}
                              render={({ field }) => (
                                <Select {...field} label="参考标的">
                                  <MenuItem value="market_monthly_avg">电力市场月度交易均价</MenuItem>
                                  <MenuItem value="grid_agency">电网代理购电价格</MenuItem>
                                  <MenuItem value="wholesale_settlement">批发侧结算均价</MenuItem>
                                </Select>
                              )}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12 }}> {/* Price-spread Sharing Section */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>价差分成 (Price-spread Sharing)</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Controller
                            name="price_spread_config.price_spread.agreed_spread"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                label="约定价差 (元/MWh)"
                                fullWidth
                                variant="standard"
                                inputProps={{ step: "1" }}
                                helperText="提示: 可为固定值或参考价之差"
                              />
                            )}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Controller
                            name="price_spread_config.price_spread.sharing_ratio"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                label="分成比例 (k) (%)"
                                fullWidth
                                variant="standard"
                                inputProps={{ step: "1" }}
                                helperText="提示: 0%~100%"
                              />
                            )}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12 }}> {/* Floating Fee Section */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>浮动费用 (Floating Fee)</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                          <Controller
                            name="price_spread_config.floating_fee"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                type="number"
                                label="浮动费用 (元/MWh)"
                                fullWidth
                                variant="standard"
                                inputProps={{ step: "0.01" }}
                                helperText="提示: 可选项，大于等于0"
                              />
                            )}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  };

  const renderAdditionalTermsSection = (control: Control<PackageFormData>, packageType: string) => {
    const greenPowerEnabled = watch('additional_terms.green_power.enabled');
    const priceCapEnabled = watch('additional_terms.price_cap.enabled');

    return (
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Typography variant="h6" gutterBottom>附加条款</Typography>
        <Grid container spacing={{ xs: 1, sm: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <FormControlLabel
                control={
                  <Controller
                    name="additional_terms.green_power.enabled"
                    control={control}
                    render={({ field }) => <Switch {...field} checked={field.value} />}
                  />
                }
                label="绿色电力套餐"
                disabled={packageType !== 'time_based'}
              />
              {greenPowerEnabled && (
                <Box sx={{ mt: 2 }}>
                  <Controller
                    name="additional_terms.green_power.monthly_env_value"
                    control={control}
                    render={({ field }) => <TextField {...field} type="number" label="月度绿色电力环境价值 (元/MWh)" fullWidth margin="dense" />} 
                  />
                  <Controller
                    name="additional_terms.green_power.deviation_compensation_ratio"
                    control={control}
                    render={({ field }) => <TextField {...field} type="number" label="偏差补偿比例 (%)" fullWidth margin="dense" />} 
                  />
                  <FormHelperText sx={{ mt: 1 }}>
                    “双方用电量与约定电量偏差时，将按此比例进行补偿”。
                  </FormHelperText>
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <FormControlLabel
                control={
                  <Controller
                    name="additional_terms.price_cap.enabled"
                    control={control}
                    render={({ field }) => <Switch {...field} checked={field.value} />}
                  />
                }
                label="封顶价格条款"
              />
              {priceCapEnabled && (
                <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth margin="dense">
                        <InputLabel>参考价格标的</InputLabel>
                        <Controller
                            name="additional_terms.price_cap.reference_target"
                            control={control}
                            defaultValue="grid_agency_monthly_avg"
                            render={({ field }) => (
                                <Select {...field} label="参考价格标的">
                                    <MenuItem value="grid_agency_monthly_avg">电网代理购电发布的电力市场当月平均上网电价</MenuItem>
                                    {/* Add other options if available */}
                                </Select>
                            )}
                        />
                    </FormControl>
                  <Controller
                    name="additional_terms.price_cap.non_peak_markup"
                    control={control}
                    render={({ field }) => <TextField {...field} type="number" label="非尖峰月份上浮 (%)" fullWidth margin="dense" />} 
                  />
                  <Controller
                    name="additional_terms.price_cap.peak_markup"
                    control={control}
                    render={({ field }) => <TextField {...field} type="number" label="尖峰月份上浮 (%)" fullWidth margin="dense" />} 
                  />
                  <FormHelperText sx={{ mt: 1 }}>
                    “结算时，若套餐结算价高于封顶价，将按封顶价结算”。
                  </FormHelperText>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const packageType = watch('package_type'); // Watch package_type for conditional rendering in AdditionalTerms

  // 保存处理函数
  const handleSaveClick = async (asDraft: boolean) => {
    handleSubmit(async (data: PackageFormData) => {
      setSaving(true);
      clearErrors(); // 清除之前的错误

      try {
        await onSave(data, asDraft);
        // onSave成功后会关闭对话框
      } catch (error: any) {
        // 处理409冲突错误
        if (error.response?.status === 409) {
          setError('package_name', {
            type: 'manual',
            message: '套餐名称已存在，请使用其他名称'
          });
        }
        // 其他错误在父组件处理
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullScreen={isMobile} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? '新建零售套餐' : (mode === 'edit' ? '编辑零售套餐' : '复制零售套餐')}
      </DialogTitle>

      <DialogContent dividers>
        {loadingPackageData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress />
          </Box>
        ) : (
          <form>
            {renderBasicInfoSection(control)}
            {renderPricingModeSection(control)}
            {renderAdditionalTermsSection(control, packageType)}
          </form>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loadingPackageData || saving}>取消</Button>
        <Button
          variant="outlined"
          onClick={() => handleSaveClick(true)}
          disabled={loadingPackageData || saving}
        >
          {saving ? '保存中...' : '保存为草稿'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};