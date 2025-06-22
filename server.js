const express = require('express');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = process.env.RENDER_DISK_PATH || __dirname;
const DATA_FILE = path.join(DATA_PATH, 'links.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 读取所有短链数据
function readLinks() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

// 保存短链数据
function saveLinks(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 生成短链接API
app.post('/api/shorten', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: '缺少url参数' });
  const links = readLinks();
  // 检查是否已存在
  let code = Object.keys(links).find(k => links[k] === url);
  if (!code) {
    code = nanoid(6);
    links[code] = url;
    saveLinks(links);
  }
  res.json({ short: `${req.protocol}://${req.get('host')}/${code}` });
});

// 访问短链，展示中转页
app.get('/:code', (req, res) => {
  const links = readLinks();
  const url = links[req.params.code];
  if (!url) return res.status(404).send('短链接不存在');
  // 渲染中转页
  res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
});

// 获取原始链接API（供中转页JS用）
app.get('/api/original/:code', (req, res) => {
  const links = readLinks();
  const url = links[req.params.code];
  if (!url) return res.status(404).json({ error: '短链接不存在' });
  res.json({ url });
});

app.listen(PORT, () => {
  console.log(`服务已启动：http://localhost:${PORT}`);
}); 