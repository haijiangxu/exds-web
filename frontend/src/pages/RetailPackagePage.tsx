import React, { useState, useEffect } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, CircularProgress, Button, TextField, InputAdornment, Select, MenuItem, InputLabel, FormControl, SelectChangeEvent, Typography, TablePagination, useMediaQuery, useTheme } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArchiveIcon from '@mui/icons-material/Archive';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../components/PageHeader';
import apiClient from '../api/client';
import { format } from 'date-fns';
import { PackageEditorDialog } from '../components/PackageEditorDialog';

interface Package {
  id: string;
  package_name: string;
  package_type: 'time_based' | 'non_time_based';
  pricing_mode: 'fixed_linked' | 'price_spread';
  has_green_power: boolean;
  has_price_cap: boolean;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

const RetailPackagePage: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    keyword: '',
    package_type: '',
    pricing_mode: '', // Added pricing_mode filter
    status: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [isEditorOpen, setEditorOpen] = useState(false);
  const [editPackageId, setEditPackageId] = useState<string | undefined>(undefined);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'copy'>('create');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/retail-packages', {
        params: {
          ...filters,
          page: page + 1, // API is 1-indexed
          page_size: rowsPerPage,
        }
      });
      setPackages(response.data.items);
      setTotalCount(response.data.total);
    } catch (error) {
        console.error("Failed to fetch packages", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [filters, page, rowsPerPage]);

  const handleFilterChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name as string]: value
    }));
    setPage(0); // Reset to first page on filter change
  };

  const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      keyword: event.target.value
    }));
    setPage(0); // Reset to first page on keyword change
  };

  const handleSearch = () => {
    setPage(0); // Ensure search starts from the first page
    fetchPackages();
  };

  const handleResetFilters = () => {
    setFilters({
      keyword: '',
      package_type: '',
      pricing_mode: '',
      status: ''
    });
    setPage(0);
  };

  const handleArchive = async (packageId: string) => {
    await apiClient.post(`/api/v1/retail-packages/${packageId}/archive`);
    fetchPackages();
  };

  const handleEdit = (packageId: string) => {
    setEditPackageId(packageId);
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const handleCopy = (packageId: string) => {
    setEditPackageId(packageId);
    setEditorMode('copy');
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditPackageId(undefined);
    setEditorMode('create');
    setEditorOpen(true);
  };

  const handleSave = async (data: any, asDraft: boolean) => {
    console.log("Saving package:", data, "as draft:", asDraft);
    const payload = {
        ...data,
        save_as_draft: asDraft
    };

    try {
        if (editorMode === 'edit') {
            await apiClient.put(`/api/v1/retail-packages/${editPackageId}`, payload);
        } else { // create or copy mode
            await apiClient.post('/api/v1/retail-packages', payload);
        }
        setEditorOpen(false);
        fetchPackages(); // Refresh the list
    } catch (error) {
        console.error("Failed to save package", error);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>


      {/* Query Card */}
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
              label="套餐名称"
              variant="outlined"
              size="small"
              value={filters.keyword}
              onChange={handleKeywordChange}
              InputProps={{
                  startAdornment: (
                      <InputAdornment position="start">
                          <SearchIcon />
                      </InputAdornment>
                  ),
              }}
              sx={{ width: { xs: '100%', sm: '200px' } }}
          />
          <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
              <InputLabel>套餐类型</InputLabel>
              <Select
                  name="package_type"
                  value={filters.package_type}
                  onChange={handleFilterChange}
                  label="套餐类型"
              >
                  <MenuItem value="">所有</MenuItem>
                  <MenuItem value="time_based">分时段</MenuItem>
                  <MenuItem value="non_time_based">不分时段</MenuItem>
              </Select>
          </FormControl>
          <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
              <InputLabel>定价模式</InputLabel>
              <Select
                  name="pricing_mode"
                  value={filters.pricing_mode}
                  onChange={handleFilterChange}
                  label="定价模式"
              >
                  <MenuItem value="">所有</MenuItem>
                  <MenuItem value="fixed_linked">固定+联动</MenuItem>
                  <MenuItem value="price_spread">价差分成</MenuItem>
              </Select>
          </FormControl>
          <FormControl variant="outlined" size="small" sx={{ width: { xs: '100%', sm: '150px' } }}>
              <InputLabel>状态</InputLabel>
              <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="状态"
              >
                  <MenuItem value="">所有</MenuItem>
                  <MenuItem value="draft">草稿</MenuItem>
                  <MenuItem value="active">生效</MenuItem>
                  <MenuItem value="archived">归档</MenuItem>
              </Select>
          </FormControl>
          <Button variant="contained" onClick={handleSearch}>查询</Button>
          <Button variant="outlined" onClick={handleResetFilters}>重置</Button>
        </Box>
      </Paper>

      {/* List Card */}
      <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 } }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="contained" color="primary" onClick={handleCreate}>+ 新增</Button>
          <Button variant="outlined">导出</Button> {/* Export button */}
        </Box>
        {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <CircularProgress />
              </Box>
            ) : packages.length === 0 ? (
              isMobile ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                  <Typography variant="body2" color="text.secondary">暂无数据</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table
                    sx={{
                        '& .MuiTableCell-root': {
                            fontSize: { xs: '0.75rem', sm: '0.875rem'},
                            px: { xs: 0.5, sm: 2},
                        }
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell>套餐名称</TableCell>
                        <TableCell>套餐类型</TableCell>
                        <TableCell>定价模式</TableCell>
                        <TableCell>附加套餐</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell>创建时间</TableCell>
                        <TableCell align="right">操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 3 }}>
                          <Typography variant="body2" color="text.secondary">暂无数据</Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )

            ) : isMobile ? (
              <Box>
                {packages.map(pkg => (
                  <Paper key={pkg.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>{pkg.package_name}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">类型:</Typography>
                      <Chip label={pkg.package_type === 'time_based' ? '分时段' : '不分时段'} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">定价模式:</Typography>
                      <Chip label={pkg.pricing_mode === 'fixed_linked' ? '固定+联动' : '价差分成'} size="small" color="primary" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">附加套餐:</Typography>
                      <Box>
                        {pkg.has_green_power && <Chip label="绿电" size="small" color="success" sx={{ mr: 0.5 }} />}
                        {pkg.has_price_cap && <Chip label="封顶" size="small" color="warning" />}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">状态:</Typography>
                      <Chip label={pkg.status} size="small" color={pkg.status === 'active' ? 'success' : 'default'} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">创建时间:</Typography>
                      <Typography variant="body2">{format(new Date(pkg.created_at), 'yyyy-MM-dd HH:mm')}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <IconButton size="small" onClick={() => handleEdit(pkg.id)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleCopy(pkg.id)}>
                        <ContentCopyIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleArchive(pkg.id)}>
                        <ArchiveIcon />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <TableContainer>
                <Table
                  sx={{
                      '& .MuiTableCell-root': {
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },  // 响应式字体
                          px: { xs: 0.5, sm: 2 },  // 响应式内边距
                      }
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>套餐名称</TableCell>
                      <TableCell>套餐类型</TableCell>
                      <TableCell>定价模式</TableCell>
                      <TableCell>附加套餐</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>创建时间</TableCell>
                      <TableCell align="right">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {packages.map(pkg => (
                        <TableRow key={pkg.id}>
                          <TableCell>{pkg.package_name}</TableCell>
                          <TableCell>
                            <Chip
                              label={pkg.package_type === 'time_based' ? '分时段' : '不分时段'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={pkg.pricing_mode === 'fixed_linked' ? '固定+联动' : '价差分成'}
                              size="small"
                              color="primary"
                            />
                          </TableCell>
                          <TableCell>
                            {pkg.has_green_power && <Chip label="绿电" size="small" color="success" />}
                            {pkg.has_price_cap && <Chip label="封顶" size="small" color="warning" />}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={pkg.status}
                              size="small"
                              color={pkg.status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{format(new Date(pkg.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleEdit(pkg.id)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleCopy(pkg.id)}>
                              <ContentCopyIcon />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleArchive(pkg.id)}>
                              <ArchiveIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 20]}
              labelRowsPerPage="每页行数:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
            />
          </Paper>

          <PackageEditorDialog
              open={isEditorOpen}
              onClose={() => setEditorOpen(false)}
              packageId={editPackageId}
              mode={editorMode}
              onSave={handleSave}
          />
    </Box>
  );
};

export default RetailPackagePage;