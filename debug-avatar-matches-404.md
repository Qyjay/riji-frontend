# [OPEN] debug-avatar-matches-404

## 症状
- 前端请求 `GET http://115.190.218.167/api/avatar/matches` 返回 `404 Not Found`
- 触发位置来自 `plaza.ts` / `index.vue` 的 `loadPosts`

## 当前上下文
- 前端默认后端已切到公网 `http://115.190.218.167/api`
- ECS 后端健康检查正常，登录接口可用
- 线上 SQLite 已替换为本地注入测试数据

## 初始假设
- H1: 前端请求的路由路径写错了，后端当前并没有 `/api/avatar/matches`
- H2: 后端有相关能力，但实际路由前缀或命名已变更，例如在别的模块下
- H3: 前端命中了旧接口约定，当前后端代码与前端 API 封装未同步
- H4: Nginx 反向代理只暴露了部分路径，导致某些接口被吞掉
- H5: 404 与数据无关，即使库里有数据，只要路由不存在也会直接 404

## 计划
- 先核对前端调用点与后端实际路由定义
- 再用公网直接请求验证是“代理层 404”还是“应用层 404”
- 根因明确后，再做最小修复

## 证据
- 前端调用点：`src/services/api/plaza.ts` 中 `getAgentMatches()` 请求 `/avatar/matches`
- 后端路由：`app/avatar/router.py` 原先只暴露了 `/mutual-matches`、`/actions`、`/profile` 等接口，没有 `/matches`
- 公网直接请求 `GET http://115.190.218.167/api/avatar/matches` 返回 `404 {"detail":"Not Found"}`
- 本地补齐兼容路由后，登录成功并请求 `GET /api/avatar/matches` 返回 `200`
- 同步到 ECS 并重建容器后，公网 `GET /api/avatar/matches` 也返回 `200`

## 结论
- H1 成立：前端路径不是 Nginx 问题，而是后端缺失旧兼容路由
- H2/H3 成立：后端已有匹配服务能力，但路由契约与前端未对齐
- H4 不成立：代理层未吞路径，应用本身就没有该路由
- H5 成立：404 与数据库数据无关
