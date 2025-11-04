import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

/**
 * JWT 载荷接口
 */
interface JwtPayload {
    exp: number; // 过期时间（Unix 时间戳，秒）
    sub: string; // 用户标识
}

/**
 * 认证上下文接口
 */
interface AuthContextType {
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
}

/**
 * 创建认证上下文
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider 组件
 * 提供全局的认证状态管理和会话过期自动登出功能
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [logoutTimer, setLogoutTimer] = useState<NodeJS.Timeout | null>(null);

    /**
     * 登出函数
     * 清除 token、清除定时器、重定向到登录页
     */
    const logout = useCallback(() => {
        // 清除本地存储的 JWT
        localStorage.removeItem('token');

        // 清除定时器
        if (logoutTimer) {
            clearTimeout(logoutTimer);
            setLogoutTimer(null);
        }

        // 更新认证状态
        setIsAuthenticated(false);

        // 强制重定向到登录页
        window.location.href = '/login';
    }, [logoutTimer]);

    /**
     * 启动登出定时器
     * @param expiresIn 剩余有效时间（毫秒）
     */
    const startLogoutTimer = useCallback((expiresIn: number) => {
        // 清除现有定时器（如果有）
        if (logoutTimer) {
            clearTimeout(logoutTimer);
        }

        // 启动新的登出定时器
        const timer = setTimeout(() => {
            console.log('会话已过期，自动登出');
            logout();
        }, expiresIn);

        setLogoutTimer(timer);
    }, [logoutTimer, logout]);

    /**
     * 登录函数
     * 保存 JWT、解析过期时间、启动登出定时器
     * @param token JWT token
     */
    const login = useCallback((token: string) => {
        try {
            // 解码 JWT 获取过期时间
            const decoded = jwtDecode<JwtPayload>(token);
            const expTimestamp = decoded.exp * 1000; // 转换为毫秒
            const currentTime = Date.now();
            const expiresIn = expTimestamp - currentTime;

            // 如果 token 已经过期，立即登出
            if (expiresIn <= 0) {
                console.warn('Token 已过期');
                logout();
                return;
            }

            // 保存 token 到 localStorage
            localStorage.setItem('token', token);

            // 更新认证状态
            setIsAuthenticated(true);

            // 启动登出定时器
            startLogoutTimer(expiresIn);

            console.log(`会话将在 ${Math.round(expiresIn / 1000 / 60)} 分钟后过期`);
        } catch (error) {
            console.error('Token 解析失败:', error);
            logout();
        }
    }, [logout, startLogoutTimer]);

    /**
     * 初始化时检查 localStorage 中的 token
     * 如果 token 存在且未过期，则重新启动定时器
     */
    useEffect(() => {
        const token = localStorage.getItem('token');

        if (token) {
            try {
                // 解码 JWT 检查是否过期
                const decoded = jwtDecode<JwtPayload>(token);
                const expTimestamp = decoded.exp * 1000; // 转换为毫秒
                const currentTime = Date.now();
                const expiresIn = expTimestamp - currentTime;

                if (expiresIn > 0) {
                    // Token 未过期，重新启动定时器
                    setIsAuthenticated(true);
                    startLogoutTimer(expiresIn);
                    console.log(`恢复会话，将在 ${Math.round(expiresIn / 1000 / 60)} 分钟后过期`);
                } else {
                    // Token 已过期，立即登出
                    console.warn('检测到过期的 token，自动登出');
                    logout();
                }
            } catch (error) {
                console.error('Token 解析失败，清除无效 token:', error);
                logout();
            }
        }

        // 清理函数：组件卸载时清除定时器
        return () => {
            if (logoutTimer) {
                clearTimeout(logoutTimer);
            }
        };
    }, []); // 仅在组件挂载时执行一次

    const value: AuthContextType = {
        isAuthenticated,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * 自定义 Hook：使用认证上下文
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth 必须在 AuthProvider 内部使用');
    }
    return context;
};
