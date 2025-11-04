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
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';
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
    time_str: string;
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
    time_str: string;
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
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '1rem' }}>
                        实时加权均价
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', my: 0.5 }}>
                        {kpis.vwap_rt !== null ? kpis.vwap_rt.toFixed(2) : 'N/A'}
                    </Typography>
                </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '1rem' }}>
                        日前加权均价
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main', my: 0.5 }}>
                        {kpis.vwap_da !== null ? kpis.vwap_da.toFixed(2) : 'N/A'}
                    </Typography>
                </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '1rem' }}>
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
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '1rem' }}>
                        实时算术均价
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', my: 0.5 }}>
                        {kpis.twap_rt !== null ? kpis.twap_rt.toFixed(2) : 'N/A'}
                    </Typography>
                </Box>
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '1rem' }}>
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
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '1rem' }}>
                        最大正价差（最大亏损点）
                    </Typography>
                    {kpis.max_positive_spread ? (
                        <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap" justifyContent="center">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                {kpis.max_positive_spread.value.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {kpis.max_positive_spread.time_str} (第{kpis.max_positive_spread.period}段)
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">无数据</Typography>
                    )}
                </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '1rem' }}>
                        最大负价差（最大盈利点）
                    </Typography>
                    {kpis.max_negative_spread ? (
                        <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap" justifyContent="center">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                {kpis.max_negative_spread.value.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {kpis.max_negative_spread.time_str} (第{kpis.max_negative_spread.period}段)
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">无数据</Typography>
                    )}
                </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '1rem' }}>
                        实时最高价
                    </Typography>
                    {kpis.max_rt_price ? (
                        <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap" justifyContent="center">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                                {kpis.max_rt_price.value.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {kpis.max_rt_price.time_str} (第{kpis.max_rt_price.period}段)
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">无数据</Typography>
                    )}
                </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
                <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '1rem' }}>
                        实时最低价
                    </Typography>
                    {kpis.min_rt_price ? (
                        <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap" justifyContent="center">
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                                {kpis.min_rt_price.value.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {kpis.min_rt_price.time_str} (第{kpis.min_rt_price.period}段)
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

// Custom Tooltip 内容组件
const CustomTooltipContent: React.FC<any> = ({ active, payload, label, unit }) => {
    if (active && payload && payload.length) {
        const periodType = payload[0].payload.period_type;
        return (
            <Paper sx={{ p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '4px' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {`时间: ${label} (${periodType})`}
                </Typography>
                {payload.map((pld: any) => (
                    <Typography key={pld.dataKey} variant="body2" sx={{ color: pld.color }}>
                        {`${pld.name}: ${Number(pld.value).toFixed(2)} ${unit}`}
                    </Typography>
                ))}
            </Paper>
        );
    }
    return null;
};


// 价格曲线图组件
const PriceChart: React.FC<{ data: TimeSeriesPoint[]; onPrevious: () => void; onNext: () => void }> = ({ data, onPrevious, onNext }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    // 计算Y轴范围
    const prices = data.flatMap(d => [d.price_rt, d.price_da].filter(p => p !== null) as number[]);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const { TouPeriodAreas } = useTouPeriodBackground(data);

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>价格曲线</Typography>
            <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                <Box
                    ref={chartRef}
                    sx={{
                        height: { xs: 350, sm: 400 },
                        position: 'relative',
                    }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            {TouPeriodAreas}
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time_str"
                                tick={{ fontSize: 12 }}
                                interval={11}
                            />
                            <YAxis
                                domain={[Math.floor(minPrice * 0.9), Math.ceil(maxPrice * 1.1)]}
                                label={{
                                    value: '价格 (元/MWh)',
                                    angle: -90,
                                    position: 'insideLeft'
                                }}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltipContent unit="元/MWh" />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="price_rt"
                                stroke="#f44336"
                                strokeWidth={2}
                                name="实时价格"
                                dot={false}
                            />
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
    const minVolume = volumes.length > 0 ? Math.min(...volumes) : 0;
    const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 0;

    const { TouPeriodAreas } = useTouPeriodBackground(data);

    return (
        <Paper variant="outlined" sx={{ mt: 1 }}>
            <Box sx={{ p: { xs: 1, sm: 2 } }}>
                <Typography variant="h6" gutterBottom>
                    负荷曲线
                </Typography>
                <Box
                    ref={chartRef}
                    sx={{
                        height: { xs: 350, sm: 400 },
                        position: 'relative',
                    }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            {TouPeriodAreas}
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time_str"
                                tick={{ fontSize: 12 }}
                                interval={11}
                            />
                            <YAxis
                                domain={[Math.floor(minVolume * 0.9), Math.ceil(maxVolume * 1.1)]}
                                label={{
                                    value: '电量 (MWh)',
                                    angle: -90,
                                    position: 'insideLeft'
                                }}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltipContent unit="MWh" />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="volume_rt"
                                stroke="#ff9800"
                                strokeWidth={2}
                                name="实时电量"
                                dot={false}
                            />
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
    <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto' }}>
        <Table
            sx={{
                '& .MuiTableCell-root': {
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 0.5, sm: 2 },
                }
            }}
        >
            <TableHead>
                <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>时段</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        日前VWAP
                        <br />
                        (元/MWh)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        现货VWAP
                        <br />
                        (元/MWh)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        加权价差
                        <br />
                        (元/MWh)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        平均电量
                        <br />
                        (MWh)
                    </TableCell>
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
    // 默认日期为当日的前二日
    const [selectedDate, setSelectedDate] = useState<Date | null>(addDays(new Date(), -2));

    // 加载数据
    useEffect(() => {
        if (!selectedDate) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const response = await apiClient.get('/api/v1/market-analysis/dashboard', {
                    params: { date_str: dateStr }
                });

                // 数据验证
                const timeSeriesData = response.data.time_series;
                if (timeSeriesData && timeSeriesData.length > 0) {
                    const firstPoint = timeSeriesData[0];
                    if (firstPoint.time_str !== '00:15') {
                        console.warn(`数据起点不正确: ${firstPoint.time_str}，应为 00:15`);
                    }
                    // 验证数据点数量（一天96个15分钟间隔）
                    if (timeSeriesData.length !== 96) {
                        console.warn(`数据点数量不正确: ${timeSeriesData.length}，应为 96`);
                    }
                }

                setData(response.data);
            } catch (err: any) {
                if (typeof err.response?.data?.detail === 'string') {
                    setError(err.response.data.detail);
                } else if (err instanceof Error) {
                    setError(err.message);
                } else if (typeof err === 'object' && err !== null) {
                    setError(JSON.stringify(err));
                } else {
                    setError('加载数据失败，发生未知错误');
                }
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
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
            <Box>
                {/* 日期选择器 + 导航器 */}
                <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <IconButton onClick={handlePreviousDay}>
                        <ArrowLeftIcon />
                    </IconButton>

                    <DatePicker
                        label="选择日期"
                        value={selectedDate}
                        onChange={(newDate) => setSelectedDate(newDate)}
                        slotProps={{
                            textField: {
                                sx: { width: { xs: '150px', sm: '200px' } }
                            }
                        }}
                    />

                    <IconButton onClick={handleNextDay}>
                        <ArrowRightIcon />
                    </IconButton>
                </Paper>

            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mt: 2 }}>
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
        </LocalizationProvider>
    );
};