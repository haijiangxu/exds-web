import React from 'react';
import { Control, Controller } from 'react-hook-form';
import { Typography, Paper, TextField, Grid, MenuItem, FormHelperText, Alert } from '@mui/material';
import { PackageFormData } from '../../../hooks/usePackageForm';

interface ReferenceLinkedFeeFormProps {
  control: Control<PackageFormData>;
  isTimeBased: boolean;
}

/**
 * 参考价+联动价格+浮动费用 表单组件
 */
export const ReferenceLinkedFeeForm: React.FC<ReferenceLinkedFeeFormProps> = ({ control, isTimeBased }) => {
  // 参考价选项（根据分时/不分时区分）
  const referenceTypeOptions = isTimeBased ? [
    { value: 'market_monthly_avg', label: '电力市场月度交易均价(当月平均上网电价)（分时）' },
    { value: 'grid_agency_price', label: '电网代理购电价格（分时）' },
    { value: 'annual_longterm_time', label: '售电侧年度中长期分时交易价格' },
    { value: 'monthly_settlement_avg', label: '售电侧月度结算加权价（不分时）' },
    { value: 'longterm_time', label: '售电侧中长期分时交易价格' }
  ] : [
    { value: 'market_monthly_avg', label: '电力市场月度交易均价(当月平均上网电价)' },
    { value: 'grid_agency_price', label: '电网代理购电价格' },
    { value: 'ceiling_price', label: '上限价' }
  ];

  return (
    <Grid container spacing={2}>
      {/* 参考价部分 */}
      <Grid size={{ xs: 12 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>参考价</Typography>
          <Controller
            name="pricing_config.reference_type"
            control={control}
            defaultValue=""
            rules={{ required: '参考价类型必填' }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                select
                label="参考价类型"
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              >
                {referenceTypeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <FormHelperText sx={{ mt: 1 }}>
            电力市场月度交易均价、电网代理购电价格为电网企业在网上国网发布的价格
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
                  validate: (value) => {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) {
                      return '请输入有效的数字';
                    }
                    if (isTimeBased) {
                      if (numValue < 10 || numValue > 20) {
                        return '分时套餐联动电量比例应在10%-20%之间';
                      }
                    } else {
                      if (numValue < 0 || numValue > 20) {
                        return '不分时套餐联动电量比例应在0%-20%之间';
                      }
                    }
                    return true;
                  }
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
    </Grid>
  );
};
