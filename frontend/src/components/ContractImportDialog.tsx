import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Download as DownloadIcon,
  Close as CloseIcon,
  Description as FileIcon
} from '@mui/icons-material';
import { importContracts, ImportResult, ImportError } from '../api/retail-contracts';

interface ContractImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: ImportResult) => void;
}

export const ContractImportDialog: React.FC<ContractImportDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/octet-stream' // 有时Excel文件会被识别为这种类型
      ];

      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        setError('请选择有效的Excel文件（.xlsx或.xls格式）');
        return;
      }

      // 验证文件大小（10MB限制）
      if (file.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过10MB');
        return;
      }

      setSelectedFile(file);
      setError(null);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('请先选择要导入的Excel文件');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await importContracts(selectedFile);
      setImportResult(result.data);
      onSuccess(result.data);
    } catch (err: any) {
      console.error('导入失败:', err);
      const errorMessage = err.response?.data?.detail || err.message || '导入失败，请重试';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    setError(null);
    onClose();
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    if (file) {
      // 模拟文件选择
      const fakeEvent = {
        target: { files: [file] }
      } as any;
      handleFileSelect(fakeEvent);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderImportResult = () => {
    if (!importResult) return null;

    const { total, success, failed, errors } = importResult;

    return (
      <Box sx={{ mt: 2 }}>
        {/* 结果统计 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            label={`总计: ${total}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`成功: ${success}`}
            color="success"
            variant="outlined"
          />
          <Chip
            label={`失败: ${failed}`}
            color={failed > 0 ? "error" : "default"}
            variant="outlined"
          />
        </Box>

        {/* 错误详情 */}
        {errors.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom color="error">
              错误详情 ({errors.length}条):
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>行号</TableCell>
                    <TableCell>字段</TableCell>
                    <TableCell>错误原因</TableCell>
                    <TableCell>修改建议</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {errors.slice(0, 10).map((error: ImportError, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{error.row}</TableCell>
                      <TableCell>{error.field}</TableCell>
                      <TableCell sx={{ color: 'error.main' }}>
                        {error.message}
                      </TableCell>
                      <TableCell>{error.suggestion || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {errors.length > 10 && (
                <Box sx={{ p: 1, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">
                    显示前10条错误，共{errors.length}条错误
                  </Typography>
                </Box>
              )}
            </TableContainer>
          </Box>
        )}

        {/* 成功提示 */}
        {success > 0 && failed === 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              成功导入 {success} 条合同数据！
            </Typography>
          </Alert>
        )}

        {/* 部分成功提示 */}
        {success > 0 && failed > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              部分导入成功：成功 {success} 条，失败 {failed} 条。请根据错误详情修正数据后重新导入失败的记录。
            </Typography>
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">导入合同数据</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ minHeight: 300 }}>
          {/* 使用说明 */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" component="div">
              <strong>导入说明：</strong><br />
              • 请上传从交易中心平台下载的标准Excel文件<br />
              • 必需字段：套餐、购买用户、购买电量、购买时间-开始、购买时间-结束<br />
              • 系统将自动忽略：序号、代理销售费模型、签章状态字段<br />
              • 文件大小限制：10MB
            </Typography>
          </Alert>

          {/* 错误提示 */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* 文件选择区域 */}
          {!selectedFile && !importResult && (
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'grey.300',
                borderRadius: 1,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover'
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <DownloadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                点击或拖拽文件到此处上传
              </Typography>
              <Typography variant="body2" color="text.secondary">
                支持 .xlsx 和 .xls 格式
              </Typography>
            </Box>
          )}

          {/* 已选择文件 */}
          {selectedFile && !importResult && (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <FileIcon color="primary" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </Typography>
                </Box>
                <IconButton onClick={removeFile} size="small" color="error">
                  <CloseIcon />
                </IconButton>
              </Paper>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                确认文件无误后，点击"开始导入"按钮进行数据导入。
              </Typography>
            </Box>
          )}

          {/* 导入结果 */}
          {importResult && renderImportResult()}

          {/* 加载状态 */}
          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                正在导入数据，请稍候...
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        {!importResult && (
          <>
            <Button onClick={handleClose} disabled={loading}>
              取消
            </Button>
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={!selectedFile || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
            >
              {loading ? '导入中...' : '开始导入'}
            </Button>
          </>
        )}

        {importResult && (
          <Button onClick={handleClose} variant="contained">
            完成
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ContractImportDialog;