
import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';

interface PageHeaderProps {
    title: string;
    breadcrumbs: { label: string; href?: string }[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumbs }) => {
    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                {title}
            </Typography>
            <Breadcrumbs aria-label="breadcrumb">
                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    if (isLast) {
                        return <Typography key={index} color="text.primary">{crumb.label}</Typography>;
                    }
                    return <Link key={index} underline="hover" color="inherit" href={crumb.href || '#'}>{crumb.label}</Link>;
                })}
            </Breadcrumbs>
        </Box>
    );
};
