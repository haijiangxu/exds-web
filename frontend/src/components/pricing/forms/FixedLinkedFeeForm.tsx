import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { Typography, Paper, TextField, Grid, MenuItem, FormHelperText, Alert } from '@mui/material';
import { PackageFormData } from '../../../hooks/usePackageForm';

interface FixedLinkedFeeFormProps {
  control: Control<PackageFormData>;
  isTimeBased: boolean;
}

/**
 * 固定价格+联动价格+浮动费用 表单组件
 */
export const FixedLinkedFeeForm: React.FC<FixedLinkedFeeFormProps> = ({ control, isTimeBased }) => {
  return (
    <Grid container spacing={2}>
      {/* 固定价格部分 */}
      <Grid size={{ xs: 12 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>固定价格</Typography>
          {isTimeBased ? (
            // 分时：需要输入5个时段价格
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="pricing_config.fixed_price_peak"
                  control={control}
                  defaultValue=""
                  rules={{
                    required: '尖峰价格必填',
                    min: { value: 0.33144, message: '不得低于0.33144元/kWh' },
                    max: { value: 0.49716, message: '不得高于0.49716元/kWh' }
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="尖峰价格（元/kWh）"
                      type="number"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      inputProps={{ step: 0.00001 }}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="pricing_config.fixed_price_high"
                  control={control}
                  defaultValue=""
                  rules={{
                    required: '峰价格必填',
                    min: { value: 0.33144, message: '不得低于0.33144元/kWh' },
                    max: { value: 0.49716, message: '不得高于0.49716元/kWh' }
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="峰价格（元/kWh）"
                      type="number"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      inputProps={{ step: 0.00001 }}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="pricing_config.fixed_price_flat"
                  control={control}
                  defaultValue=""
                  rules={{
                    required: '平价格必填',
                    min: { value: 0.33144, message: '不得低于0.33144元/kWh' },
                    max: { value: 0.49716, message: '不得高于0.49716元/kWh' }
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="平价格（元/kWh）"
                      type="number"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      inputProps={{ step: 0.00001 }}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="pricing_config.fixed_price_valley"
                  control={control}
                  defaultValue=""
                  rules={{
                    required: '谷价格必填',
                    min: { value: 0.33144, message: '不得低于0.33144元/kWh' },
                    max: { value: 0.49716, message: '不得高于0.49716元/kWh' }
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="谷价格（元/kWh）"
                      type="number"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      inputProps={{ step: 0.00001 }}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="pricing_config.fixed_price_deep_valley"
                  control={control}
                  defaultValue=""
                  rules={{
                    required: '深谷价格必填',
                    min: { value: 0.33144, message: '不得低于0.33144元/kWh' },
                    max: { value: 0.49716, message: '不得高于0.49716元/kWh' }
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="深谷价格（元/kWh）"
                      type="number"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      inputProps={{ step: 0.00001 }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          ) : (
            // 不分时：输入单一价格
            <Controller
              name="pricing_config.fixed_price_value"
              control={control}
              defaultValue=""
              rules={{
                required: '固定价格必填',
                min: { value: 0.33144, message: '不得低于0.33144元/kWh' },
                max: { value: 0.49716, message: '不得高于0.49716元/kWh' }
              }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="固定价格（元/kWh）"
                  type="number"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  inputProps={{ step: 0.00001 }}
                />
              )}
            />
          )}
          <FormHelperText sx={{ mt: 1 }}>
            平段价格上限不高于0.49716元/kWh，下限不低于0.33144元/kWh
          </FormHelperText>
        </Paper>
      </Grid>

      {/* 联动价格部分 */}
      <Grid size={{ xs: 12 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>联动价格</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="pricing_config.linked_ratio"
                control={control}
                defaultValue=""
                rules={{
                  required: '联动电量比例必填',
                  min: { value: isTimeBased ? 10 : 0, message: isTimeBased ? '不低于10%' : '不得为负' },
                  max: { value: 20, message: '不高于20%' }
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="联动电量比例（%）"
                    type="number"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message || (isTimeBased ? '10%-20%' : '不高于20%')}
                    inputProps={{ step: 0.1 }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="pricing_config.linked_target"
                control={control}
                defaultValue=""
                rules={{ required: '联动标的必填' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    label="联动标的"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  >
                    <MenuItem value="day_ahead_avg">
                      日前市场均价{isTimeBased ? '（分时）' : ''}
                    </MenuItem>
                    <MenuItem value="real_time_avg">
                      实时市场均价{isTimeBased ? '（分时）' : ''}
                    </MenuItem>
                  </TextField>
                )}
              />
            </Grid>
          </Grid>
          <FormHelperText sx={{ mt: 1 }}>
            日前市场均价、实时市场均价指日前、实时市场统一节点价的月度加权均价
          </FormHelperText>
        </Paper>
      </Grid>

      {/* 浮动费用部分 */}
      <Grid size={{ xs: 12 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>浮动费用</Typography>
          <Controller
            name="pricing_config.floating_fee"
            control={control}
            defaultValue=""
            rules={{ required: '月度总浮动费用必填', min: { value: 0, message: '不得为负' } }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="月度总浮动费用（元）"
                type="number"
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                inputProps={{ step: 100 }}
              />
            )}
          />
          <FormHelperText sx={{ mt: 1 }}>
            结算时自动除以月度用电量，附加到每kWh电价中
          </FormHelperText>
        </Paper>
      </Grid>

      {/* 提示信息 */}
      {isTimeBased && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>分时套餐注意事项：</strong><br />
              1. 各时段结算价格浮动比例如低于463号文通知规定，按照文件规定浮动比例结算<br />
              2. 月度结算均价封顶：对比参考价上浮不超过5%（非尖峰月份）或10%（尖峰月份）
            </Typography>
          </Alert>
        </Grid>
      )}
    </Grid>
  );
};
