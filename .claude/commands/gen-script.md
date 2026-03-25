# /gen-script — 生成教学口播稿

根据用户提供的内容，生成一篇符合规范的教学短视频口播稿，并保存到指定作品目录。

## 使用方式

```
/gen-script <作品目录名> <内容来源>
```

**参数说明：**
- `<作品目录名>`：作品文件夹名，格式 `NN-主题简写`，如 `02-llm-context`
- `<内容来源>`：可以是文件路径、一段文字观点，或不填（进入交互问诊）

**示例：**
```
/gen-script 02-llm-context /path/to/article.md
/gen-script 02-llm-context 大模型的上下文窗口就像工作记忆，不是越大越好
/gen-script 02-llm-context
```

---

## 执行步骤

### Step 1：读取配置

读取 `.claude/artifacts.config.json`，获取：
- `prompts.script`：口播稿生成器 Prompt 模板路径
- `works_dir`：作品根目录

如果配置文件不存在，提示用户：
> `.claude/artifacts.config.json` 不存在，请复制 `.claude/artifacts.config.example.json` 并填入本机路径。

### Step 2：读取 Prompt 模板

读取 `prompts.script` 路径下的 Markdown 文件，提取其中的**写作规范**和**结构要求**。

### Step 3：确定内容输入

- 若参数是文件路径 → 读取文件内容作为洞见素材
- 若参数是文字 → 直接作为洞见/观点输入
- 若无参数 → 询问用户：「你想讲的洞见/概念/观点是什么？」

### Step 4：生成口播稿

严格按照 Prompt 模板中的规范生成口播稿，要求：

- 结构：开场锚点 → 问题前置 → 类比降维 → 层层递进 → 哲学延伸（可选）→ 收尾行动
- 语言：全口语，短句为主，禁止套话
- 字数：600–900 字（对应 3–5 分钟）
- 加入真实产品/经历视角（灵犀、第一个付费用户等）
- 附：封面标题×2、视频标题×2、话题标签×6
- 末尾附 Slide 对应关系表（每段对应哪张 Slide，预计时长）

### Step 5：保存文件

保存到 `<works_dir>/<作品目录名>/script.md`。

如果目录不存在，自动创建，并同时创建一个空的 `README.md`（只写标题占位）。

### Step 6：输出确认

告知用户：
- 文件保存路径
- 口播稿共几张 Slide、预计时长
- 下一步可执行 `/gen-slides <作品目录名>` 生成动画
