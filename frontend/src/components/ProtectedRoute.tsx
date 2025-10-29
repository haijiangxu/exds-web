
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute: React.FC = () => {
    const token = localStorage.getItem('token');

    // 如果token存在，则渲染子路由（通过Outlet），否则重定向到登录页
    return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
