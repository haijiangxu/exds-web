import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Paper, Typography, Grid, Autocomplete,
  CircularProgress, Alert, useMediaQuery, useTheme, Box
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { parse, format } from 'date-fns';
import {
  createContract,
  updateContract,
  Contract,
  ContractFormData
} from '../api/retail-contracts';
import apiClient from '../api/client';

interface ContractEditorDialogProps {
  open: boolean;
  onClose: () => void;
  contract: Contract | null;
  mode: 'create' | 'edit' | 'view';
  onSuccess: () => void;
}

// 套餐选项类型
interface PackageOption {
  _id: string;
  package_name: string;
  package_type: 'time_based' | 'non_time_based';
  is_green_power: boolean;
  model_code: string;
  status: string;
}

// 客户选项类型
interface CustomerOption {
  id: string;
  user_name: string;
  short_name: string;
  status: string;
}

export const ContractEditorDialog: React.FC<ContractEditorDialogProps> = ({
  open,
  onClose,
  contract,
  mode,
  onSuccess
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 表单管理
  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ContractFormData>({
    defaultValues: {
      package_name: '',
      package_id: '',
      customer_name: '',
      customer_id: '',
      purchasing_electricity_quantity: 0,
      purchase_start_month: null,
      purchase_end_month: null
    }
  });

  // 关联数据加载状态
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadOnly = mode === 'view';

  // 加载套餐和客户选项
  useEffect(() => {
    if (open) {
      // 加载已生效的套餐列表
      setLoadingPackages(true);
      apiClient.get('/api/v1/retail-packages', { params: { status: 'active' } })
        .then(res => {
          setPackageOptions(res.data.items || []);
        })
        .catch(err => {
          console.error('加载套餐列表失败', err);
          setError('加载套餐列表失败');
        })
        .finally(() => setLoadingPackages(false));

      // 加载正常状态的客户列表
      setLoadingCustomers(true);
      apiClient.get('/api/v1/customers', { params: { status: 'active' } })
        .then(res => {
          setCustomerOptions(res.data.items || []);
        })
        .catch(err => {
          console.error('加载客户列表失败', err);
          setError('加载客户列表失败');
        })
        .finally(() => setLoadingCustomers(false));

      // 如果是编辑或查看模式，填充表单
      if ((mode === 'edit' || mode === 'view') && contract) {
        reset({
          package_name: contract.package_name,
          package_id: contract.package_id,
          customer_name: contract.customer_name,
          customer_id: contract.customer_id,
          purchasing_electricity_quantity: contract.purchasing_electricity_quantity,
          purchase_start_month: parse(contract.purchase_start_month, 'yyyy-MM', new Date()),
          purchase_end_month: parse(contract.purchase_end_month, 'yyyy-MM', new Date())
        });

        // 加载套餐详情
        if (contract.package_id) {
          handlePackageSelect(contract.package_id);
        }
      } else {
        reset({
          package_name: '',
          package_id: '',
          customer_name: '',
          customer_id: '',
          purchasing_electricity_quantity: 0,
          purchase_start_month: null,
          purchase_end_month: null
        });
        setSelectedPackage(null);
      }
      setError(null);
    }
  }, [open, mode, contract, reset]);

  // 套餐选择后加载详情
  const handlePackageSelect = async (packageId: string) => {
    try {
      const response = await apiClient.get(`/api/v1/retail-packages/${packageId}`);
      setSelectedPackage(response.data);
    } catch (error) {
      console.error('加载套餐详情失败', error);
      setError('加载套餐详情失败');
    }
  };

  // 表单提交
  const onSubmit = async (data: ContractFormData) => {
    if (isReadOnly) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const submitData = {
        package_name: data.package_name,
        package_id: data.package_id,
        customer_name: data.customer_name,
        customer_id: data.customer_id,
        purchasing_electricity_quantity: data.purchasing_electricity_quantity,
        purchase_start_month: data.purchase_start_month ? format(data.purchase_start_month, 'yyyy-MM') : '',
        purchase_end_month: data.purchase_end_month ? format(data.purchase_end_month, 'yyyy-MM') : ''
      };

      if (mode === 'create') {
        await createContract(submitData);
      } else if (mode === 'edit' && contract) {
        await updateContract(contract._id, submitData);
      }

      onSuccess();
    } catch (error: any) {
      console.error('保存失败', error);
      const errorMsg = error.response?.data?.detail || error.message || '保存失败，请重试';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // 辅助渲染函数 - 基本信息
  const renderBasicInfoSection = () => (
    <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mt: 2 }}>
      <Typography variant="h6" gutterBottom>合同基本信息</Typography>

      <Grid container spacing={{ xs: 1, sm: 2 }}>
        {/* 套餐名称 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="package_name"
            control={control}
            rules={{ required: '请选择套餐' }}
            render={({ field }) => (
              <Autocomplete
                {...field}
                options={packageOptions}
                getOptionLabel={(option: PackageOption | string) =>
                  typeof option === 'string' ? option : option.package_name || ''
                }
                value={packageOptions.find(p => p.package_name === field.value) || null}
                onChange={(event, value) => {
                  field.onChange(value?.package_name || '');
                  setValue('package_id', value?._id || '');
                  if (value) handlePackageSelect(value._id);
                }}
                loading={loadingPackages}
                disabled={isReadOnly}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="套餐名称"
                    required
                    error={!!errors.package_name}
                    helperText={errors.package_name?.message}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingPackages ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}
          />
        </Grid>

        {/* 客户名称 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="customer_name"
            control={control}
            rules={{ required: '请选择客户' }}
            render={({ field }) => (
              <Autocomplete
                {...field}
                options={customerOptions}
                getOptionLabel={(option: CustomerOption | string) =>
                  typeof option === 'string' ? option : option.user_name || ''
                }
                value={customerOptions.find(c => c.user_name === field.value) || null}
                onChange={(event, value) => {
                  field.onChange(value?.user_name || '');
                  setValue('customer_id', value?.id || '');
                }}
                loading={loadingCustomers}
                disabled={isReadOnly}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="客户名称"
                    required
                    error={!!errors.customer_name}
                    helperText={errors.customer_name?.message}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}
          />
        </Grid>

        {/* 购买电量 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="purchasing_electricity_quantity"
            control={control}
            rules={{
              required: '请输入购买电量',
              min: { value: 0.01, message: '购买电量必须大于0' }
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="购买电量 (kWh)"
                type="number"
                required
                disabled={isReadOnly}
                inputProps={{ min: 0, step: 0.01 }}
                error={!!errors.purchasing_electricity_quantity}
                helperText={errors.purchasing_electricity_quantity?.message}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            )}
          />
        </Grid>

        {/* 购电开始月份 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="purchase_start_month"
            control={control}
            rules={{ required: '请选择购电开始月份' }}
            render={({ field }) => (
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
                <DatePicker
                  {...field}
                  label="购电开始月份"
                  views={['year', 'month']}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!errors.purchase_start_month,
                      helperText: errors.purchase_start_month?.message
                    }
                  }}
                />
              </LocalizationProvider>
            )}
          />
        </Grid>

        {/* 购电结束月份 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Controller
            name="purchase_end_month"
            control={control}
            rules={{
              required: '请选择购电结束月份',
              validate: (value) => {
                const startMonth = watch('purchase_start_month');
                if (startMonth && value && value < startMonth) {
                  return '购电结束月份不能早于开始月份';
                }
                return true;
              }
            }}
            render={({ field }) => (
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
                <DatePicker
                  {...field}
                  label="购电结束月份"
                  views={['year', 'month']}
                  disabled={isReadOnly}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!errors.purchase_end_month,
                      helperText: errors.purchase_end_month?.message
                    }
                  }}
                />
              </LocalizationProvider>
            )}
          />
        </Grid>
      </Grid>
    </Paper>
  );

  // 辅助渲染函数 - 套餐内容（只读）
  const renderPackageContentSection = () => (
    <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mt: 2 }}>
      <Typography variant="h6" gutterBottom>关联套餐内容</Typography>

      {selectedPackage ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">套餐类型</Typography>
            <Typography variant="body1">
              {selectedPackage.package_type === 'time_based' ? '分时段' : '不分时段'}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">是否绿电</Typography>
            <Typography variant="body1">
              {selectedPackage.is_green_power ? '是' : '否'}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">定价模型</Typography>
            <Typography variant="body1">
              {selectedPackage.model_code || '-'}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="text.secondary">状态</Typography>
            <Typography variant="body1">
              {selectedPackage.status === 'active' ? '生效' : selectedPackage.status}
            </Typography>
          </Grid>
        </Grid>
      ) : (
        <Typography color="text.secondary">请先选择套餐</Typography>
      )}
    </Paper>
  );

  // 阻止背景点击关闭对话框
  const handleClose = (event: {}, reason: "backdropClick" | "escapeKeyDown") => {
    if (saving) return;
    if (reason && reason === "backdropClick") {
      return;
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      disableEnforceFocus
    >
      <DialogTitle>
        {mode === 'create' ? '新增合同' : mode === 'edit' ? '编辑合同' : '查看合同'}
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <form id="contract-form" onSubmit={handleSubmit(onSubmit)}>
          {renderBasicInfoSection()}
          {renderPackageContentSection()}
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {isReadOnly ? '关闭' : '取消'}
        </Button>
        {!isReadOnly && (
          <Button
            type="submit"
            form="contract-form"
            variant="contained"
            color="primary"
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ContractEditorDialog;
