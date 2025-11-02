import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { addDays, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import apiClient from '../api/client';
import { useTouPeriodBackground } from '../hooks/useTouPeriodBackground';
import { useChartFullscreen } from '../hooks/useChartFullscreen';

// 类型定义
interface FinancialKPIs {
    vwap_rt: number | null;
    vwap_da: number | null;
    vwap_spread: number | null;
    twap_rt: number | null;
    twap_da: number | null;
}

interface RiskKPI {
    value: number;
    time: string;
    period: number;
}

interface RiskKPIs {
    max_positive_spread: RiskKPI | null;
    max_negative_spread: RiskKPI | null;
    max_rt_price: RiskKPI | null;
    min_rt_price: RiskKPI | null;
}

interface TimeSeriesPoint {
    period: number;
    time: string;
    price_rt: number | null;
    price_da: number | null;
    volume_rt: number;
    volume_da: number;
    spread: number | null;
    period_type: string;
}

interface PeriodSummary {
    period_name: string;
    vwap_da: number | null;
    vwap_rt: number | null;
    vwap_spread: number | null;
    avg_volume_rt: number | null;
    renewable_ratio: number | null;
}

interface DashboardData {
    date: string;
    financial_kpis: FinancialKPIs;
    risk_kpis: RiskKPIs;
    time_series: TimeSeriesPoint[];
    period_summary: PeriodSummary[];
}

// 财务指标大卡片组件
const FinancialKPIsPanel: React.FC<{ kpis: FinancialKPIs }> = ({ kpis }) => (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                核心财务指标
            </Typography>
            <Typography variant="caption" color="text.secondary">
                单位: 元/MWh
            </Typography>
        </Box>
        <Grid container spacing={1.5}>
            <Grid size={{ xs: 6, sm: 4 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        现货加权均价
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', my: 0.5 }}>
                        {kpis.vwap_rt !== null ? kpis.vwap_rt.toFixed(2) : 'N/A'}
                    </Typography>
                </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        日前加权均价
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main', my: 0.5 }}>
                        {kpis.vwap_da !== null ? kpis.vwap_da.toFixed(2) : 'N/A'}
                    </Typography>
                </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        日均加权价差
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 'bold',
                            color: kpis.vwap_spread && kpis.vwap_spread > 0 ? 'error.main' : 'success.main',
                            my: 0.5
                        }}
                    >
                        {kpis.vwap_spread !== null ? kpis.vwap_spread.toFixed(2) : 'N/A'}
                    </Typography>
                </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        现货算术均价
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', my: 0.5 }}>
                        {kpis.twap_rt !== null ? kpis.twap_rt.toFixed(2) : 'N/A'}
                    </Typography>
                </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        日前算术均价
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', my: 0.5 }}>
                        {kpis.twap_da !== null ? kpis.twap_da.toFixed(2) : 'N/A'}
                    </Typography>
                </Box>
            </Grid>
        </Grid>
    </Paper>
);

// 风险指标大卡片组件
const RiskKPIsPanel: React.FC<{ kpis: RiskKPIs }> = ({ kpis }) => (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                核心风险指标
            </Typography>
            <Typography variant="caption" color="text.secondary">
                单位: 元/MWh
            </Typography>
        </Box>
        <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        最大正价差（最大亏损点）
                    </Typography>
                    {kpis.max_positive_spread ? (
                        <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                {kpis.max_positive_spread.value.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {kpis.max_positive_spread.time} (第{kpis.max_positive_spread.period}段)
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">无数据</Typography>
                    )}
                </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        最大负价差（最大盈利点）
                    </Typography>
                    {kpis.max_negative_spread ? (
                        <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                {kpis.max_negative_spread.value.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {kpis.max_negative_spread.time} (第{kpis.max_negative_spread.period}段)
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">无数据</Typography>
                    )}
                </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        现货最高价
                    </Typography>
                    {kpis.max_rt_price ? (
                        <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                                {kpis.max_rt_price.value.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {kpis.max_rt_price.time} (第{kpis.max_rt_price.period}段)
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">无数据</Typography>
                    )}
                </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        现货最低价
                    </Typography>
                    {kpis.min_rt_price ? (
                        <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                                {kpis.min_rt_price.value.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {kpis.min_rt_price.time} (第{kpis.min_rt_price.period}段)
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">无数据</Typography>
                    )}
                </Box>
            </Grid>
        </Grid>
    </Paper>
);

// 价格曲线图组件
const PriceChart: React.FC<{ data: TimeSeriesPoint[]; onPrevious: () => void; onNext: () => void }> = ({ data, onPrevious, onNext }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    // 计算Y轴范围
    const prices = data.flatMap(d => [d.price_rt, d.price_da].filter(p => p !== null) as number[]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // 使用尖峰平谷背景Hook
    const { TouPeriodAreas } = useTouPeriodBackground(data, '24:00');

    // 使用全屏Hook（带导航按钮）
    const {
        isFullscreen,
        FullscreenEnterButton,
        FullscreenExitButton,
        FullscreenTitle,
        NavigationButtons
    } = useChartFullscreen({
        chartRef,
        title: '核心价格曲线',
        onPrevious,
        onNext
    });

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>核心价格曲线</Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                <Box
                    ref={chartRef}
                    sx={{
                        height: 400,
                        position: 'relative',
                        backgroundColor: isFullscreen ? 'background.paper' : 'transparent',
                        p: isFullscreen ? 2 : 0,
                    }}
                >
                    <FullscreenEnterButton />
                    <FullscreenExitButton />
                    <FullscreenTitle />
                    <NavigationButtons />

                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            {/* 背景色块 - 尖峰平谷 */}
                            {TouPeriodAreas}

                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 12 }}
                                interval={23}
                            />

                            <YAxis
                                domain={[Math.floor(minPrice * 0.95), Math.ceil(maxPrice * 1.05)]}
                                label={{
                                    value: '价格 (元/MWh)',
                                    angle: -90,
                                    position: 'insideLeft'
                                }}
                                tick={{ fontSize: 12 }}
                            />

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px'
                                }}
                                formatter={(value: any, name: string) => [
                                    `${Number(value).toFixed(2)} 元/MWh`,
                                    name === 'price_rt' ? '现货价格' : '日前价格'
                                ]}
                                labelFormatter={(label) => `时刻: ${label}`}
                            />

                            <Legend />

                            {/* 现货价格 - 实线 */}
                            <Line
                                type="monotone"
                                dataKey="price_rt"
                                stroke="#f44336"
                                strokeWidth={2}
                                name="现货价格"
                                dot={false}
                            />

                            {/* 日前价格 - 虚线 */}
                            <Line
                                type="monotone"
                                dataKey="price_da"
                                stroke="#2196f3"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                name="日前价格"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </Paper>
        </Box>
    );
};

// 电量曲线图组件
const VolumeChart: React.FC<{ data: TimeSeriesPoint[]; onPrevious: () => void; onNext: () => void }> = ({ data, onPrevious, onNext }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    // 计算Y轴范围
    const volumes = data.flatMap(d => [d.volume_rt, d.volume_da]);
    const minVolume = Math.min(...volumes);
    const maxVolume = Math.max(...volumes);

    // 使用尖峰平谷背景Hook
    const { TouPeriodAreas } = useTouPeriodBackground(data, '24:00');

    // 使用全屏Hook（带导航按钮）
    const {
        isFullscreen,
        FullscreenEnterButton,
        FullscreenExitButton,
        FullscreenTitle,
        NavigationButtons
    } = useChartFullscreen({
        chartRef,
        title: '核心负荷曲线',
        onPrevious,
        onNext
    });

    return (
        <Paper variant="outlined" sx={{ mt: 1 }}>
            <Box sx={{ p: { xs: 1, sm: 2 } }}>
                <Typography variant="h6" gutterBottom>
                    核心负荷曲线
                </Typography>
                <Box
                    ref={chartRef}
                    sx={{
                        height: 400,
                        position: 'relative',
                        backgroundColor: isFullscreen ? 'background.paper' : 'transparent',
                        p: isFullscreen ? 2 : 0,
                        ...(isFullscreen && {
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            zIndex: 1400,
                        })
                    }}
                >
                    <FullscreenEnterButton />
                    <FullscreenExitButton />
                    <FullscreenTitle />
                    <NavigationButtons />

                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            {/* 背景色块 - 尖峰平谷 */}
                            {TouPeriodAreas}

                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 12 }}
                                interval={23}
                            />

                            <YAxis
                                domain={[Math.floor(minVolume * 0.95), Math.ceil(maxVolume * 1.05)]}
                                label={{
                                    value: '电量 (MWh)',
                                    angle: -90,
                                    position: 'insideLeft'
                                }}
                                tick={{ fontSize: 12 }}
                            />

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px'
                                }}
                                formatter={(value: any, name: string) => [
                                    `${Number(value).toFixed(2)} MWh`,
                                    name === 'volume_rt' ? '现货电量' : '日前电量'
                                ]}
                                labelFormatter={(label) => `时刻: ${label}`}
                            />

                            <Legend />

                            {/* 现货电量 - 实线 */}
                            <Line
                                type="monotone"
                                dataKey="volume_rt"
                                stroke="#ff9800"
                                strokeWidth={2}
                                name="现货电量"
                                dot={false}
                            />

                            {/* 日前电量 - 虚线 */}
                            <Line
                                type="monotone"
                                dataKey="volume_da"
                                stroke="#4caf50"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                name="日前电量"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </Box>
        </Paper>
    );
};

