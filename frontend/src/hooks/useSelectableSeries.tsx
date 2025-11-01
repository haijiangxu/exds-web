import { useState, useCallback } from 'react';
import { LegendPayload } from 'recharts';

/**
 * 一个自定义 Hook，用于管理 Recharts 图表中可切换系列（series）的可见性状态。
 *
 * @param initialSeriesState - 一个对象，key 为 series 的 dataKey，value 为其初始的可见性 (true/false)。
 * @returns 返回一个对象，包含：
 *  - seriesVisibility: 当前所有 series 的可见性状态。
 *  - handleLegendClick: 一个应传递给 Recharts <Legend> 组件的 onClick 事件处理器。
 */
export const useSelectableSeries = <T extends string>(
  initialSeriesState: Record<T, boolean>
) => {
  const [seriesVisibility, setSeriesVisibility] = useState(initialSeriesState);

  const handleLegendClick = useCallback((data: LegendPayload) => {
    const dataKey = data.dataKey as T; // Recharts LegendPayload's dataKey can be undefined, cast to T
    // 确保只处理在初始状态中定义的 key 且 dataKey 不为 undefined
    if (dataKey && seriesVisibility.hasOwnProperty(dataKey)) {
      setSeriesVisibility(prev => ({
        ...prev,
        [dataKey]: !prev[dataKey],
      }));
    }
  }, [seriesVisibility]); // 当 seriesVisibility 更新时，确保函数也获得最新闭包

  return {
    seriesVisibility,
    handleLegendClick,
  };
};