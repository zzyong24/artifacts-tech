# my-artifacts

> 教学短视频素材库 · 口播稿 + 交互动画

## 目录结构

```
my-artifacts/
├── works/
│   ├── 01-text-is-interface/   # 文本是知识的接口
│   │   ├── index.html          # 交互动画
│   │   ├── script.md           # 口播稿
│   │   ├── gsap.min.js         # 动画库
│   │   └── README.md
│   └── XX-作品名/              # 后续作品同结构
├── README.md
└── .gitignore
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/zzyong24/artifacts-tech.git
cd artifacts-tech
```

### 2. 启动本地服务

> **必须用 HTTP 服务访问，不能直接双击打开 HTML**（浏览器安全限制）

```bash
# 方式一：Python（推荐，无需安装）
python3 -m http.server 8080

# 方式二：Node.js
npx serve . -p 8080
```

### 3. 打开作品

```bash
# 浏览器访问
open http://localhost:8080/works/01-text-is-interface/index.html
```

或手动在浏览器输入对应地址。

## 作品列表

| # | 主题 | 目录 |
|---|------|------|
| 01 | 文本是知识的接口 | `works/01-text-is-interface/` |

## 新增作品规范

1. 在 `works/` 下新建文件夹，命名格式：`NN-主题英文简写`
2. 文件夹内包含：`index.html`、`script.md`、`README.md`
3. 外部依赖库（如 gsap）下载到本地，不使用 CDN
4. 更新本文件的「作品列表」

## 录制建议

- 浏览器全屏（F11 / Cmd+Ctrl+F）
- 录屏工具：OBS / QuickTime / Loom
- 分辨率：1920×1080 或 2560×1440
- 口播稿在对应作品的 `script.md` 中
