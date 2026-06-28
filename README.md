# 抖音评论爬取工具

自动化爬取抖音视频评论，保存为 txt 文件。支持自定义条数，智能滚动停止。

## 环境要求

| 依赖 | 说明 |
|------|------|
| **Node.js** | v18+ ，需已安装 |
| **playwright-cli** | `npm install -g @playwright/cli@latest` |
| **Chromium 浏览器** | playwright 首次运行时会自动下载，也可复用系统 Chrome |
| **PowerShell** | Windows 自带，v5.1+ |

安装 playwright-cli：

```powershell
npm install -g @playwright/cli@latest
```

## 文件结构

```
douyin_comment_scrape.ps1        ← 主脚本，直接运行这个
douyin_scrape_scripts/
  scroll_and_snapshot.js         ← 内部辅助脚本（勿手动修改）
```

## 使用方法

**基本用法（默认200条）：**

```powershell
.\douyin_comment_scrape.ps1 -Url "https://v.douyin.com/iDgI34NPT7M/"
```

**自定义条数：**

```powershell
.\douyin_comment_scrape.ps1 -Url "https://v.douyin.com/iDgI34NPT7M/" -Count 50
.\douyin_comment_scrape.ps1 -Url "https://v.douyin.com/iDgI34NPT7M/" -Count 500
```

**爬全部评论（设一个很大的数，到头自动停）：**

```powershell
.\douyin_comment_scrape.ps1 -Url "https://v.douyin.com/iDgI34NPT7M/" -Count 9999
```

## 参数说明

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `-Url` | ✅ | 无 | 抖音视频链接，短链接和长链接均可 |
| `-Count` | ❌ | 200 | 目标爬取条数，达到目标或评论到底自动停止 |

## 运行流程

脚本运行时会自动完成以下步骤：

1. 检查 playwright-cli 是否可用
2. 将目标条数注入到辅助脚本
3. 用 `--headed --persistent` 模式打开浏览器（复用登录态）
4. 导航到抖音视频页面
5. 自动滚动评论区，每滚5次检查进度，达到目标条数即停
6. 提取评论内容，过滤噪声（分享、回复、头像等）
7. 关闭浏览器，还原辅助脚本
8. 保存结果为 UTF-8 txt 文件

## 输出格式

输出文件：`douyin_comments_YYYYMMDD_HHMM.txt`

```
Douyin Video Comments
URL: https://v.douyin.com/iDgI34NPT7M/
Title: 崔岷植最新剧集《末行手记》又叫《最后一排的男孩》 ...
Scraped: 20260627 1122
Target: 200  Extracted: 200  Available: 215  Scrolls: 20
==================================================

1. 老李大飞刀 | 翻拍国外的电影，登堂入室 | 11小时前·辽宁
2. 大魔王 | 期待他的赌命为王3 | 6小时前·广东
3. -少阁- | 崔岷植演技真好，主演校车司机特别有爱，家庭催泪剧，推荐一下 | 1小时前·北京
...
```

每条评论格式：`用户名 | 评论内容 | 时间·地点`

## 运行时间参考

| 目标条数 | 大约耗时 |
|---------|---------|
| 50 | ~30秒 |
| 200 | ~90秒 |
| 500 | ~3分钟 |
| 1000+ | ~5-8分钟 |

## 常见问题

**Q：运行时报 playwright-cli not found？**

安装：`npm install -g @playwright/cli@latest`

**Q：输出文件中文乱码？**

脚本内部已设置 UTF-8 编码，输出文件用 UTF-8 no BOM 写入。用记事本或其他编辑器打开时，确保选择 UTF-8 编码查看。

**Q：爬取数量少于目标？**

说明视频评论总数不够。脚本会在滚动到底且无新内容时自动停止，输出中会显示 `Available` 数量。

**Q：评论区没有加载出来？**

可能是页面加载慢，可以尝试增大脚本中的等待时间，或确保网络通畅。

**Q：抖音链接格式？**

短链接（`https://v.douyin.com/xxx/`）和长链接（`https://www.douyin.com/video/xxx`）都支持，脚本会自动跳转。
