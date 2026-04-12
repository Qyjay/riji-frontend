# retouch.vue 接口文档

> 适用页面：`src/pages/write/retouch.vue`
>
> 参考后端：`后端/AIimage2-backend`
>
> 更新时间：2026-04-11

---

## 1. 文档目标

本文档用于说明 `retouch.vue` 在修图工坊中与 `backend` 的前后端接口契约，覆盖：

- 图片上传接口
- 统一编辑执行接口
- 各编辑模式在前端中的参数映射
- 返回字段与错误处理约定

---

## 2. 服务地址与通用约定

## 2.1 Base URL

前端 AI 引擎默认地址：

```text
http://localhost:3001
```

前端会将该地址作为 `endpoint`，并拼接如下路径：

- `/api/upload`
- `/api/edit/execute`

## 2.2 认证

- 当前这两个接口不要求 JWT。
- Header 由 uni.request/uni.uploadFile 默认设置即可。

## 2.3 超时

- 前端 AI 请求超时默认 90s（`requestTimeout` 默认 90000ms）。

## 2.4 通用响应结构

成功响应（HTTP 2xx）：

```json
{
  "success": true,
  "taskId": "uuid",
  "operationType": "region-edit",
  "result": {
    "imageUrl": "http://host/storage/uploads/results/xxx.png",
    "imagePath": "storage/uploads/results/xxx.png",
    "model": "doubao-seedream-5-0-260128",
    "usedMock": false,
    "seedreamError": null,
    "prompt": "最终发给模型的prompt",
    "control": {
      "operationType": "region-edit",
      "instruction": "modify"
    }
  }
}
```

失败响应：

```json
{
  "success": false,
  "message": "错误描述"
}
```

---

## 3. 接口 1：上传图片

## 3.1 接口定义

```http
POST /api/upload
Content-Type: multipart/form-data
```

## 3.2 表单字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| image | file | 是 | 图片文件，后端限制 20MB |
| type | string | 否 | `original` / `intermediate` / `result`，默认 `original` |

## 3.3 成功响应

```json
{
  "success": true,
  "file": {
    "filename": "1710000000000-a.png",
    "type": "original",
    "mimeType": "image/png",
    "size": 345678,
    "path": "storage/uploads/originals/1710000000000-a.png",
    "url": "http://10.35.164.18:3001/storage/uploads/originals/1710000000000-a.png"
  }
}
```

前端后续用于编辑接口的是 `file.path`（相对路径），不是必须使用完整 URL。

## 3.4 常见错误

- 400：缺少 `image` 字段
- 413/500：文件过大或上传异常

---

## 4. 接口 2：统一编辑执行

## 4.1 接口定义

```http
POST /api/edit/execute
Content-Type: application/json
```

## 4.2 请求体字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| operationType | string | 是 | `region-edit` / `cross-replace` / `sketch-edit` / `symbol-edit` / `stroke-guided` / `perspective-edit` / `fusion-edit` |
| instruction | string | 是 | `delete` / `add` / `modify` / `replace` / `sketch` / `symbol` / `stroke-guided` / `perspective` / `fusion` |
| images | object | 是 | 不同模式下字段不同（见下表） |
| prompt | string | 否 | 用户指令，可为空字符串 |
| control | object | 否 | 扩展控制字段（后端透传） |

## 4.3 images 字段结构（按模式）

| 使用场景 | images 结构 |
| --- | --- |
| 区域编辑 / 轨迹引导 / 草图 / 符号 / 透视 | `{ "original": "...", "edited": "..." }` |
| 跨图替换 | `{ "editedA": "...", "editedB": "..." }` |
| 双图融合 | `{ "edited": "..." }` |

说明：

- `original` 与 `edited` 均可传后端可访问的相对路径（推荐）或 URL/dataURI。
- `edited` 通常是前端把原图和手绘标记合成后导出，再上传得到的路径。

---

## 5. retouch.vue 模式与接口映射

