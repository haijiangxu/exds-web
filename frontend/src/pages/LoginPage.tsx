import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Alert,
    CircularProgress
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { login } from '../api/client'; // 导入真实的login API
import { AxiosError } from 'axios';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login: authLogin } = useAuth(); // 使用 AuthContext 的 login 方法
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        if (!username || !password) {
            setError('请输入用户名和密码');
            setLoading(false);
            return;
        }

        try {
            const response = await login(username, password);
            if (response.data && response.data.access_token) {
                // 使用 AuthContext 的 login 方法，它会自动处理 token 保存和定时器
                authLogin(response.data.access_token);
                navigate('/');
            } else {
                throw new Error('Token not found in response');
            }
        } catch (err) {
            if (err instanceof AxiosError && err.response?.status === 401) {
                setError('用户名或密码错误');
            } else {
                setError('登录失败，请检查您的凭据或网络连接');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={6} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <LockOutlinedIcon sx={{ fontSize: 40, mb: 1 }} color="primary" />
                <Typography component="h1" variant="h5">
                    电力交易辅助分析系统
                </Typography>
                <Typography component="h2" variant="subtitle1" sx={{ mb: 2 }}>
                    用户登录
                </Typography>
                <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1, width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 2 }}>
                        <PersonOutlineIcon sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="用户名"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 2 }}>
                         <LockOutlinedIcon sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
                         <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="密码"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </Box>
                    
                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
                    
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : '登 录'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default LoginPage;