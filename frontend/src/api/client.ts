
import axios from 'axios';

// 创建一个axios实例，用于与我们的FastAPI后端通信
const apiClient = axios.create({
    // 从环境变量读取API的基础URL，如果不存在，则默认为本地开发服务器地址
    baseURL: process.env.REACT_APP_API_BASE_URL || '',
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- 请求拦截器 ---
// 在每个请求发送前，检查localStorage中是否有token，并将其添加到Authorization头
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- 响应拦截器 ---
// 捕获所有API响应，如果遇到401错误，则认为token已过期，自动退出登录
apiClient.interceptors.response.use(
    (response) => {
        // 状态码在 2xx 范围内的任何响应都会触发此函数
        return response;
    },
    (error) => {
        // 任何超出 2xx 范围的状态码都会触发此函数
        if (error.response && error.response.status === 401) {
            // 如果是401错误，则清除token并重定向到登录页
            localStorage.removeItem('token');
            // 使用 window.location.href 来强制刷新页面，清除所有旧的状态
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

/**
 * 用户登录函数
 * @param username 用户名
 * @param password 密码
 */
export const login = (username: string, password: string) => {
    // FastAPI的OAuth2PasswordRequestForm需要x-www-form-urlencoded格式的数据
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    return apiClient.post('/token', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
};


/**
 * 获取指定数据类型的统计信息。
 * @param dataType - 数据类型的API短名称 (e.g., 'rt-price')
 */
export const getStats = (dataType: string) => {
    return apiClient.get(`/api/stats/${dataType}`);
};

/**
 * 上传文件以进行数据导入。
 * @param dataType - 数据类型的API短名称
 * @param file - 用户选择的文件对象
 */
export const uploadFile = (dataType: string, file: File) => {
    const formData = new FormData();
    formData.append('data_type', dataType);
    formData.append('file', file);

    return apiClient.post('/api/import', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};


export default apiClient;
