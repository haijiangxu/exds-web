import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Tabs, Tab, CircularProgress } from '@mui/material'; // Added CircularProgress
import { usePackageForm, PackageFormData } from '../hooks/usePackageForm';
import { BasicInfoCard } from './BasicInfoCard';
import { PricingModeCard } from './PricingModeCard';
import { AdditionalTermsCard } from './AdditionalTermsCard';
import apiClient from '../api/client'; // Added apiClient

interface PackageEditorDialogProps {
  open: boolean;
  packageId?: string;
  mode: 'create' | 'edit' | 'copy';
  onClose: () => void;
  onSave: (data: PackageFormData, asDraft: boolean) => Promise<void>;
}

export const PackageEditorDialog: React.FC<PackageEditorDialogProps> = ({
  open, packageId, mode, onClose, onSave
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const { control, handleSubmit, watch, reset } = usePackageForm();
  const [loadingPackageData, setLoadingPackageData] = useState(false); // New state for loading

  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        reset(); // Reset to default values for create mode
      } else if (packageId) {
        setLoadingPackageData(true);
        apiClient.get(`/api/v1/retail-packages/${packageId}`)
          .then(response => {
            let fetchedData = response.data;

            reset(fetchedData); // Pre-fill form with fetched or modified data
          })
          .catch(error => {
            console.error("Failed to fetch package data for editing/copying", error);
            // Optionally show an error message to the user
            onClose(); // Close dialog on error
          })
          .finally(() => {
            setLoadingPackageData(false);
          });
      }
    } else {
      // When dialog closes, reset form and active step
      reset();
      setActiveStep(0);
    }
  }, [open, packageId, mode, reset, onClose]); // Added onClose to dependency array

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? '新建零售套餐' : (mode === 'edit' ? '编辑零售套餐' : '复制零售套餐')}
      </DialogTitle>

      <DialogContent>
        {loadingPackageData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeStep} onChange={(e, v) => setActiveStep(v)}>
                <Tab label="基本信息" />
                <Tab label="定价模式" />
                <Tab label="附加条款" />
              </Tabs>
            </Box>

            <form>
                {activeStep === 0 && <BasicInfoCard control={control} />}
                {activeStep === 1 && <PricingModeCard control={control} />}
                {activeStep === 2 && <AdditionalTermsCard control={control} />}
            </form>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loadingPackageData}>取消</Button>
        <Button
          variant="outlined"
          onClick={handleSubmit((data: PackageFormData) => onSave(data, true))}
          disabled={loadingPackageData}
        >
          保存为草稿
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit((data: PackageFormData) => onSave(data, false))}
          disabled={loadingPackageData}
        >
          保存并生效
        </Button>
      </DialogActions>
    </Dialog>
  );
};