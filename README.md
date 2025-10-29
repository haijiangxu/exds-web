# exds-web：电力交易辅助决策系统WEB端应用

## 1. 项目概述

“电力交易辅助决策系统”是一个Web应用，旨在为用户提供直观、高效的电力负荷数据可视化与对比分析功能，并为未来扩展负荷预测、交易策略、电费结算等高级功能奠定坚实的基础。

项目采用前后端分离架构。

## 2. 技术栈

*   **后端 (Backend):**
    *   **框架:** FastAPI (Python)
    *   **数据库:** MongoDB
    *   **主要依赖:** `pymongo`, `passlib[bcrypt]`, `python-jose[pyjwt]`, `slowapi`, `uvicorn`

*   **前端 (Frontend):**
    *   **框架:** React (使用 TypeScript)
    *   **UI 库:** Material-UI (MUI)
    *   **图表库:** Recharts
    *   **主要依赖:** `axios`, `react-router-dom`

## 3. 快速开始

### 环境准备

*   Python 3.8+
*   Node.js 14.x+
*   MongoDB

### 后端设置

1.  **安装依赖:**
    ```bash
    pip install -r webapp/requirements.txt
    ```

2.  **运行后端服务:**
    ```bash
    uvicorn webapp.main:app --reload --host 0.0.0.0 --port 8005
    ```
    服务启动后，API将在 `http://127.0.0.1:8005` 上可用。
    可交互的API文档 (Swagger UI) 可以在 `http://127.0.0.1:8005/docs` 访问。

### 前端设置

1.  **安装依赖:**
    ```bash
    npm install --prefix frontend
    ```

2.  **运行前端服务:**
    ```bash
    npm start --prefix frontend
    ```
    应用启动后，将在 `http://localhost:3000` 上可用。

    *注意: 前端已配置代理，所有对 `/api` 的请求都会被转发到 `http://127.0.0.1:8005`。*