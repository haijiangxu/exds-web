import React from 'react';
import { Box, Typography } from '@mui/material';

const PlaceholderPage: React.FC = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Typography variant="h4" color="text.secondary">
            页面建设中...
        </Typography>
    </Box>
);

export default PlaceholderPage;
