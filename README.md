# action-ossutil

[![CI](https://github.com/broctagon/action-ossutil/actions/workflows/ci.yml/badge.svg)](https://github.com/broctagon/action-ossutil/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

在 GitHub Actions 中安装并配置 [阿里云 OSS](https://www.aliyun.com/product/oss) 官方命令行工具 [ossutil](https://help.aliyun.com/zh/oss/developer-reference/ossutil-overview)，让后续步骤可以直接执行 `ossutil` 命令。

## 特性

- 按运行环境自动下载对应平台的 ossutil 二进制（Linux / Windows / macOS，x86 / ARM）
- 下载后进行 SHA256 校验，保证二进制未被篡改
- 支持 `@actions/tool-cache` 缓存，重复运行无需重新下载
- 自动导出 `OSS_*` 环境变量完成认证，无需手写 `ossutil config`
- AccessKey / Secret / STS Token 均通过 `core.setSecret` 脱敏，避免泄露到日志

## 快速开始

```yaml
name: Upload to OSS

on:
  push:
    branches: [main]

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Setup ossutil
        uses: broctagon/action-ossutil@v1
        with:
          region: ap-southeast-1
          access-key-id: ${{ secrets.OSS_ACCESS_KEY_ID }}
          access-key-secret: ${{ secrets.OSS_ACCESS_KEY_SECRET }}

      - name: Upload
        run: ossutil cp -r ./dist oss://my-bucket/static/ --force
```

> 建议将 `uses` 固定到发布标签（如 `@v1`），避免主分支变动影响流水线。

## 输入参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `region` | 是 | - | OSS 地域 ID，如 `ap-southeast-1`、`cn-hangzhou` |
| `version` | 否 | `2.4.0` | ossutil 版本 |
| `endpoint` | 否 | - | OSS Endpoint，留空则使用默认公网 Endpoint |
| `access-key-id` | 否 | - | AccessKey ID，建议从 Secrets 传入 |
| `access-key-secret` | 否 | - | AccessKey Secret，建议从 Secrets 传入 |
| `sts-token` | 否 | - | STS 临时访问凭证 |
| `variant` | 否 | - | 特殊变体，仅 `windows-amd64-go1.20` 需填 `go1.20` |

## 输出

| 输出 | 说明 |
| --- | --- |
| `ossutil-path` | ossutil 可执行文件的绝对路径 |
| `ossutil-version` | 实际安装的 ossutil 版本 |

```yaml
- name: Setup ossutil
  id: ossutil
  uses: broctagon/action-ossutil@v1
  with:
    region: ap-southeast-1

- run: echo "Installed at ${{ steps.ossutil.outputs.ossutil-path }}"
```

## 环境变量

Action 会把认证信息导出为环境变量，后续步骤中的 `ossutil` 会自动读取：

| 环境变量 | 来源 |
| --- | --- |
| `OSS_REGION` | `region` |
| `OSS_ENDPOINT` | `endpoint`（非空时） |
| `OSS_ACCESS_KEY_ID` | `access-key-id`（非空时） |
| `OSS_ACCESS_KEY_SECRET` | `access-key-secret`（非空时） |
| `OSS_SESSION_TOKEN` | `sts-token`（非空时） |

## 使用 STS 临时凭证

```yaml
- uses: broctagon/action-ossutil@v1
  with:
    region: ap-southeast-1
    access-key-id: ${{ secrets.STS_ACCESS_KEY_ID }}
    access-key-secret: ${{ secrets.STS_ACCESS_KEY_SECRET }}
    sts-token: ${{ secrets.STS_TOKEN }}
```

## 支持平台

| 操作系统 | 架构 |
| --- | --- |
| Linux | `386`、`amd64`、`arm`、`arm64` |
| Windows | `386`、`amd64` |
| macOS | `amd64`、`arm64` |

Windows `amd64` 如需 Go 1.20 编译的旧版本，可额外指定 `variant: go1.20`：

```yaml
- uses: broctagon/action-ossutil@v1
  with:
    region: ap-southeast-1
    variant: go1.20
```

## 安全性

- 每个发布版本的二进制摘要都记录在 [`src/sha256.json`](src/sha256.json)，下载后强制校验 SHA256，不匹配即失败
- 凭据只通过 GitHub Secrets 传入，并在日志中自动打码
- 请勿将 AccessKey 明文写进 workflow 文件

## 本地开发

需要 Node.js 24+，测试依赖 [Bun](https://bun.sh)。

```bash
npm install          # 安装依赖
npm run typecheck    # TypeScript 类型检查
npm test             # 运行测试（bun test）
npm run build        # 使用 ncc 打包到 dist/
```

修改 `src/` 后请重新执行 `npm run build` 并提交 `dist/` 产物，Action 运行时使用的是 `dist/index.js`。

### 新增 ossutil 版本

1. 将各平台压缩包的 SHA256 写入 `src/sha256.json`，key 格式为 `{version}-{os}-{cpu}[-variant]`
2. 如需切换默认版本，更新 `action.yml` 中 `version` 的 `default`

## License

[MIT](LICENSE)
