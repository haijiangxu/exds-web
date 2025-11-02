import React, { useMemo } from 'react';
import { ReferenceArea } from 'recharts';
import { TOU_PERIOD_COLORS } from '../constants/touPeriodColors';

/**
 * 时段数据接口
 * 图表数据项必须包含以下字段
 */
export interface TouPeriodData {
    time: string;          // 时间点（如 "00:00", "01:00"）
    period_type: string;   // 时段类型（如 "尖峰", "高峰", "平段", "低谷", "深谷"）
    [key: string]: any;    // 其他数据字段
}

/**
 * 时段区间定义
 */
export interface TouArea {
    type: string;  // 时段类型
    x1: string;    // 起始时间
    x2: string;    // 结束时间
}

/**
 * Hook 返回值
 */
export interface UseTouPeriodBackgroundReturn {
    /** 时段区间数组 */
    touAreas: TouArea[];
    /** ReferenceArea 组件数组，可直接在图表中渲染 */
    TouPeriodAreas: React.JSX.Element[];
    /** 获取指定时段的颜色 */
    getPeriodColor: (periodType: string) => string;
}

/**
 * 分时电价时段背景色 Hook
 *
 * 用于在 Recharts 图表中渲染分时电价时段的背景色
 *
 * @example
 * ```tsx
 * const { TouPeriodAreas } = useTouPeriodBackground(chartData);
 *
 * return (
 *   <ComposedChart data={chartData}>
 *     <CartesianGrid strokeDasharray="3 3" />
 *     <XAxis dataKey="time" />
 *     <YAxis />
 *     {TouPeriodAreas}
 *     <Line dataKey="price" />
 *   </ComposedChart>
 * );
 * ```
 *
 * @param data 图表数据数组，每项必须包含 time 和 period_type 字段
 * @param endTime 最后一个时段的结束时间，默认为 "24:00"
 * @returns Hook 返回值对象
 */
export const useTouPeriodBackground = (
    data: TouPeriodData[] | null | undefined,
    endTime: string = '24:00'
): UseTouPeriodBackgroundReturn => {

    /**
     * 计算时段区间
     */
    const touAreas = useMemo(() => {
        if (!data || data.length === 0) return [];

        const areas: TouArea[] = [];

        if (data.length > 0) {
            let currentArea: TouArea = {
                type: data[0].period_type,
                x1: data[0].time,
                x2: ''
            };

            for (let i = 1; i < data.length; i++) {
                if (data[i].period_type !== currentArea.type) {
                    currentArea.x2 = data[i].time;
                    areas.push(currentArea);
                    currentArea = {
                        type: data[i].period_type,
                        x1: data[i].time,
                        x2: ''
                    };
                }
            }

            // 最后一个区间
            currentArea.x2 = endTime;
            areas.push(currentArea);
        }

        return areas;
    }, [data, endTime]);

    /**
     * 生成 ReferenceArea 组件数组
     */
    const TouPeriodAreas = useMemo(() => {
        return touAreas.map((area, index) => (
            <ReferenceArea
                key={`tou-area-${index}`}
                x1={area.x1}
                x2={area.x2}
                strokeOpacity={0}
                fill={TOU_PERIOD_COLORS[area.type] || 'transparent'}
            />
        ));
    }, [touAreas]);

    /**
     * 获取指定时段的颜色
     */
    const getPeriodColor = (periodType: string): string => {
        return TOU_PERIOD_COLORS[periodType] || 'transparent';
    };

    return {
        touAreas,
        TouPeriodAreas,
        getPeriodColor,
    };
};
