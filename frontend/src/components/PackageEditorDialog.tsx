import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Tabs, Tab } from '@mui/material';
import { usePackageForm, PackageFormData } from '../hooks/usePackageForm';
import { BasicInfoCard } from './BasicInfoCard';
import { PricingModeCard } from './PricingModeCard';
import { AdditionalTermsCard } from './AdditionalTermsCard';

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

  useEffect(() => {
    if (open) {
        // Here you would typically fetch package data if in edit/copy mode
        // and reset the form with that data.
        // For now, we just reset to default values.
        reset();
    }
  }, [open, packageId, mode, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? '新建零售套餐' : '编辑零售套餐'}
      </DialogTitle>

      <DialogContent>
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

      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="outlined"
          onClick={handleSubmit(data => onSave(data, true))}
        >
          保存为草稿
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(data => onSave(data, false))}
        >
          保存并生效
        </Button>
      </DialogActions>
    </Dialog>
  );
};