// 时段汇总表格组件
const PeriodSummaryTable: React.FC<{ data: PeriodSummary[] }> = ({ data }) => (
    <TableContainer component={Paper} elevation={2}>
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>时段</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>日前VWAP<br />(元/MWh)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>现货VWAP<br />(元/MWh)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>加权价差<br />(元/MWh)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>平均电量<br />(MWh)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>新能源占比</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((row) => (
                    <TableRow key={row.period_name} hover>
                        <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                            {row.period_name}
                        </TableCell>
                        <TableCell align="right">
                            {row.vwap_da !== null ? row.vwap_da.toFixed(2) : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                            {row.vwap_rt !== null ? row.vwap_rt.toFixed(2) : 'N/A'}
                        </TableCell>
                        <TableCell
                            align="right"
                            sx={{
                                color: row.vwap_spread && row.vwap_spread > 0 ? 'error.main' : 'success.main',
                                fontWeight: 'bold'
                            }}
                        >
                            {row.vwap_spread !== null ? row.vwap_spread.toFixed(2) : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                            {row.avg_volume_rt !== null ? row.avg_volume_rt.toFixed(2) : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                            {row.renewable_ratio !== null ? `${(row.renewable_ratio * 100).toFixed(1)}%` : 'N/A'}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
);

// 主组件
export const MarketDashboardTab: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);
    // 直接使用 addDays 初始化为昨天
    const [selectedDate, setSelectedDate] = useState<Date | null>(addDays(new Date(), -1));

    // 加载数据
    useEffect(() => {
        if (!selectedDate) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const response = await apiClient.get('/api/v1/market-analysis/dashboard', {
                    params: { date: dateStr }
                });
                setData(response.data);
            } catch (err: any) {
                setError(err.response?.data?.detail || '加载数据失败');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedDate]);

    // 日期导航
    const handlePreviousDay = () => {
        if (!selectedDate) return;
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const handleNextDay = () => {
        if (!selectedDate) return;
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        setSelectedDate(newDate);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {error}
            </Alert>
        );
    }

    if (!data) return null;

    return (
        <Box>
            {/* 日期选择器 + 导航器 */}
            <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
                <Box display="flex" alignItems="center" justifyContent="center" gap={{ xs: 1, sm: 2 }} flexWrap="wrap">
                    <IconButton onClick={handlePreviousDay} color="primary" size="small">
                        <ArrowBackIosNewIcon fontSize="small" />
                    </IconButton>

                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
                        <DatePicker
                            label="选择日期"
                            value={selectedDate}
                            onChange={(newDate) => setSelectedDate(newDate)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    sx: { minWidth: { xs: '150px', sm: '200px' } }
                                }
                            }}
                        />
                    </LocalizationProvider>

                    <IconButton onClick={handleNextDay} color="primary" size="small">
                        <ArrowForwardIosIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Paper>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
                {/* 财务指标大卡片 - 桌面端左侧，移动端全宽 */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <FinancialKPIsPanel kpis={data.financial_kpis} />
                </Grid>

                {/* 风险指标大卡片 - 桌面端右侧，移动端全宽 */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <RiskKPIsPanel kpis={data.risk_kpis} />
                </Grid>

                {/* 价格曲线图 */}
                <Grid size={{ xs: 12 }}>
                    <PriceChart data={data.time_series} onPrevious={handlePreviousDay} onNext={handleNextDay} />
                </Grid>

                {/* 电量曲线图 */}
                <Grid size={{ xs: 12 }}>
                    <VolumeChart data={data.time_series} onPrevious={handlePreviousDay} onNext={handleNextDay} />
                </Grid>

                {/* 时段汇总表格 */}
                <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                        时段财务速览
                    </Typography>
                    <PeriodSummaryTable data={data.period_summary} />
                </Grid>
            </Grid>
        </Box>
    );
};
