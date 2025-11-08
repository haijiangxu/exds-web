import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, CircularProgress,
  useMediaQuery, useTheme, Paper, Typography, Grid, TextField, FormControl,
  FormLabel, RadioGroup, FormControlLabel, Radio, Switch, FormHelperText,
  Alert, Tooltip, IconButton, Select, MenuItem, InputLabel
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { usePackageForm, PackageFormData } from '../hooks/usePackageForm';
import { Control, Controller } from 'react-hook-form';
import apiClient from '../api/client';
import { PricingConfigForm } from './pricing/PricingConfigForm';
import usePricingModels from '../hooks/usePricingModels'; // 导入共享Hook

// 绿电提示文本
const GREEN_POWER_HINT = `1. 套餐选择开启绿电合同，用户下单时需录入绿电合同电量，售电公司在批发侧成交的绿电合同电量按此电量等比例分摊给签署了绿电套餐的零售用户。
2. 按照绿电交易"优先交易、优先出清、优先执行、优先结算"原则，绿电交易的电能量优先常规交易电量能结算。
3. 售电公司通过批侧成交的绿电合同的电能量价、环境价值直接传递给零售用户，零售用户分时绿电结算量、结算价根据其用电量、各绿电合同电量、各合同对应电厂上网电量三者取小确定。`;

// 绿电警告文字
const GREEN_POWER_WARNING = "按照所代理零售用户月度零售套餐约定的绿色电力环境价值从高到低进行排序，交易电量优先分配环境价值高的零售用户";

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

  const { control, handleSubmit, watch, reset, setError, clearErrors, setValue } = usePackageForm();
  const [loadingPackageData, setLoadingPackageData] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { models: allPricingModels, loading: loadingModels } = usePricingModels();
  const [pricingModels, setPricingModels] = useState<any[]>([]);

  const packageType = watch('package_type');
  const modelCode = watch('model_code');
  const isGreenPower = watch('is_green_power');

  // 阻止背景点击关闭对话框
  const handleClose = (event: {}, reason: "backdropClick" | "escapeKeyDown") => {
    if (saving) return;
    if (reason && reason === "backdropClick") {
      return;
    }
    onClose();
  };

  // 加载套餐数据（编辑/复制模式）
  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        reset();
      } else if (packageId) {
        setLoadingPackageData(true);
        apiClient.get(`/api/v1/retail-packages/${packageId}`)
          .then(response => {
            let fetchedData = response.data;
            if (mode === 'copy') {
              fetchedData.package_name = fetchedData.package_name + '_副本';
              delete fetchedData.id;
              delete fetchedData._id;
            }
            reset(fetchedData);
          })
          .catch(error => {
            console.error("Failed to fetch package data for editing/copying", error);
            onClose();
          })
          .finally(() => {
            setLoadingPackageData(false);
          });
      }
    } else {
      reset();
    }
  }, [open, packageId, mode, reset, onClose]);

  // 根据 package_type 筛选可用的定价模型列表
  useEffect(() => {
    if (!packageType || loadingModels) return;

    const filtered = allPricingModels.filter(m => 
        m.package_type === packageType || m.package_type === 'all'
    );
    setPricingModels(filtered);

    // 如果当前选中的模型在筛选后的列表中不存在，则清空
    const currentModelStillValid = filtered.some(m => m.model_code === modelCode);
    if (!currentModelStillValid) {
        setValue('model_code', '');
    }

  }, [packageType, allPricingModels, loadingModels, modelCode, setValue]);

  // 当 package_type 改变时，清空 model_code 和 pricing_config
  useEffect(() => {
    if (mode === 'create') {
      setValue('model_code', '');
      setValue('pricing_config', {});
    }
  }, [packageType, mode, setValue]);

  // 渲染基本信息区
  const renderBasicInfoSection = (control: Control<PackageFormData>) => {
    return (
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
                    clearErrors('package_name');
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">套餐类型（分时维度）</FormLabel>
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

          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Controller
                name="is_green_power"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="绿色电力套餐"
                  />
                )}
              />
              <Tooltip title={GREEN_POWER_HINT} arrow>
                <IconButton size="small">
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>

          {isGreenPower && (
            <Grid size={{ xs: 12 }}>
              <Alert
                severity="warning"
                sx={{
                  '& .MuiAlert-message': {
                    color: 'error.main',
                    fontWeight: 'bold'
                  }
                }}
              >
                {GREEN_POWER_WARNING}
              </Alert>
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  };

  // 渲染定价模型选择区
  const renderPricingModelSection = (control: Control<PackageFormData>) => {
    return (
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Typography variant="h6" gutterBottom>定价模型</Typography>
        <Grid container spacing={{ xs: 1, sm: 2 }}>
          <Grid size={{ xs: 12 }}>
            {loadingModels ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <FormControl fullWidth>
                <InputLabel>选择定价模型</InputLabel>
                <Controller
                  name="model_code"
                  control={control}
                  rules={{ required: '请选择定价模型' }}
                  render={({ field, fieldState: { error } }) => (
                    <>
                      <Select
                        {...field}
                        label="选择定价模型"
                        error={!!error}
                      >
                        {pricingModels.map((model) => (
                          <MenuItem key={model.model_code} value={model.model_code}>
                            {model.display_name}
                          </MenuItem>
                        ))}
                      </Select>
                      {error && (
                        <FormHelperText error>{error.message}</FormHelperText>
                      )}
                    </>
                  )}
                />
              </FormControl>
            )}
          </Grid>

          {/* 显示选中模型的计算公式 */}
          {modelCode && pricingModels.length > 0 && (
            <Grid size={{ xs: 12 }}>
              {(() => {
                const selectedModel = pricingModels.find(m => m.model_code === modelCode);
                if (!selectedModel || !selectedModel.formula) return null;

                return (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>计算公式：</strong>
                      <span dangerouslySetInnerHTML={{ __html: selectedModel.formula }} />
                    </Typography>
                  </Alert>
                );
              })()}
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  };

  // 渲染定价配置区（动态表单）
  const renderPricingConfigSection = (control: Control<PackageFormData>) => {
    if (!modelCode) {
      return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
          <Alert severity="info">请先选择定价模型</Alert>
        </Paper>
      );
    }

    const selectedModel = pricingModels.find(m => m.model_code === modelCode);

    return (
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Typography variant="h6" gutterBottom>模型配置</Typography>
        <PricingConfigForm modelCode={modelCode} control={control} />

        {/* 显示模型说明 */}
        {selectedModel?.description && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" component="div">
              <strong>模型说明：</strong>
              <div dangerouslySetInnerHTML={{ __html: selectedModel.description }} />
            </Typography>
          </Alert>
        )}
      </Paper>
    );
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 保存处理函数
  const handleSaveClick = async (asDraft: boolean) => {
    handleSubmit(async (data: PackageFormData) => {
      setSaving(true);
      clearErrors();

      try {
        await onSave(data, asDraft);
      } catch (error: any) {
        if (error.response?.status === 409) {
          setError('package_name', {
            type: 'manual',
            message: '套餐名称已存在，请使用其他名称'
          });
        }
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
            {renderPricingModelSection(control)}
            {renderPricingConfigSection(control)}
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