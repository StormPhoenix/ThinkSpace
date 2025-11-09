const express = require('express');
const path = require('path');
const connectDB = require('./config/database');
const Category = require('./models/Category');
const Card = require('./models/Card');

const app = express();
const PORT = 3000;

// 连接数据库
connectDB();

// 静态文件服务
app.use(express.static('public'));
app.use(express.json());

// API: 获取所有分类
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// API: 创建新分类
app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const newCategory = new Category({
      name: name || '未命名分类'
    });
    await newCategory.save();
    res.json(newCategory);
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
});

// API: 删除分类
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // 删除分类
    await Category.findByIdAndDelete(id);
    // 删除该分类下的所有卡片
    await Card.deleteMany({ categoryId: id });
    res.json({ success: true });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({ error: '删除分类失败' });
  }
});

// API: 获取所有卡片
app.get('/api/cards', async (req, res) => {
  try {
    const cards = await Card.find().sort({ createdAt: -1 });
    res.json(cards);
  } catch (error) {
    console.error('获取卡片失败:', error);
    res.status(500).json({ error: '获取卡片失败' });
  }
});

// API: 创建新卡片
app.post('/api/cards', async (req, res) => {
  try {
    const { title, type, categoryId, stockCode, attributes } = req.body;
    console.log('创建卡片请求:', { title, type, stockCode, categoryId });
    
    const newCard = new Card({
      title: title || '未命名卡片',
      type: type || 'custom',
      attributes: attributes || {},
      stockCode: (type === 'stock' && stockCode) ? stockCode : null,
      categoryId: categoryId || null
    });
    
    await newCard.save();
    console.log('创建的新卡片:', newCard);
    res.json(newCard);
  } catch (error) {
    console.error('创建卡片失败:', error);
    res.status(500).json({ error: '创建卡片失败' });
  }
});

// API: 更新卡片（包括移动分类）
app.put('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, attributes, categoryId, type, stockCode } = req.body;
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (attributes !== undefined) updateData.attributes = attributes;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (type !== undefined) updateData.type = type;
    if (stockCode !== undefined) updateData.stockCode = stockCode;
    
    const updatedCard = await Card.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedCard) {
      return res.status(404).json({ error: '卡片不存在' });
    }
    
    res.json(updatedCard);
  } catch (error) {
    console.error('更新卡片失败:', error);
    res.status(500).json({ error: '更新卡片失败' });
  }
});

// API: 删除卡片
app.delete('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCard = await Card.findByIdAndDelete(id);
    
    if (!deletedCard) {
      return res.status(404).json({ error: '卡片不存在' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除卡片失败:', error);
    res.status(500).json({ error: '删除卡片失败' });
  }
});

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 股票数据爬取 API（参考 stock-trading-ai）
const puppeteer = require('puppeteer');

// 等待函数
const waitForTimeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 获取股票分时图数据
app.get('/api/stock/fenshi/:code', async (req, res) => {
  let code = decodeURIComponent(req.params.code || 'SH601606');
  
  // 确保代码格式正确（大写）
  if (code.startsWith('sh') || code.startsWith('sz')) {
    code = code.toUpperCase();
  }
  
  console.log('开始获取股票数据，代码:', code);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  try {
    let stockData = null;
    let responseReceived = false;

    // 监听网络响应，捕获分时图数据
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('https://push2his.eastmoney.com/api/qt/stock/trends2/get')) {
        try {
          const str = await response.text();
          if (str && str.trim()) {
            const jsonData = JSON.parse(
              str.substring(str.indexOf('{'), str.lastIndexOf('}') + 1)
            );
            console.log(`获取到股票分时图数据:`, jsonData);
            if (jsonData && jsonData.data) {
              stockData = jsonData;
              responseReceived = true;
            }
          }
        } catch (error) {
          console.error('解析响应数据时出错:', error);
        }
      }
    });

    // 访问股票分时图页面
    const url = `https://quote.eastmoney.com/concept/${code}.html#fullScreenChart`;
    console.log('访问URL:', url);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // 等待数据加载，最多等待10秒
    let waitCount = 0;
    while (!responseReceived && waitCount < 20) {
      await waitForTimeout(500);
      waitCount++;
    }

    await browser.close();

    if (stockData && stockData.data) {
      console.log('成功获取股票数据');
      return res.json({
        success: true,
        data: stockData.data,
        message: '股票分时图数据获取成功',
      });
    } else {
      console.log('未能获取到股票数据');
      return res.status(404).json({
        success: false,
        data: null,
        message: '未能获取到股票分时图数据，请检查股票代码是否正确',
      });
    }
  } catch (error) {
    console.error('获取股票分时图数据时出错:', error);
    try {
      await browser.close();
    } catch (e) {
      // 忽略关闭错误
    }
    return res.status(500).json({
      success: false,
      data: null,
      message: '获取股票分时图数据时出错',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`ThinkSpace 服务器运行在 http://localhost:${PORT}`);
  console.log('请在浏览器中打开上述地址');
});

