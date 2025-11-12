const { createApp } = Vue;

// 卡片组件
const CardComponent = {
    props: ['card'],
    emits: ['delete', 'click'],
    template: `
        <div 
            class="card" 
            draggable="true"
            @dragstart="handleDragStart"
            @dragend="handleDragEnd"
            @click.stop="$emit('click', card)"
        >
            <div class="card-title">{{ card.title }}</div>
            <button 
                class="card-delete" 
                @click.stop="$emit('delete', card.id)"
                title="删除卡片"
            >×</button>
        </div>
    `,
    methods: {
        handleDragStart(e) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.card.id);
            e.currentTarget.classList.add('dragging');
        },
        handleDragEnd(e) {
            e.currentTarget.classList.remove('dragging');
        }
    }
};

// 分类区块组件
const CategoryBlock = {
    components: {
        CardComponent
    },
    props: ['category', 'cards'],
    emits: ['delete', 'move-card', 'delete-card', 'refresh-waterfall'],
    data() {
        return {
            dragOver: false,
            columnCount: 1,
            resizeObserver: null
        };
    },
    mounted() {
        this.updateColumns();
        // 监听容器尺寸变化
        if (window.ResizeObserver && this.$refs.categoryBlock) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateColumns();
            });
            this.resizeObserver.observe(this.$refs.categoryBlock);
        }
        // 通知父组件刷新瀑布流
        this.$nextTick(() => {
            setTimeout(() => {
                this.notifyWaterfallRefresh();
            }, 200);
        });
    },
    updated() {
        this.updateColumns();
        // 内容更新后刷新瀑布流
        this.$nextTick(() => {
            setTimeout(() => {
                this.notifyWaterfallRefresh();
            }, 200);
        });
    },
    beforeUnmount() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    },
    template: `
        <div 
            class="category-block"
            ref="categoryBlock"
        >
            <div class="category-header">
                <span class="category-title">{{ category.name }}</span>
                <button 
                    class="category-delete" 
                    @click="$emit('delete', category.id)"
                    title="删除分类"
                >×</button>
            </div>
            <div 
                class="cards-container"
                :class="{ 
                    'drag-over': dragOver,
                    'columns-2': columnCount === 2,
                    'columns-3': columnCount === 3
                }"
                @dragover.prevent="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleDrop"
                ref="cardsContainer"
            >
                <div v-if="cards.length === 0" class="empty-state">
                    拖拽卡片到这里或创建新卡片
                </div>
                <card-component
                    v-for="card in cards"
                    :key="card.id"
                    :card="card"
                    @delete="$emit('delete-card', card.id)"
                    @click="$emit('show-card-detail', card)"
                />
            </div>
        </div>
    `,
    methods: {
        handleDragOver(e) {
            e.dataTransfer.dropEffect = 'move';
            this.dragOver = true;
        },
        handleDragLeave() {
            this.dragOver = false;
        },
        handleDrop(e) {
            e.preventDefault();
            this.dragOver = false;
            const cardId = e.dataTransfer.getData('text/plain');
            if (cardId) {
                this.$emit('move-card', cardId, this.category.id);
            }
        },
        notifyWaterfallRefresh() {
            // 通过事件通知父组件刷新瀑布流
            this.$emit('refresh-waterfall');
        },
        updateColumns() {
            this.$nextTick(() => {
                if (!this.$refs.categoryBlock) return;
                const containerWidth = this.$refs.categoryBlock.offsetWidth;
                // 根据容器宽度计算列数
                // 每列最小宽度约 80px，加上 gap 10px
                const minColumnWidth = 90;
                const maxColumns = Math.min(3, Math.floor(containerWidth / minColumnWidth));
                this.columnCount = Math.max(1, maxColumns);
            });
        }
    }
};

