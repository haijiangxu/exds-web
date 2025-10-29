
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Autocomplete,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Chip,
    Tabs,
    Tab,
    Paper,
    Grid
} from '@mui/material';
import apiClient from '../api/client';
import { LoadCurveTab } from './LoadCurveTab';
import { MonthlyEnergyTab } from './MonthlyEnergyTab';

// 定义数据结构类型
interface User {
    user_id: string;
    user_name: string;
}

// TabPanel组件
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export const IndividualLoadTab: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [meters, setMeters] = useState<any[]>([]);
    const [selectedMeter, setSelectedMeter] = useState<string>('');
    const [loadingMeters, setLoadingMeters] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        setLoadingUsers(true);
        apiClient.get('/api/users')
            .then(response => setUsers(response.data))
            .catch(error => console.error('Error fetching users:', error))
            .finally(() => setLoadingUsers(false));
    }, []);

    useEffect(() => {
        if (selectedUser) {
            setLoadingMeters(true);
            setSelectedMeter('');
            setMeters([]);
            apiClient.get(`/api/meters?user_id=${selectedUser.user_id}`)
                .then(response => {
                    const meterData = response.data;
                    setMeters(meterData);
                    if (meterData.length > 0) {
                        setSelectedMeter(meterData[0].meter_id);
                    }
                })
                .catch(error => console.error('Error fetching meters:', error))
                .finally(() => setLoadingMeters(false));
        }
    }, [selectedUser]);

    return (
        <Box>
            {/* 用户筛选卡片 */}
            <Paper sx={{ p: 2, mb: 3 }} >
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>用户筛选</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Box sx={{ flexGrow: 1, minWidth: 250 }}>
                        <Autocomplete
                            options={users}
                            getOptionLabel={(option) => `${option.user_name} (${option.user_id})`}
                            value={selectedUser}
                            onChange={(event, newValue) => setSelectedUser(newValue)}
                            loading={loadingUsers}
                            renderInput={(params) => <TextField {...params} label="选择用户 (可搜索)" />}
                        />
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 250 }}>
                        <FormControl fullWidth disabled={!selectedUser || loadingMeters || meters.length <= 1}>
                            <InputLabel>选择电表</InputLabel>
                            <Select value={selectedMeter} label="选择电表" onChange={(e) => setSelectedMeter(e.target.value as string)}>
                                {meters.map((meter) => (
                                    <MenuItem key={meter.meter_id} value={meter.meter_id}>{meter.meter_id}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {meters.length > 1 && <Chip label={`共 ${meters.length} 块`} size="small" sx={{ ml: 1 }} />}
                    </Box>
                </Box>
            </Paper>

            {/* 主内容卡片 */}
            <Paper sx={{ p: { xs: 1, sm: 2 } }} >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)}>
                        <Tab label="负荷曲线对比" sx={{ fontSize: '1rem', fontWeight: 600 }} />
                        <Tab label="月度电量对比" sx={{ fontSize: '1rem', fontWeight: 600 }} />
                    </Tabs>
                </Box>
                <TabPanel value={activeTab} index={0}>
                    <LoadCurveTab selectedMeter={selectedMeter} />
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                    <MonthlyEnergyTab selectedMeter={selectedMeter} />
                </TabPanel>
            </Paper>
        </Box>
    );
};
