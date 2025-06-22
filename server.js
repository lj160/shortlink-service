const express = require('express');
const path = require('path');
const { nanoid } = require('nanoid');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// --- Supabase 连接信息 ---
// 警告：为了方便演示，我暂时将密钥写在这里。
// 在实际生产中，你应该将它们存储在环境变量中，以确保安全。
const supabaseUrl = 'https://ijgtjjeulyaepxmuandk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZ3RqamV1bHlhZXB4bXVhbmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDIzMTksImV4cCI6MjA2NjE3ODMxOX0.kVuN9zs9dVLPJKpLFzEX6QgK0UHOxAQ1wkNNNBtgPA8';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- API 端点 ---

// 生成短链接 API (已升级到 Supabase)
app.post('/api/shorten', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: '缺少url参数' });
  }

  try {
    // 1. 检查长链接是否已存在
    let { data: existing, error: findError } = await supabase
      .from('links')
      .select('code')
      .eq('original_url', url)
      .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = 'not found'
      throw findError;
    }

    if (existing) {
      return res.json({ short: `${req.protocol}://${req.get('host')}/${existing.code}` });
    }

    // 2. 如果不存在，创建新的短链接
    const code = nanoid(6);
    const { error: insertError } = await supabase
      .from('links')
      .insert({ code: code, original_url: url });

    if (insertError) {
      throw insertError;
    }

    res.json({ short: `${req.protocol}://${req.get('host')}/${code}` });

  } catch (error) {
    console.error('API /api/shorten 错误:', error);
    res.status(500).json({ error: '数据库操作失败' });
  }
});

// 访问短链，展示中转页 (逻辑不变)
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  const { data, error } = await supabase
    .from('links')
    .select('original_url')
    .eq('code', code)
    .single();

  if (error || !data) {
    return res.status(404).send('短链接不存在或已失效');
  }
  // 渲染中转页
  res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
});

// 获取原始链接API (已升级到 Supabase)
app.get('/api/original/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const { data, error } = await supabase
      .from('links')
      .select('original_url')
      .eq('code', code)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: '短链接不存在' });
    }

    res.json({ url: data.original_url });

  } catch (error) {
    console.error('API /api/original/:code 错误:', error);
    res.status(500).json({ error: '数据库查询失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务已启动：http://localhost:${PORT}`);
}); 