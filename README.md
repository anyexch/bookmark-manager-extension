# Bookmark Import Export Manager

一个合并版 Chrome 扩展，用来扫描、导出、导入、删除浏览器书签。界面支持中文和英文，并会记住用户选择的语言。

## 功能

- 扫描当前 Chrome 书签数量和文件夹数量
- 导出 Markdown、JSON、Chrome/Netscape HTML 书签文件
- 从 Markdown、JSON、Chrome/Netscape HTML 导入书签
- 可选择导入前清空现有书签
- 单独清空全部书签，需输入 `DELETE ALL` 确认
- 中文 / English 双语界面

## 安装

1. 打开 Chrome 的 `chrome://extensions/`
2. 开启右上角“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择本目录：`bookmark-manager-extension`

## 导入格式

JSON 支持以下结构：

```json
{
  "bookmarks": [
    { "title": "OpenAI", "url": "https://openai.com", "folder": "AI / Tools" }
  ]
}
```

也支持数组形式：

```json
[
  { "title": "OpenAI", "url": "https://openai.com", "folder": "AI / Tools" }
]
```

Markdown 支持导出文件中的格式：

```markdown
### AI / Tools

- [OpenAI](https://openai.com) - added 2026-06-26
```
