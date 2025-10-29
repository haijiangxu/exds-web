# Gemini 项目背景: exds-web

## 项目概述

本项目名为“电力交易辅助决策系统WEB端应用”，是一个用于电力负荷数据分析和可视化的网络平台。它旨在为用户提供直观、高效的工具来分析和比较电力负荷数据，并计划在未来扩展到负荷预测、交易策略和电费结算等功能。

项目遵循前后端分离的架构。

*   **后端:**
    *   **框架:** FastAPI (Python)
    *   **数据库:** MongoDB (通过 `pymongo` 访问)

*   **前端:**
    *   **框架:** React (使用 TypeScript)
    *   **UI 库:** Material-UI (MUI)
    *   **图表库:** Recharts

## 构建与运行

### 后端 (FastAPI)

1.  **安装依赖:** `pip install -r webapp/requirements.txt`
2.  **运行服务:** `uvicorn webapp.main:app --reload --port 8005`

### 前端 (React)

1.  **安装依赖:** `npm install --prefix frontend`
2.  **运行服务:** `npm start --prefix frontend`

## 开发规范

### 1. 后端规范 (Python/FastAPI)

-   **代码风格:** 遵循 PEP 8 规范，推荐使用 `Black` 或 `Ruff` 进行格式化。
-   **命名约定:** 变量和函数使用 `snake_case`，类名使用 `PascalCase`。
-   **API 设计:** 遵循 RESTful 原则，使用 Pydantic 模型进行数据校验和序列化。
-   **类型提示:** 所有新代码必须添加明确的 Python 类型提示。
-   **错误处理:** 使用 FastAPI 的 `HTTPException` 来处理 HTTP 相关的客户端错误。
-   **数据库访问:** 所有数据库操作应通过 `webapp.tools.mongo.DATABASE` 全局实例进行。

### 2. 前端规范 (TypeScript/React)

-   **代码风格:** 推荐使用 `Prettier` 进行自动代码格式化，保持风格统一。
-   **命名约定:** 组件（及文件名）使用 `PascalCase`，变量和函数使用 `camelCase`。
-   **组件开发:** 优先使用函数式组件和 Hooks，并保持组件的单一职责原则。
-   **API 通信:** 所有对后端的请求都应通过 `src/api/client.ts` 中预配置的 `axios` 实例发出。

### 3. 移动端与图表特别规范

-   **响应式设计 (H5):**
    -   所有页面和组件**必须**采用移动端优先的响应式设计。
    -   应优先使用 Material-UI 的栅格 (`Grid`) 和断点 (`sx` 属性) 来实现响应式布局。
-   **图表横屏查看:**
    -   所有 `Recharts` 图表在移动端**必须**支持“横屏最大化”功能。
    -   **实现方式:** 建议通过一个可复用的包装器组件实现，该组件在移动端提供一个最大化按钮，点击后调用浏览器的 **Fullscreen API** 和 **Screen Orientation API** 进入全屏横向锁定状态，并提供退出机制。

## 技术优化建议

以下是为提升项目可维护性和开发效率的建议，可在未来的迭代中考虑引入：

-   **前端状态管理:** 考虑使用 **Zustand** 来管理全局状态（如用户信息），以简化逻辑、提升性能。
-   **前端数据请求:** 考虑使用 **TanStack Query** (原 React Query) 来替代手动的 `useEffect` + `axios` 模式，以自动化管理数据缓存、加载和错误状态。
