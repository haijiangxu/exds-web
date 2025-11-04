import React, { useState, useEffect } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, CircularProgress, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArchiveIcon from '@mui/icons-material/Archive';
import apiClient from '../api/client';
import { format } from 'date-fns';
import { PackageEditorDialog } from './PackageEditorDialog';

interface Package {
  _id: string;
  package_name: string;
  package_type: 'time_based' | 'non_time_based';
  pricing_mode: 'fixed_linked' | 'price_spread';
  has_green_power: boolean;
  has_price_cap: boolean;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
}

export const PackageListView: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    keyword: '',
    package_type: '',
    status: ''
  });
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [editPackageId, setEditPackageId] = useState<string | undefined>(undefined);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'copy'>('create');

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/retail-packages', {
        params: filters
      });
      setPackages(response.data.items);
    } catch (error) {
        console.error("Failed to fetch packages", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [filters]);

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
        } else {
            await apiClient.post('/api/v1/retail-packages', payload);
        }
        setEditorOpen(false);
        fetchPackages(); // Refresh the list
    } catch (error) {
        console.error("Failed to save package", error);
        // Here you would show an error to the user
    }
  };

  return (
    <Box>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={handleCreate}>+ 新建零售套餐</Button>
        </Box>
        <TableContainer component={Paper}>
        <Table>
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
            {loading ? (
                <TableRow>
                <TableCell colSpan={7} align="center">
                    <CircularProgress />
                </TableCell>
                </TableRow>
            ) : packages.map(pkg => (
                <TableRow key={pkg._id}>
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
                    <IconButton size="small" onClick={() => handleEdit(pkg._id)}>
                    <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleCopy(pkg._id)}>
                    <ContentCopyIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleArchive(pkg._id)}>
                    <ArchiveIcon />
                    </IconButton>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </TableContainer>
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