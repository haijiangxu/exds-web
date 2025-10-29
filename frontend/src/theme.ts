
import { createTheme } from '@mui/material/styles';

// 创建一个自定义主题
const theme = createTheme({
    palette: {
        // 使用MUI默认的蓝色作为主色调
        primary: {
            main: '#1976d2',
        },
        // 将背景色设置为浅灰色，以突出卡片
        background: {
            default: '#f4f6f8',
            paper: '#ffffff',
        },
    },
    components: {
        // 为所有Paper组件（Card的基础）设置默认的阴影效果
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 8, // 轻微增加圆角
                },
            },
            defaultProps: {
                elevation: 1, // 设置一个微妙的、默认的阴影
            }
        },
        // 美化侧边栏的选中项
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    '&.Mui-selected': {
                        backgroundColor: '#e3f2fd', // 一个更柔和的蓝色
                        color: '#1976d2',
                        fontWeight: 'bold',
                        '& .MuiListItemIcon-root': {
                            color: '#1976d2',
                        },
                    },
                    '&:hover': {
                        backgroundColor: '#f0f0f0',
                    },
                },
            },
        },
    },
});

export default theme;
