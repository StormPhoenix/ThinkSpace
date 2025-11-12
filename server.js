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

  let stockData = null;
  let responseReceived = false;

  try {
    // 监听网络响应，捕获分时图数据（必须在 page.goto 之前设置）
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
    // 使用 'domcontentloaded' 而不是 'networkidle0'，避免因网络活动导致超时
    const url = `https://quote.eastmoney.com/concept/${code}.html#fullScreenChart`;
    console.log('访问URL:', url);
    
    try {
      // 使用更宽松的等待策略，避免超时
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      });
      console.log('页面加载完成，等待数据响应...');
    } catch (gotoError) {
      // 如果 page.goto 超时，记录错误但继续执行等待逻辑
      console.warn('页面加载超时或出错，但继续等待数据响应:', gotoError.message);
      // 不直接抛出错误，让后续的等待逻辑继续执行
    }

    // 等待数据加载，最多等待10秒（20次 * 500ms）
    let waitCount = 0;
    const maxWaitCount = 20;
    console.log('开始等待数据响应...');
    
    while (!responseReceived && waitCount < maxWaitCount) {
      await waitForTimeout(500);
      waitCount++;
      if (waitCount % 4 === 0) {
        console.log(`等待中... (${waitCount * 500}ms / ${maxWaitCount * 500}ms)`);
      }
    }
  } catch (error) {
    // 捕获除 page.goto 超时外的其他错误
    console.error('获取股票分时图数据时出错:', error);
  } finally {
    // 确保浏览器总是被关闭
    try {
      await browser.close();
      console.log('浏览器已关闭');
    } catch (closeError) {
      console.error('关闭浏览器时出错:', closeError);
    }
  }

  // 在 finally 之后处理响应，确保浏览器已关闭
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
});

// 获取股票K线数据（日K、周K、月K）
app.get('/api/stock/kline/:code', async (req, res) => {
  let code = decodeURIComponent(req.params.code || 'SH601606');
  const period = req.query.period || 'day'; // day, week, month
  
  // 确保代码格式正确（大写）
  if (code.startsWith('sh') || code.startsWith('sz')) {
    code = code.toUpperCase();
  }
  
  // 提取纯数字代码
  let pureCode = code.replace(/^(SH|SZ)/, '');
  
  // 判断市场：6开头是上海(1)，其他是深圳(0)
  const marketCode = pureCode.startsWith('6') ? 1 : 0;
  const secid = `${marketCode}.${pureCode}`;
  
  // K线类型：101=日K, 102=周K, 103=月K
  const kltMap = {
    'day': '101',
    'week': '102',
    'month': '103'
  };
  const klt = kltMap[period] || '101';
  
  console.log('开始获取股票K线数据，代码:', code, '周期:', period);
  
  try {
    // 构建请求URL
    const url = new URL('https://push2his.eastmoney.com/api/qt/stock/kline/get');
    url.searchParams.set('secid', secid);
    url.searchParams.set('fields1', 'f1,f2,f3,f4,f5,f6');
    url.searchParams.set('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61');
    url.searchParams.set('klt', klt);
    url.searchParams.set('fqt', '1'); // 前复权
    url.searchParams.set('end', new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    url.searchParams.set('lmt', '210');
    
    console.log('请求URL:', url.toString());
    
    // 发送请求
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const jsonData = await response.json();
    
    if (!jsonData || !jsonData.data || !jsonData.data.klines) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '未能获取到K线数据',
      });
    }
    
    // 解析K线数据：每个字符串格式为 "date,open,close,high,low,volume,volume_money,zf,zdf,zde,hsl"
    const klines = jsonData.data.klines.map(line => {
      const parts = line.split(',');
      return {
        date: parts[0],
        open: parseFloat(parts[1]) || 0,
        close: parseFloat(parts[2]) || 0,
        high: parseFloat(parts[3]) || 0,
        low: parseFloat(parts[4]) || 0,
        volume: parseFloat(parts[5]) || 0,
        volume_money: parseFloat(parts[6]) || 0,
        zf: parseFloat(parts[7]) || 0,      // 振幅
        zdf: parseFloat(parts[8]) || 0,     // 涨跌幅
        zde: parseFloat(parts[9]) || 0,     // 涨跌额
        hsl: parseFloat(parts[10]) || 0     // 换手率
      };
    });
    
    console.log(`成功获取K线数据，共 ${klines.length} 条`);
    
    return res.json({
      success: true,
      data: {
        code: jsonData.data.code || code,
        name: jsonData.data.name || '',
        klines: klines,
        period: period
      },
      message: '股票K线数据获取成功',
    });
  } catch (error) {
    console.error('获取股票K线数据时出错:', error);
    return res.status(500).json({
      success: false,
      data: null,
      message: '获取股票K线数据时出错',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`ThinkSpace 服务器运行在 http://localhost:${PORT}`);
  console.log('请在浏览器中打开上述地址');
});

