import React from 'react';
import { Box } from '@mui/material';
import { PageHeader } from '../components/PageHeader';
import { PackageListView } from '../components/PackageListView';

const RetailPackagePage: React.FC = () => {
  return (
    <Box>
      <PageHeader title="零售套餐管理" />
      <PackageListView />
    </Box>
  );
};

export default RetailPackagePage;