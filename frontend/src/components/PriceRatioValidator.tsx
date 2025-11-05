import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertTitle, Box, Typography, CircularProgress } from '@mui/material';
import apiClient from '../api/client';

interface CustomPrices {
  peak?: number;
  high?: number;
  flat?: number;
  valley?: number;
  deep_valley?: number;
}

interface PriceRatioValidatorProps {
  customPrices: CustomPrices;
}

export const PriceRatioValidator: React.FC<PriceRatioValidatorProps> = ({ customPrices }) => {
  // Only run query if all prices are filled and flat price is not zero
  const isQueryEnabled = 
    customPrices &&
    customPrices.peak != null &&
    customPrices.high != null &&
    customPrices.flat != null && customPrices.flat > 0 &&
    customPrices.valley != null &&
    customPrices.deep_valley != null;

  const { data: validation, isLoading } = useQuery({
    queryKey: ['validate-ratio', customPrices],
    queryFn: () => apiClient.post('/api/v1/retail-packages/validate-price-ratio', customPrices),
    enabled: isQueryEnabled,
    staleTime: 1000, // Avoid rapid refetching
    retry: false,
  });

  if (!isQueryEnabled) {
    return null; // Don't show anything if prices are not fully entered
  }

  if (isLoading) {
    return <CircularProgress size={20} sx={{ mt: 2 }} />;
  }

  if (!validation) {
    return null; // Or show a generic error
  }

  if (!validation.data.compliant) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        <AlertTitle>价格比例警告</AlertTitle>
        当前自定义价格比例不满足463号文要求，结算时将可能按标准比例调整。
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2">
            实际比例：峰/平={validation.data.actual_ratios.high_to_flat.toFixed(2)}，
            谷/平={validation.data.actual_ratios.valley_to_flat.toFixed(2)}，
            深谷/平={validation.data.actual_ratios.deep_valley_to_flat.toFixed(2)}
          </Typography>
        </Box>
      </Alert>
    );
  }

  return (
    <Alert severity="success" sx={{ mt: 2 }}>
      价格比例符合463号文要求。
    </Alert>
  );
};