| 页面模式 | 用户操作 | operationType | instruction | images 结构 | prompt 来源 |
| --- | --- | --- | --- | --- | --- |
| 圈选编辑 | 删除 | `region-edit` | `delete` | `original + edited` | 空字符串 |
| 圈选编辑 | 添加 | `region-edit` | `add` | `original + edited` | 输入框文本 |
| 圈选编辑 | 修改 | `region-edit` | `modify` | `original + edited` | 输入框文本 |
| 跨图替换 | 修改 | `cross-replace` | `replace` | `editedA + editedB` | 输入框文本（前端会补充默认约束） |
| 轨迹引导 | 开始创作 | `stroke-guided` | `stroke-guided` | `original + edited` | 前端根据轨迹意图自动拼装 |
| 草图增量 | 开始创作 | `sketch-edit` | `sketch` | `original + edited` | 前端自动拼装草图语义提示 |
| 属性符号 | 开始创作 | `symbol-edit` | `symbol` | `original + edited` | 前端按符号类型自动拼装 |
| 属性符号（圈叉删除） | 开始创作 | `region-edit` | `delete` | `original + edited` | 空字符串 |
| 透视3D | 开始创作 | `stroke-guided` | `perspective` | `original + edited` | 前端自动拼装透视提示 |
| 双图融合 | 融合 | `fusion-edit` | `fusion` | `edited` | 默认 `fuse the image` |

说明：

- `retouch.vue` 的“透视3D”当前实现是 `operationType=stroke-guided + instruction=perspective`。
- 后端校验允许该组合，能够正常执行。

---

## 6. 关键请求示例

## 6.1 圈选修改

```json
{
  "operationType": "region-edit",
  "instruction": "modify",
  "images": {
    "original": "storage/uploads/originals/a.png",
    "edited": "storage/uploads/intermediate/a_marked.png"
  },
  "prompt": "把杯子改成红色磨砂材质"
}
```

## 6.2 跨图替换

```json
{
  "operationType": "cross-replace",
  "instruction": "replace",
  "images": {
    "editedA": "storage/uploads/intermediate/a_marked.png",
    "editedB": "storage/uploads/intermediate/b_marked.png"
  },
  "prompt": "将A图圈选元素替换到B图圈选区域，并保持B图光照一致"
}
```

## 6.3 双图融合

```json
{
  "operationType": "fusion-edit",
  "instruction": "fusion",
  "images": {
    "edited": "storage/uploads/intermediate/fusion_composite.png"
  },
  "prompt": "fuse the image"
}
```

---

## 7. 后端最终 Prompt 拼接规范（关键）

本节对应后端 `paramTransformer.js` 中 `buildPrompt(payload)` + `promptTemplateByInstruction(instruction)`。

## 7.1 最终 Prompt 拼接规则

后端收到前端 `prompt` 后，不会直接原样透传，而是按任务模板进行拼接。

1. `instruction = fusion`

- 最终 prompt：`trim(userPrompt)`
- 若空：回退为 `fuse the image`

2. `instruction = delete`

- 最终 prompt：仅使用 delete 任务模板
- 前端传入 `prompt` 会被忽略

3. 其他 instruction（`add` / `modify` / `replace` / `sketch` / `symbol` / `stroke-guided` / `perspective`）

- 若 `userPrompt` 非空：`finalPrompt = template + userPrompt`
- 若 `userPrompt` 为空：`finalPrompt = template + 请按该编辑意图自然生成结果图。`

## 7.2 各任务预设模板（应写法）

下表是后端当前“提前设定好的 prompt 模板”原文。若后续改模板，需同步更新文档。