// 主应用
createApp({
    components: {
        CategoryBlock,
        CardComponent,
        Waterfall
    },
    data() {
        return {
            categories: [],
            cards: [],
            showCategoryModal: false,
            showCardModal: false,
            selectedCard: null,
            sidebarDragOver: false,
            newCategoryName: '',
            newCard: {
                title: '',
                type: 'custom',
                categoryId: '',
                stockCode: '',
                attributes: []
            },
            // 股票相关
            stockData: null,
            loadingStockData: false,
            chartType: 'fenshi',
            // K线数据（日K、周K、月K）
            dailyKData: null,
            weekKData: null,
            monthKData: null,
            loadingKlineData: false,
            // K线数据缓存（按股票代码和周期缓存）
            klineDataCache: {},
            // ECharts 实例
            klineChart: null,
            // 编辑相关
            isEditingCard: false,
            editingCard: null
        };
    },
    computed: {
        // 未分类的卡片
        unclassifiedCards() {
            return this.cards.filter(card => !card.categoryId);
        },
        // 为瀑布流准备的数据格式
        categoriesWithCards() {
            return this.categories.map(category => ({
                category: category,
                cards: this.getCardsByCategory(category.id)
            }));
        }
    },
    mounted() {
        this.loadData();
    },
    methods: {
        // 加载数据
        async loadData() {
            try {
                const [categoriesRes, cardsRes] = await Promise.all([
                    fetch('/api/categories'),
                    fetch('/api/cards')
                ]);
                this.categories = await categoriesRes.json();
                const loadedCards = await cardsRes.json();
                
                // 为旧数据添加默认 type 字段（兼容性处理）
                this.cards = loadedCards.map(card => {
                    if (!card.type) {
                        // 如果有 stockCode，则认为是股票类型
                        card.type = card.stockCode ? 'stock' : 'custom';
                    }
                    // 确保 stockCode 字段存在（即使是 null）
                    if (!('stockCode' in card)) {
                        card.stockCode = null;
                    }
                    console.log('加载卡片数据:', card.id, 'type:', card.type, 'stockCode:', card.stockCode);
                    return card;
                });
                
                // 数据加载完成后刷新瀑布流
                this.$nextTick(() => {
                    this.refreshWaterfall();
                });
            } catch (error) {
                console.error('加载数据失败:', error);
                alert('加载数据失败，请刷新页面重试');
            }
        },

        // 获取指定分类下的卡片
        getCardsByCategory(categoryId) {
            return this.cards.filter(card => card.categoryId === categoryId);
        },

        // 刷新瀑布流布局
        refreshWaterfall() {
            this.$nextTick(() => {
                setTimeout(() => {
                    if (this.$refs.waterfall && this.$refs.waterfall.refresh) {
                        this.$refs.waterfall.refresh();
                    }
                }, 100);
            });
        },

        // 打开新建卡片模态框
        openCardModal() {
            this.newCard = {
                title: '',
                type: 'custom',
                categoryId: '',
                stockCode: '',
                attributes: []
            };
            this.showCardModal = true;
        },

        // 卡片类型改变
        onCardTypeChange() {
            if (this.newCard.type === 'stock') {
                this.newCard.attributes = [];
            }
        },

        // 创建分类
        async handleCreateCategory() {
            if (!this.newCategoryName.trim()) {
                return;
            }
            try {
                const response = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: this.newCategoryName.trim() })
                });
                const newCategory = await response.json();
                this.categories.push(newCategory);
                this.newCategoryName = '';
                this.showCategoryModal = false;
                this.refreshWaterfall();
            } catch (error) {
                console.error('创建分类失败:', error);
                alert('创建分类失败，请重试');
            }
        },

        // 删除分类
        async handleDeleteCategory(id) {
            if (!confirm('确定要删除这个分类吗？该分类下的所有卡片也将被删除。')) {
                return;
            }
            try {
                await fetch(`/api/categories/${id}`, { method: 'DELETE' });
                this.categories = this.categories.filter(cat => cat.id !== id);
                this.cards = this.cards.filter(card => card.categoryId !== id);
                this.refreshWaterfall();
            } catch (error) {
                console.error('删除分类失败:', error);
                alert('删除分类失败，请重试');
            }
        },

        // 添加属性输入框
        addAttribute() {
            this.newCard.attributes.push({ key: '', value: '' });
        },

        // 删除属性输入框
        removeAttribute(index) {
            this.newCard.attributes.splice(index, 1);
        },

        // 创建卡片
        async handleCreateCard() {
            if (!this.newCard.title.trim()) {
                return;
            }
            if (this.newCard.type === 'stock' && !this.newCard.stockCode.trim()) {
                alert('股票类型卡片需要输入股票代码');
                return;
            }
            try {
                // 处理股票代码格式（保存时使用原始格式，加载时会自动转换）
                let stockCode = this.newCard.stockCode?.trim();
                if (this.newCard.type === 'stock' && stockCode) {
                    // 如果只输入了数字，根据开头判断市场（保存为小写，加载时会转换为大写）
                    if (/^\d{6}$/.test(stockCode)) {
                        if (stockCode.startsWith('6')) {
                            stockCode = 'SH' + stockCode;
                        } else if (stockCode.startsWith('0') || stockCode.startsWith('3')) {
                            stockCode = 'SZ' + stockCode;
                        }
                    } else if (stockCode.startsWith('sh') || stockCode.startsWith('sz')) {
                        // 如果已经是小写格式，转换为大写
                        stockCode = stockCode.toUpperCase();
                    }
                }

                // 将属性数组转换为对象
                const attributes = {};
                if (this.newCard.type === 'custom') {
                    this.newCard.attributes.forEach(attr => {
                        if (attr.key.trim() && attr.value.trim()) {
                            attributes[attr.key.trim()] = attr.value.trim();
                        }
                    });
                }

                const cardData = {
                    title: this.newCard.title.trim(),
                    type: this.newCard.type,
                    categoryId: this.newCard.categoryId || null,
                    stockCode: (this.newCard.type === 'stock' && stockCode) ? stockCode : null,
                    attributes
                };
                
                console.log('创建卡片，发送数据:', cardData);
                
                const response = await fetch('/api/cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cardData)
                });
                const newCard = await response.json();
                console.log('创建卡片，服务器返回:', newCard);
                this.cards.push(newCard);
                // 重置表单
                this.newCard = {
                    title: '',
                    type: 'custom',
                    categoryId: '',
                    stockCode: '',
                    attributes: []
                };
                this.showCardModal = false;
                this.refreshWaterfall();
            } catch (error) {
                console.error('创建卡片失败:', error);
                alert('创建卡片失败，请重试');
            }
        },

        // 删除卡片
        async handleDeleteCard(id) {
            if (!confirm('确定要删除这张卡片吗？')) {
                return;
            }
            try {
                await fetch(`/api/cards/${id}`, { method: 'DELETE' });
                this.cards = this.cards.filter(card => card.id !== id);
                this.refreshWaterfall();
            } catch (error) {
                console.error('删除卡片失败:', error);
                alert('删除卡片失败，请重试');
            }
        },

        // 移动卡片
        async handleMoveCard(cardId, newCategoryId) {
            try {
                await fetch(`/api/cards/${cardId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ categoryId: newCategoryId })
                });
                const card = this.cards.find(c => c.id === cardId);
                if (card) {
                    card.categoryId = newCategoryId;
                }
                this.refreshWaterfall();
            } catch (error) {
                console.error('移动卡片失败:', error);
                alert('移动卡片失败，请重试');
            }
        },

        // 显示卡片详情
        async showCardDetail(card) {
            console.log('显示卡片详情 - 原始数据:', JSON.stringify(card, null, 2));
            console.log('卡片类型:', card.type, '股票代码:', card.stockCode);
            
            // 确保 type 字段存在（兼容旧数据）
            if (!card.type) {
                // 如果有 stockCode，则认为是股票类型
                card.type = card.stockCode ? 'stock' : 'custom';
            }
            
            // 确保 stockCode 字段存在
            if (!('stockCode' in card)) {
                card.stockCode = null;
            }
            
            console.log('处理后的卡片数据:', { type: card.type, stockCode: card.stockCode });
            
            // 创建一个新的对象，确保响应式
            this.selectedCard = { ...card };
            this.isEditingCard = false;
            this.stockData = null;
            this.chartType = 'fenshi';
            // 清空K线数据和图表实例
            this.dailyKData = null;
            this.weekKData = null;
            this.monthKData = null;
            if (this.klineChart) {
                this.klineChart.dispose();
                this.klineChart = null;
            }
            
            // 如果是股票类型，加载股票数据
            if (this.selectedCard.type === 'stock' && this.selectedCard.stockCode) {
                console.log('加载股票数据，代码:', this.selectedCard.stockCode);
                await this.loadStockData(this.selectedCard.stockCode);
            } else {
                console.log('不是股票类型或缺少股票代码', {
                    type: this.selectedCard.type,
                    stockCode: this.selectedCard.stockCode
                });
            }
        },

        // 加载股票数据
        async loadStockData(stockCode) {
            this.loadingStockData = true;
            this.stockData = null;
            try {
                // 确保股票代码格式正确（转换为大写，如 SH601606 或 SZ000001）
                let formattedCode = stockCode.trim();
                
                // 如果只输入了数字，根据开头判断市场
                if (/^\d{6}$/.test(formattedCode)) {
                    if (formattedCode.startsWith('6')) {
                        formattedCode = 'SH' + formattedCode;
                    } else if (formattedCode.startsWith('0') || formattedCode.startsWith('3')) {
                        formattedCode = 'SZ' + formattedCode;
                    }
                } else if (formattedCode.startsWith('sh') || formattedCode.startsWith('sz')) {
                    // 如果是小写，转换为大写
                    formattedCode = formattedCode.toUpperCase();
                }
                
                console.log('请求股票数据，代码:', formattedCode);
                const response = await fetch(`/api/stock/fenshi/${encodeURIComponent(formattedCode)}`);
                const result = await response.json();
                
                console.log('股票数据响应:', result);
                
                if (result.success && result.data) {
                    this.stockData = result.data;
                    this.$nextTick(() => {
                        setTimeout(() => {
                            this.drawStockChart();
                        }, 100);
                    });
                } else {
                    console.error('获取股票数据失败:', result.message || '未知错误');
                    alert('获取股票数据失败: ' + (result.message || '请检查股票代码是否正确'));
                }
            } catch (error) {
                console.error('加载股票数据失败:', error);
                alert('加载股票数据失败: ' + (error.message || '网络错误'));
            } finally {
                this.loadingStockData = false;
            }
        },

        // 绘制股票图表
        drawStockChart() {
            console.log('开始绘制图表', {
                hasRef: !!this.$refs.stockChart,
                hasData: !!this.stockData,
                hasTrends: !!(this.stockData && this.stockData.trends),
                trendsLength: this.stockData?.trends?.length
            });
            
            if (!this.$refs.stockChart) {
                console.error('Canvas ref 不存在');
                return;
            }
            
            if (!this.stockData) {
                console.error('股票数据不存在');
                return;
            }
            
            if (!this.stockData.trends || !Array.isArray(this.stockData.trends) || this.stockData.trends.length === 0) {
                console.error('分时数据不存在或为空', this.stockData);
                return;
            }

            const canvas = this.$refs.stockChart;
            if (!canvas) {
                console.error('Canvas 元素不存在');
                return;
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('无法获取 Canvas 上下文');
                return;
            }
            
            // 设置画布尺寸
            const container = this.$refs.chartContainer;
            if (container) {
                canvas.width = container.clientWidth || 800;
                canvas.height = 400;
            } else {
                canvas.width = 800;
                canvas.height = 400;
            }
            
            const width = canvas.width;
            const height = canvas.height;

            // 清空画布
            ctx.clearRect(0, 0, width, height);

            if (this.chartType === 'fenshi') {
                this.drawFenshiChart(ctx, width, height);
            } else {
                this.drawDailyChart(ctx, width, height);
            }
        },

        // 绘制分时图
        drawFenshiChart(ctx, width, height) {
            const trends = this.stockData.trends || [];
            if (trends.length === 0) return;

            const padding = 40;
            const chartWidth = width - padding * 2;
            const chartHeight = height - padding * 2;

            // 解析数据
            const data = trends.map(trend => {
                const parts = trend.split(',');
                return {
                    time: parseInt(parts[0]),
                    price: parseFloat(parts[1]),
                    volume: parseFloat(parts[2] || 0)
                };
            });

            // 计算价格范围
            const prices = data.map(d => d.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceRange = maxPrice - minPrice || 1;
            const pricePadding = priceRange * 0.1;

            // 绘制网格
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = padding + (chartHeight / 4) * i;
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(width - padding, y);
                ctx.stroke();
            }

            // 绘制价格线
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 2;
            ctx.beginPath();
            data.forEach((point, index) => {
                const x = padding + (chartWidth / (data.length - 1)) * index;
                const y = padding + chartHeight - ((point.price - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();

            // 绘制数据点
            ctx.fillStyle = '#667eea';
            data.forEach((point, index) => {
                const x = padding + (chartWidth / (data.length - 1)) * index;
                const y = padding + chartHeight - ((point.price - minPrice + pricePadding) / (priceRange + pricePadding * 2)) * chartHeight;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // 绘制价格标签
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            for (let i = 0; i <= 4; i++) {
                const price = maxPrice + pricePadding - (priceRange + pricePadding * 2) * (i / 4);
                const y = padding + (chartHeight / 4) * i;
                ctx.fillText(price.toFixed(2), padding - 10, y + 4);
            }
        },

        // 绘制日线图（简化版，实际应该获取日线数据）
        drawDailyChart(ctx, width, height) {
            ctx.fillStyle = '#999';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('日线图功能开发中...', width / 2, height / 2);
        },

        // 切换图表类型
        async switchChartType(type) {
            if (this.chartType === type) return;
            
            // 如果是K线图，先销毁旧图表
            if (this.chartType !== 'fenshi' && this.klineChart) {
                this.klineChart.dispose();
                this.klineChart = null;
            }
            
            this.chartType = type;
            
            // 如果是分时图，直接绘制（数据已存在）
            if (type === 'fenshi') {
                this.$nextTick(() => {
                    this.drawStockChart();
                });
                return;
            }
            
            // 如果是K线图，等待DOM更新后再处理
            await this.$nextTick();
            
            // 检查缓存并加载数据
            const periodMap = {
                'daily': 'day',
                'week': 'week',
                'month': 'month'
            };
            const period = periodMap[type];
            
            if (!period) return;
            
            // 检查缓存
            const cacheKey = `${this.selectedCard.stockCode}_${period}`;
            const cachedData = this.klineDataCache[cacheKey];
            
            if (cachedData) {
                console.log('使用缓存的K线数据:', cacheKey);
                // 根据周期设置对应的数据
                if (period === 'day') {
                    this.dailyKData = cachedData;
                } else if (period === 'week') {
                    this.weekKData = cachedData;
                } else if (period === 'month') {
                    this.monthKData = cachedData;
                }
                // 等待DOM更新后再绘制
                await this.$nextTick();
                setTimeout(() => {
                    this.drawKlineChart();
                }, 150);
                return;
            }
            
            // 加载数据
            await this.loadKlineData(period);
        },

        // 加载K线数据
        async loadKlineData(period) {
            if (!this.selectedCard || !this.selectedCard.stockCode) return;
            
            this.loadingKlineData = true;
            
            try {
                // 格式化股票代码
                let formattedCode = this.selectedCard.stockCode.trim();
                if (/^\d{6}$/.test(formattedCode)) {
                    if (formattedCode.startsWith('6')) {
                        formattedCode = 'SH' + formattedCode;
                    } else if (formattedCode.startsWith('0') || formattedCode.startsWith('3')) {
                        formattedCode = 'SZ' + formattedCode;
                    }
                } else if (formattedCode.startsWith('sh') || formattedCode.startsWith('sz')) {
                    formattedCode = formattedCode.toUpperCase();
                }
                
                console.log('加载K线数据，代码:', formattedCode, '周期:', period);
                
                const response = await fetch(`/api/stock/kline/${encodeURIComponent(formattedCode)}?period=${period}`);
                const result = await response.json();
                
                if (result.success && result.data && result.data.klines) {
                    // 存储数据
                    const dataKey = period === 'day' ? 'dailyKData' : 
                                   period === 'week' ? 'weekKData' : 'monthKData';
                    this[dataKey] = result.data;
                    
                    // 缓存数据
                    const cacheKey = `${this.selectedCard.stockCode}_${period}`;
                    this.klineDataCache[cacheKey] = result.data;
                    
                    console.log('K线数据加载成功，共', result.data.klines.length, '条');
                    
                    // 等待DOM更新后再绘制图表
                    await this.$nextTick();
                    setTimeout(() => {
                        this.drawKlineChart();
                    }, 150);
                } else {
                    console.error('获取K线数据失败:', result.message || '未知错误');
                    alert('获取K线数据失败: ' + (result.message || '请检查股票代码是否正确'));
                }
            } catch (error) {
                console.error('加载K线数据失败:', error);
                alert('加载K线数据失败: ' + (error.message || '网络错误'));
            } finally {
                this.loadingKlineData = false;
            }
        },

        // 使用 ECharts 绘制K线图
        drawKlineChart() {
            // 确保DOM元素已渲染，使用重试机制
            const tryDraw = (retryCount = 0) => {
                if (!this.$refs.klineChartContainer) {
                    if (retryCount < 10) {
                        // 如果DOM还没准备好，等待后重试
                        setTimeout(() => tryDraw(retryCount + 1), 50);
                        return;
                    }
                    console.error('K线图表容器不存在，重试次数已用完');
                    return;
                }
                
                // 检查容器是否有尺寸
                const container = this.$refs.klineChartContainer;
                if (container.offsetWidth === 0 || container.offsetHeight === 0) {
                    if (retryCount < 10) {
                        setTimeout(() => tryDraw(retryCount + 1), 50);
                        return;
                    }
                    console.warn('K线图表容器尺寸为0，但继续尝试绘制');
                }
                
                // 获取当前周期的数据
                let klineData = null;
                if (this.chartType === 'daily') {
                    klineData = this.dailyKData;
                } else if (this.chartType === 'week') {
                    klineData = this.weekKData;
                } else if (this.chartType === 'month') {
                    klineData = this.monthKData;
                }
                
                if (!klineData || !klineData.klines || klineData.klines.length === 0) {
                    console.error('K线数据不存在或为空');
                    return;
                }
                
                this._doDrawKlineChart(klineData);
            };
            
            tryDraw();
        },
        
        // 实际绘制K线图的方法
        _doDrawKlineChart(klineData) {
            // 销毁旧图表
            if (this.klineChart) {
                this.klineChart.dispose();
                this.klineChart = null;
            }
            
            // 确保容器存在且有尺寸
            const container = this.$refs.klineChartContainer;
            if (!container) {
                console.error('K线图表容器不存在');
                return;
            }
            
            // 创建新图表
            this.klineChart = echarts.init(container);
            
            // 确保图表容器有尺寸
            if (container.offsetWidth === 0 || container.offsetHeight === 0) {
                console.warn('图表容器尺寸为0，尝试调整');
                // 如果容器没有尺寸，设置默认尺寸
                container.style.width = container.parentElement?.clientWidth + 'px' || '800px';
                container.style.height = '400px';
            }
            
            // 准备数据
            const dates = klineData.klines.map(item => item.date);
            const values = klineData.klines.map(item => [
                item.open,
                item.close,
                item.low,
                item.high
            ]);
            const volumes = klineData.klines.map(item => item.volume);
            
            // 配置选项
            const option = {
                title: {
                    text: `${klineData.name || klineData.code} - ${this.chartType === 'daily' ? '日K' : this.chartType === 'week' ? '周K' : '月K'}`,
                    left: 0,
                    textStyle: {
                        fontSize: 14
                    }
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross'
                    },
                    formatter: function(params) {
                        const dataIndex = params[0].dataIndex;
                        const kline = klineData.klines[dataIndex];
                        return `
                            <div style="padding: 5px;">
                                <div><strong>${kline.date}</strong></div>
                                <div>开盘: ${kline.open.toFixed(2)}</div>
                                <div>收盘: ${kline.close.toFixed(2)}</div>
                                <div>最高: ${kline.high.toFixed(2)}</div>
                                <div>最低: ${kline.low.toFixed(2)}</div>
                                <div>成交量: ${(kline.volume / 10000).toFixed(2)}万</div>
                                <div>涨跌幅: ${kline.zdf > 0 ? '+' : ''}${kline.zdf.toFixed(2)}%</div>
                            </div>
                        `;
                    }
                },
                grid: [
                    {
                        left: '10%',
                        right: '8%',
                        top: '15%',
                        height: '60%'
                    },
                    {
                        left: '10%',
                        right: '8%',
                        top: '80%',
                        height: '15%'
                    }
                ],
                xAxis: [
                    {
                        type: 'category',
                        data: dates,
                        scale: true,
                        boundaryGap: false,
                        axisLine: { onZero: false },
                        splitLine: { show: false },
                        min: 'dataMin',
                        max: 'dataMax',
                        axisLabel: {
                            formatter: function(value) {
                                return value.substring(5); // 只显示月-日
                            }
                        }
                    },
                    {
                        type: 'category',
                        gridIndex: 1,
                        data: dates,
                        scale: true,
                        boundaryGap: false,
                        axisLine: { onZero: false },
                        axisTick: { show: false },
                        splitLine: { show: false },
                        min: 'dataMin',
                        max: 'dataMax',
                        axisLabel: { show: false }
                    }
                ],
                yAxis: [
                    {
                        scale: true,
                        splitArea: {
                            show: true
                        },
                        position: 'right'
                    },
                    {
                        scale: true,
                        gridIndex: 1,
                        splitNumber: 2,
                        axisLabel: { show: false },
                        axisLine: { show: false },
                        axisTick: { show: false },
                        splitLine: { show: false }
                    }
                ],
                dataZoom: [
                    {
                        type: 'inside',
                        xAxisIndex: [0, 1],
                        start: 70,
                        end: 100
                    },
                    {
                        show: true,
                        xAxisIndex: [0, 1],
                        type: 'slider',
                        top: '95%',
                        start: 70,
                        end: 100
                    }
                ],
                series: [
                    {
                        name: 'K线',
                        type: 'candlestick',
                        data: values,
                        itemStyle: {
                            color: '#ef5350',      // 上涨颜色（红色）
                            color0: '#26a69a',    // 下跌颜色（绿色）
                            borderColor: '#ef5350',
                            borderColor0: '#26a69a'
                        }
                    },
                    {
                        name: '成交量',
                        type: 'bar',
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        data: volumes.map((vol, index) => {
                            const kline = klineData.klines[index];
                            return {
                                value: vol,
                                itemStyle: {
                                    color: kline.close >= kline.open ? '#ef5350' : '#26a69a'
                                }
                            };
                        })
                    }
                ]
            };
            
            // 设置配置并渲染
            this.klineChart.setOption(option);
            
            // 确保图表正确渲染
            this.$nextTick(() => {
                if (this.klineChart) {
                    this.klineChart.resize();
                }
            });
            
            // 响应式调整（避免重复添加监听器）
            if (!this._klineChartResizeHandler) {
                this._klineChartResizeHandler = () => {
                    if (this.klineChart) {
                        this.klineChart.resize();
                    }
                };
                window.addEventListener('resize', this._klineChartResizeHandler);
            }
        },

        // 格式化股票价格
        formatStockPrice(trendStr) {
            if (!trendStr) return '--';
            const parts = trendStr.split(',');
            return parseFloat(parts[1] || 0).toFixed(2);
        },

        // 右侧边栏拖拽处理
        handleSidebarDragOver(e) {
            e.dataTransfer.dropEffect = 'move';
            this.sidebarDragOver = true;
        },

        handleSidebarDragLeave() {
            this.sidebarDragOver = false;
        },

        handleSidebarDrop(e) {
            e.preventDefault();
            this.sidebarDragOver = false;
            const cardId = e.dataTransfer.getData('text/plain');
            if (cardId) {
                // 将卡片移动到未分类（设置为 null）
                this.handleMoveCard(cardId, null);
            }
        },

        // 获取分类名称
        getCategoryName(categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            return category ? category.name : '未知分类';
        },

        // 格式化日期
        formatDate(dateString) {
            if (!dateString) return '未知';
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        // 开始编辑卡片
        startEditCard() {
            if (this.selectedCard.type !== 'custom') return;
            this.isEditingCard = true;
            this.editingCard = {
                id: this.selectedCard.id,
                title: this.selectedCard.title,
                attributes: Object.entries(this.selectedCard.attributes || {}).map(([key, value]) => ({
                    key,
                    value
                }))
            };
        },

        // 取消编辑
        cancelEditCard() {
            this.isEditingCard = false;
            this.editingCard = null;
        },

        // 添加编辑属性
        addEditAttribute() {
            this.editingCard.attributes.push({ key: '', value: '' });
        },

        // 删除编辑属性
        removeEditAttribute(index) {
            this.editingCard.attributes.splice(index, 1);
        },

        // 保存编辑
        async saveEditCard() {
            if (!this.editingCard.title.trim()) {
                alert('卡片标题不能为空');
                return;
            }
            try {
                const attributes = {};
                this.editingCard.attributes.forEach(attr => {
                    if (attr.key.trim() && attr.value.trim()) {
                        attributes[attr.key.trim()] = attr.value.trim();
                    }
                });

                const response = await fetch(`/api/cards/${this.editingCard.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: this.editingCard.title.trim(),
                        attributes
                    })
                });
                const updatedCard = await response.json();
                
                // 更新本地数据
                const cardIndex = this.cards.findIndex(c => c.id === updatedCard.id);
                if (cardIndex !== -1) {
                    this.cards[cardIndex] = updatedCard;
                    this.selectedCard = updatedCard;
                }
                
                this.isEditingCard = false;
                this.editingCard = null;
                this.refreshWaterfall();
            } catch (error) {
                console.error('保存卡片失败:', error);
                alert('保存卡片失败，请重试');
            }
        }
    },
    watch: {
        chartType(newType) {
            this.$nextTick(() => {
                if (newType === 'fenshi') {
                    this.drawStockChart();
                } else {
                    // K线图在 switchChartType 中处理
                }
            });
        }
    },
    beforeUnmount() {
        // 清理 ECharts 实例
        if (this.klineChart) {
            this.klineChart.dispose();
            this.klineChart = null;
        }
        // 清理事件监听器
        if (this._klineChartResizeHandler) {
            window.removeEventListener('resize', this._klineChartResizeHandler);
            this._klineChartResizeHandler = null;
        }
    }
}).mount('#app');
