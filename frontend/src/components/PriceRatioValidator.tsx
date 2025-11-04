import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertTitle, Box, CircularProgress, Typography } from '@mui/material';
import apiClient from '../api/client';

interface PriceRatioValidatorProps {
  customPrices: {
    peak: number;
    high: number;
    flat: number;
    valley: number;
    deep_valley: number;
  };
}

export const PriceRatioValidator: React.FC<PriceRatioValidatorProps> = ({ customPrices }) => {
  const { data: validation, isLoading } = useQuery(
    ['validate-ratio', customPrices],
    () => apiClient.post('/api/v1/retail-packages/validate-price-ratio', customPrices),
    {
      enabled: !!customPrices && customPrices.flat > 0,
      staleTime: 1000, // 1 second
      retry: false,
    }
  );

  if (isLoading) return <CircularProgress size={20} />;

  if (!validation?.data.compliant) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        <AlertTitle>价格比例警告</AlertTitle>
        当前自定义价格比例不满足463号文要求，结算时将自动调整为标准比例 (1.6:1:0.4:0.3)。
        {validation?.data.actual_ratios && 
            <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                    实际比例：峰/平={validation.data.actual_ratios.high_to_flat?.toFixed(2)}，
                    谷/平={validation.data.actual_ratios.valley_to_flat?.toFixed(2)}，
                    深谷/平={validation.data.actual_ratios.deep_valley_to_flat?.toFixed(2)}
                </Typography>
            </Box>
        }
      </Alert>
    );
  }

  if (validation?.data.compliant) {
    return (
        <Alert severity="success" sx={{ mt: 2 }}>
        价格比例符合463号文要求
        </Alert>
    );
  }

  return null;
};