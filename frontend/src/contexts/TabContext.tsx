import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// 页签信息接口
export interface TabInfo {
    key: string;        // 唯一标识
    title: string;      // 页签标题
    path: string;       // 路由路径
    component: ReactNode; // 页面组件
}

// Context 状态接口
interface TabContextState {
    openTabs: TabInfo[];              // 打开的页签列表
    activeTabKey: string | null;      // 当前激活的页签 key
    addTab: (tab: TabInfo) => void;   // 添加页签
    removeTab: (key: string) => void; // 移除页签
    setActiveTab: (key: string) => void; // 设置激活的页签
}

// 创建 Context
const TabContext = createContext<TabContextState | undefined>(undefined);

// Provider 组件
export const TabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [openTabs, setOpenTabs] = useState<TabInfo[]>([]);
    const [activeTabKey, setActiveTabKey] = useState<string | null>(null);

    // 添加页签
    const addTab = useCallback((tab: TabInfo) => {
        setOpenTabs((prevTabs) => {
            // 检查页签是否已存在
            const existingTab = prevTabs.find((t) => t.key === tab.key);
            if (existingTab) {
                // 如果已存在，直接激活它
                setActiveTabKey(tab.key);
                return prevTabs;
            }
            // 添加新页签
            const newTabs = [...prevTabs, tab];
            setActiveTabKey(tab.key);
            return newTabs;
        });
    }, []);

    // 移除页签
    const removeTab = useCallback((key: string) => {
        setOpenTabs((prevTabs) => {
            const newTabs = prevTabs.filter((t) => t.key !== key);

            // 如果移除的是当前激活的页签，需要激活一个邻近的页签
            if (activeTabKey === key) {
                if (newTabs.length > 0) {
                    // 找到被移除页签的索引
                    const removedIndex = prevTabs.findIndex((t) => t.key === key);
                    // 优先激活右侧的页签，如果没有则激活左侧的
                    const nextIndex = removedIndex < newTabs.length ? removedIndex : newTabs.length - 1;
                    setActiveTabKey(newTabs[nextIndex].key);
                } else {
                    setActiveTabKey(null);
                }
            }

            return newTabs;
        });
    }, [activeTabKey]);

    // 设置激活的页签
    const setActiveTab = useCallback((key: string) => {
        setActiveTabKey(key);
    }, []);

    const value: TabContextState = {
        openTabs,
        activeTabKey,
        addTab,
        removeTab,
        setActiveTab,
    };

    return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
};

// 自定义 Hook 用于使用 TabContext
export const useTabContext = (): TabContextState => {
    const context = useContext(TabContext);
    if (!context) {
        throw new Error('useTabContext must be used within a TabProvider');
    }
    return context;
};
