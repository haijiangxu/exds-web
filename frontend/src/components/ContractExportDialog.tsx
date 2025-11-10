import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { exportContracts, ExportParams } from '../api/retail-contracts';

interface ContractExportDialogProps {
  open: boolean;
  onClose: () => void;
  currentFilters?: any; // 当前页面的筛选条件
}

export const ContractExportDialog: React.FC<ContractExportDialogProps> = ({
  open,
  onClose,
  currentFilters = {}
}) => {
  const [exportParams, setExportParams] = useState<ExportParams>({
    package_name: '',
    customer_name: '',
    status: 'all',
    start_month: '',
    end_month: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化时使用当前筛选条件
  React.useEffect(() => {
    if (open && currentFilters) {
      setExportParams({
        package_name: currentFilters.package_name || '',
        customer_name: currentFilters.customer_name || '',
        status: currentFilters.status || 'all',
        start_month: currentFilters.purchase_start_month || '',
        end_month: currentFilters.purchase_end_month || ''
      });
    }
  }, [open, currentFilters]);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      // 过滤掉空值的参数
      const params: ExportParams = {};
      if (exportParams.package_name) params.package_name = exportParams.package_name;
      if (exportParams.customer_name) params.customer_name = exportParams.customer_name;
      if (exportParams.status && exportParams.status !== 'all') params.status = exportParams.status;
      if (exportParams.start_month) params.start_month = exportParams.start_month;
      if (exportParams.end_month) params.end_month = exportParams.end_month;

      const response = await exportContracts(params);

      // 创建下载链接
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 生成文件名
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '');
      link.download = `零售合同数据_${timestamp}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      console.error('导出失败:', err);
      const errorMessage = err.response?.data?.detail || err.message || '导出失败，请重试';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setExportParams({
      package_name: '',
      customer_name: '',
      status: 'all',
      start_month: '',
      end_month: ''
    });
    onClose();
  };

  const handleParamChange = (field: keyof ExportParams, value: string) => {
    setExportParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">导出合同数据</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* 说明文字 */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              选择筛选条件导出合同数据。如果不设置筛选条件，将导出所有合同数据。
            </Typography>
          </Alert>

          {/* 错误提示 */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* 筛选条件表单 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="套餐名称"
              value={exportParams.package_name}
              onChange={(e) => handleParamChange('package_name', e.target.value)}
              placeholder="输入套餐名称进行筛选（可选）"
              size="small"
            />

            <TextField
              fullWidth
              label="客户名称"
              value={exportParams.customer_name}
              onChange={(e) => handleParamChange('customer_name', e.target.value)}
              placeholder="输入客户名称进行筛选（可选）"
              size="small"
            />

            <FormControl fullWidth size="small">
              <InputLabel>合同状态</InputLabel>
              <Select
                value={exportParams.status}
                label="合同状态"
                onChange={(e) => handleParamChange('status', e.target.value)}
              >
                <MenuItem value="all">全部状态</MenuItem>
                <MenuItem value="pending">待生效</MenuItem>
                <MenuItem value="active">生效</MenuItem>
                <MenuItem value="expired">已过期</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <DatePicker
                views={['year', 'month']}
                label="开始月份"
                value={exportParams.start_month ? new Date(exportParams.start_month + '-01') : null}
                onChange={(date) => {
                  const value = date ? format(date, 'yyyy-MM') : '';
                  handleParamChange('start_month', value);
                }}
                sx={{ flex: 1 }}
                slotProps={{
                  textField: {
                    variant: "outlined",
                    size: "small",
                    placeholder: "选择开始月份"
                  }
                }}
                format="yyyy年MM月"
              />
              <DatePicker
                views={['year', 'month']}
                label="结束月份"
                value={exportParams.end_month ? new Date(exportParams.end_month + '-01') : null}
                onChange={(date) => {
                  const value = date ? format(date, 'yyyy-MM') : '';
                  handleParamChange('end_month', value);
                }}
                sx={{ flex: 1 }}
                slotProps={{
                  textField: {
                    variant: "outlined",
                    size: "small",
                    placeholder: "选择结束月份"
                  }
                }}
                format="yyyy年MM月"
              />
            </Box>

            {/* 快速操作提示 */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>提示：</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 留空所有条件将导出全部数据<br />
                • 支持模糊搜索套餐和客户名称<br />
                • 日期格式：YYYY-MM（如：2024-01）
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
        >
          {loading ? '导出中...' : '导出'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContractExportDialog;