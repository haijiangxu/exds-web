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
    -   **强制要求**: 所有 `Recharts` 图表在移动端**必须**支持“横屏最大化”功能。
    -   **实现方式**: **必须**使用项目内置的可复用 Hook `useChartFullscreen` 来实现此功能。该 Hook 位于 `frontend/src/hooks/useChartFullscreen.tsx`。
    -   **使用方法**:
        1.  在你的组件中，为图表的父容器创建一个 `ref`。
        2.  调用 `useChartFullscreen` Hook，并传入 `ref` 和其他所需参数（如`title`, `onPrevious`, `onNext`）。
        3.  在 JSX 中，根据 Hook 返回的 `isFullscreen` 状态和UI组件（`FullscreenEnterButton`, `FullscreenExitButton`等）来自由渲染全屏功能。

        ```jsx
        const {
          isFullscreen,
          FullscreenEnterButton,
          FullscreenExitButton,
          FullscreenTitle,
          NavigationButtons
        } = useChartFullscreen({
          chartRef,
          title: `...`,
          onPrevious: handlePrevious,
          onNext: handleNext,
        });

        return (
          <Box ref={chartRef} sx={{...}}>
            <FullscreenEnterButton />
            <FullscreenExitButton />
            <FullscreenTitle />
            <NavigationButtons />
            <ResponsiveContainer> ... </ResponsiveContainer>
          </Box>
        );
        ```

-   **图表曲线选择:**
    -   **强制要求**: 对于需要用户交互式选择显示/隐藏图表曲线的场景，**必须**使用项目内置的可复用 Hook `useSelectableSeries` 来实现此功能。该 Hook 位于 `frontend/src/hooks/useSelectableSeries.tsx`。
    -   **使用方法**: 请参考 `docs/技术方案与编码规范.md` 中 `3.8.2. useSelectableSeries` 的详细说明。

-   **通用可复用 Hook 使用原则:**
    -   在开发新的图表功能或交互时，**必须**首先检查 `frontend/src/hooks/` 目录下是否存在已有的可复用 Hook。如有，应优先使用，避免重复造轮子。
    -   如果现有 Hook 无法满足需求，且该功能具有通用性，应考虑将其封装为新的可复用 Hook，并更新相关文档。

## 技术优化建议

以下是为提升项目可维护性和开发效率的建议，可在未来的迭代中考虑引入：

-   **前端状态管理:** 考虑使用 **Zustand** 来管理全局状态（如用户信息），以简化逻辑、提升性能。
-   **前端数据请求:** 考虑使用 **TanStack Query** (原 React Query) 来替代手动的 `useEffect` + `axios` 模式，以自动化管理数据缓存、加载和错误状态。

## 4. 特别注意事项

### Material-UI Grid 组件语法

- **问题**: 本项目使用的 Material-UI v7 版本，其 `Grid` 组件的 API 与 v5 等常见版本**不兼容**。
- **错误语法**: 直接使用 `item` 属性或仅使用 `xs`, `md` 等断点属性（如 `<Grid item xs={12}>` 或 `<Grid xs={12}>`）会导致编译错误。
- **正确语法**: **必须**使用 `size` 属性来传递响应式断点，示例如下：

  ```jsx
  <Grid container spacing={2}>
    <Grid size={{ xs: 12, md: 6 }}>
      {/* ...内容... */}
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      {/* ...内容... */}
    </Grid>
  </Grid>
  ```

- **强制要求**: 后续所有涉及 `Grid` 组件的开发，**必须**遵循 `size` 属性的语法。

## 5. 前端开发工作流

- **目标**: 实现前端编译错误的自主、快速诊断，减少对用户的人工依赖。
- **启动命令**: 在开始前端开发任务时，**必须**首先在后台启动开发服务器，并将日志输出到指定文件。命令如下：
  ```shell
  npm start --prefix frontend > ~\.gemini\tmp\86e345d65824066fba62416e4de3c72495f15be1941b009daf202979c9ee0a7e\frontend_dev.log 2>&1 &
  ```
- **错误处理**: 当用户报告“有编译错误”时，我的**首要行动**是使用 `read_file` 工具读取上述 `frontend_dev.log` 文件的内容，以获取详细错误信息，然后进行修复。


# 项目其他要求：
## 一律用中文简体回复