| instruction | 模板文本（template） |
| --- | --- |
| `delete` | 图1是原图，图2是图1上用户标记后的图片。请删除图2中标记区域对应的内容，并与周围场景自然融合，保持其余区域不变。 |
| `add` | 图1是原图，图2是图1上用户标记后的图片。请在图2标记区域内添加以下内容： |
| `modify` | 图1是原图，图2是图1上用户标记后的图片。请仅修改图2标记区域，修改要求为： |
| `replace` | 图1是原图，图2是图1上用户标记后的图片。请对图2标记区域执行替换编辑，要求为： |
| `sketch` | 图1是原图，图2是图1上用户草图标记后的图片。请将草图线条先语义识别，再转化为真实内容融合到原场景：优先还原用户意图（如云朵、椅子、人物姿势等）；保持原图光照、阴影、透视、材质与风格一致；仅编辑草图覆盖区域及必要过渡带；结果图不得保留手绘线条。具体要求为： |
| `symbol` | 图1是原图，图2是图1上用户符号标记后的图片。请严格按后续[SymbolIntent]执行属性编辑：先理解符号语义（光影调节/细节优化/风格调节），再在对应区域完成自然修改；保持原图光照、透视、材质一致；结果图不得保留手绘符号。具体要求为： |
| `stroke-guided` | 图1是原图，图2是图1上用户轨迹标记后的图片。请严格根据后续[StrokeIntent]字段执行局部编辑：优先解析type与语义关系（弯曲/拉伸/移动/渐变）；仅处理轨迹覆盖区域及其自然过渡带；输出与原图风格、光照、透视一致，且不要保留任何手绘标记。具体要求为： |
| `perspective` | 图1是原图，图2是图1上用户透视标记后的图片。请严格依据后续[PerspectiveIntent]执行透视修正：优先使用消失点与透视线统一结构收敛关系，修复建筑/道路/物体边缘透视错位；必要时按体块关系重建局部3D感；仅编辑标注区域及其过渡带；保持原图光照、材质与清晰度一致，结果图不得保留任何手绘标记。具体要求为： |
| `fusion` | 图1是原图，图2是图1上用户融合标记后的图片。请按融合意图生成自然结果图，要求为： |

## 7.3 前端传 prompt 的写法建议

1. `delete`

- 不需要让用户输入 prompt，后端模板已完整。

2. `add` / `modify` / `replace`

- 传“可执行约束句”，例如：

```text
将圈选区域内外套改为深蓝牛仔材质，保留人物姿势和背景不变。
```

3. `sketch` / `symbol` / `stroke-guided` / `perspective`

- 建议保留结构化意图片段（如 `[SymbolIntent]`、`[StrokeIntent]`、`[PerspectiveIntent]`），放在用户 prompt 内。

4. `fusion`

- 允许只传 `fuse the image` 作为兜底。

---

## 8. 前端调用顺序（建议实现）

1. 导入图像后，先调用 `/api/upload` 上传原图。
2. 用户手绘后导出合成图，再调用 `/api/upload` 上传 `intermediate`。
3. 调用 `/api/edit/execute` 提交 `operationType + instruction + images + prompt`。
4. 读取响应中的 `result.imageUrl`，回填画布主图。

---

## 9. 错误处理建议

前端建议按以下优先级显示错误：

1. 直接显示后端 `message`（短文本）
2. 超长文本统一展示“AI请求失败，请重试”
3. 超时单独提示“AI处理超时，请稍后重试”

常见错误来源：

- 请求体字段不符合 Joi 校验（400）
- 上传后路径不可访问或图片不存在
- 模型调用失败（后端可能自动降级 mock，并在 `result.usedMock=true` 体现）

---

## 10. 与当前代码对应关系

- 页面：`src/pages/write/retouch.vue`
- 前端 AI 请求封装：`src/utils/ai-edit/ai.js`
- 后端路由：`后端/AIimage2-backend/src/routes/uploadRoutes.js`、`后端/AIimage2-backend/src/routes/editRoutes.js`
- 后端控制器：`后端/AIimage2-backend/src/controllers/uploadController.js`、`后端/AIimage2-backend/src/controllers/editController.js`
- 后端参数校验：`后端/AIimage2-backend/src/services/validationService.js`
