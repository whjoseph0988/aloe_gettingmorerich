import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  Wallet, TrendingUp, DollarSign, Calendar, PlusCircle, 
  Trash2, History, ArrowUpRight, ArrowDownRight, Users,
  Save, Search, Edit, X
} from 'lucide-react';

// --- Constants & Helpers ---

const ASSET_LABELS = {
  tw_stock: '台股',
  us_stock: '美股',
  tw_cash: '台幣現金',
  us_cash: '美元現金',
};

const COLORS = {
  tw_stock: '#8884d8',
  us_stock: '#82ca9d',
  tw_cash: '#ffc658',
  us_cash: '#ff8042',
};

const PERIODS = [
  { label: '1個月', value: '1m' },
  { label: '3個月', value: '3m' },
  { label: '6個月', value: '6m' },
  { label: '1年', value: '1y' },
  { label: '3年', value: '3y' },
  { label: '全部', value: 'all' },
];

const YEARS = ['2024', '2025', '2026', '2027'];

const generateId = () => Math.random().toString(36).substr(2, 9);

// 格式化金額
const formatCurrency = (val) => 
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(val);

// --- Main Component ---

export default function InvestmentTracker() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // 初始範例資料 (根據使用者需求更新)
  const [assets, setAssets] = useState(() => {
    const saved = localStorage.getItem('inv_assets');
    // 如果沒有存檔，使用使用者指定的新預設資料
    if (!saved) {
      return [
        // 2025-01-05 資料
        { id: '1', date: '2025-01-05', type: 'us_stock', amount: 78130, exchangeRate: 32.5, note: '初始記錄 (匯率預設32.5)' },
        { id: '2', date: '2025-01-05', type: 'tw_stock', amount: 107947, exchangeRate: 1, note: '初始記錄' },
        // 2026-01-05 資料
        { id: '3', date: '2026-01-05', type: 'us_stock', amount: 94937, exchangeRate: 32.5, note: '年度更新 (匯率預設32.5)' },
        { id: '4', date: '2026-01-05', type: 'tw_stock', amount: 147107, exchangeRate: 1, note: '年度更新' },
      ];
    }
    return JSON.parse(saved);
  });

  const [contributions, setContributions] = useState(() => {
    const saved = localStorage.getItem('inv_contributions');
    // 如果沒有存檔，使用使用者指定的新預設資料
    if (!saved) {
      return [
        { id: '1', person: 'A_Hui', date: '2026-12-31', amount: 350000 },
      ];
    }
    return JSON.parse(saved);
  });

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('inv_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('inv_contributions', JSON.stringify(contributions));
  }, [contributions]);

  // --- Dashboard Logic: Current Status ---
  
  // 取得每個類別"最新"的一筆記錄
  const currentStatus = useMemo(() => {
    const status = { tw_stock: 0, us_stock: 0, tw_cash: 0, us_cash: 0 };
    
    // 對每個類別，找到日期最新的一筆
    Object.keys(ASSET_LABELS).forEach(type => {
      const recordsOfType = assets.filter(a => a.type === type);
      if (recordsOfType.length > 0) {
        // 排序：日期新 -> 舊
        recordsOfType.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latest = recordsOfType[0];
        status[type] = latest.amount * latest.exchangeRate; // 轉台幣
      }
    });
    return status;
  }, [assets]);

  const totalAssetsTwd = Object.values(currentStatus).reduce((a, b) => a + b, 0);

  const pieData = [
    { name: '台股', value: currentStatus.tw_stock, type: 'tw_stock' },
    { name: '美股', value: currentStatus.us_stock, type: 'us_stock' },
    { name: '台幣現金', value: currentStatus.tw_cash, type: 'tw_cash' },
    { name: '美元現金', value: currentStatus.us_cash, type: 'us_cash' },
  ].filter(d => d.value > 0);

  // --- Dashboard Logic: Timeline & Growth ---

  const [chartPeriod, setChartPeriod] = useState('all');
  const [chartMode, setChartMode] = useState('total'); // 總資產 or 投資部位(股)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // 建立歷史曲線數據 (Fill-Forward Logic)
  const timelineData = useMemo(() => {
    if (assets.length === 0) return [];

    // 1. 收集所有獨特的日期點
    const uniqueDates = Array.from(new Set(assets.map(a => a.date))).sort();
    
    const dataPoints = uniqueDates.map(date => {
      const currentMoment = new Date(date).getTime();
      
      let twStockVal = 0;
      let usStockVal = 0;
      let twCashVal = 0;
      let usCashVal = 0;

      // 對於每個類別，找到 <= currentMoment 的最新一筆
      ['tw_stock', 'us_stock', 'tw_cash', 'us_cash'].forEach(type => {
        const relevantRecords = assets.filter(a => a.type === type && new Date(a.date).getTime() <= currentMoment);
        if (relevantRecords.length > 0) {
          relevantRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const latest = relevantRecords[0];
          const val = latest.amount * latest.exchangeRate;
          if (type === 'tw_stock') twStockVal = val;
          if (type === 'us_stock') usStockVal = val;
          if (type === 'tw_cash') twCashVal = val;
          if (type === 'us_cash') usCashVal = val;
        }
      });

      return {
        date,
        total: twStockVal + usStockVal + twCashVal + usCashVal,
        investment: twStockVal + usStockVal,
        us_inv: usStockVal,
        tw_inv: twStockVal
      };
    });

    return dataPoints;
  }, [assets]);

  // Filter timeline based on period
  const filteredTimeline = useMemo(() => {
    if (chartPeriod === 'all') return timelineData;
    
    const now = new Date();
    let cutoffDate = new Date();
    
    if (chartPeriod === '1m') cutoffDate.setMonth(now.getMonth() - 1);
    if (chartPeriod === '3m') cutoffDate.setMonth(now.getMonth() - 3);
    if (chartPeriod === '6m') cutoffDate.setMonth(now.getMonth() - 6);
    if (chartPeriod === '1y') cutoffDate.setFullYear(now.getFullYear() - 1);
    if (chartPeriod === '3y') cutoffDate.setFullYear(now.getFullYear() - 3);

    return timelineData.filter(d => new Date(d.date) >= cutoffDate);
  }, [timelineData, chartPeriod]);

  // Growth Calculation (Trailing Periods)
  const calculateTrailingGrowth = (months, mode) => {
    if (timelineData.length < 2) return null;
    
    const lastPoint = timelineData[timelineData.length - 1];
    const currentValue = mode === 'total' ? lastPoint.total : lastPoint.investment;
    
    const now = new Date(lastPoint.date);
    const targetDate = new Date(now);
    targetDate.setMonth(targetDate.getMonth() - months);
    
    let comparisonPoint = timelineData[0];
    let minDiff = Infinity;

    timelineData.forEach(p => {
      const pDate = new Date(p.date);
      const diff = Math.abs(pDate.getTime() - targetDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        comparisonPoint = p;
      }
    });

    const prevValue = mode === 'total' ? comparisonPoint.total : comparisonPoint.investment;
    if (prevValue === 0) return 0;
    
    return ((currentValue - prevValue) / prevValue) * 100;
  };

  // Annual Growth Calculation (Selected Year)
  const calculateAnnualGrowth = (year) => {
    if (timelineData.length === 0) return { growth: null, startVal: 0, endVal: 0 };

    // 定義該年度的範圍
    // 邏輯：比較 (該年度最後一筆紀錄) 與 (前一年度最後一筆紀錄)
    // 如果前一年度沒有紀錄，則比較 (該年度最後一筆) 與 (該年度第一筆)
    
    const pointsInYear = timelineData.filter(d => d.date.startsWith(year));
    const pointsBeforeYear = timelineData.filter(d => d.date < `${year}-01-01`);

    if (pointsInYear.length === 0) return { growth: null, startVal: 0, endVal: 0 };

    const endPoint = pointsInYear[pointsInYear.length - 1];
    const endVal = chartMode === 'total' ? endPoint.total : endPoint.investment;

    let startVal = 0;
    
    if (pointsBeforeYear.length > 0) {
        // 有前一年的資料，取前一年最後一筆當作基期
        const prevEndPoint = pointsBeforeYear[pointsBeforeYear.length - 1];
        startVal = chartMode === 'total' ? prevEndPoint.total : prevEndPoint.investment;
    } else {
        // 沒有前一年資料，取今年第一筆當作基期 (若只有一筆則無成長)
        const startPoint = pointsInYear[0];
        // 如果該年只有一筆數據，且沒有前一年數據，無法計算成長率
        if (pointsInYear.length === 1) return { growth: null, startVal: 0, endVal };
        
        startVal = chartMode === 'total' ? startPoint.total : startPoint.investment;
    }

    if (startVal === 0) return { growth: null, startVal, endVal };

    const growth = ((endVal - startVal) / startVal) * 100;
    return { growth, startVal, endVal };
  };

  const annualStats = calculateAnnualGrowth(selectedYear);

  // --- Input Forms State ---
  const [newAsset, setNewAsset] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'tw_stock',
    exchangeRate: 1,
    amount: 0,
    note: ''
  });

  // 新增編輯狀態
  const [editingAssetId, setEditingAssetId] = useState(null);

  const [newContribution, setNewContribution] = useState({
    date: new Date().toISOString().split('T')[0],
    person: 'A_Ru',
    amount: 0
  });

  // --- Handlers ---

  // 修改後的儲存/更新邏輯
  const handleSaveAsset = () => {
    if (!newAsset.amount || !newAsset.date) return;

    if (editingAssetId) {
      // 更新現有記錄
      setAssets(assets.map(a => a.id === editingAssetId ? {
        ...a,
        date: newAsset.date,
        type: newAsset.type,
        amount: Number(newAsset.amount),
        exchangeRate: (newAsset.type === 'us_stock' || newAsset.type === 'us_cash') ? Number(newAsset.exchangeRate) : 1,
        note: newAsset.note || ''
      } : a));
      setEditingAssetId(null);
      alert('已更新資產記錄');
    } else {
      // 新增記錄
      const record = {
        id: generateId(),
        date: newAsset.date,
        type: newAsset.type,
        amount: Number(newAsset.amount),
        exchangeRate: (newAsset.type === 'us_stock' || newAsset.type === 'us_cash') ? Number(newAsset.exchangeRate) : 1,
        note: newAsset.note || ''
      };
      setAssets([...assets, record]);
      alert('已新增資產記錄');
    }
    
    // 重置表單
    setNewAsset({ 
      date: new Date().toISOString().split('T')[0],
      type: 'tw_stock',
      exchangeRate: 1,
      amount: 0,
      note: '' 
    });
  };

  const handleEditAsset = (record) => {
    setEditingAssetId(record.id);
    setNewAsset({
      date: record.date,
      type: record.type,
      amount: record.amount,
      exchangeRate: record.exchangeRate,
      note: record.note
    });
    // 視窗捲動到頂部方便編輯
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingAssetId(null);
    setNewAsset({ 
      date: new Date().toISOString().split('T')[0],
      type: 'tw_stock',
      exchangeRate: 1,
      amount: 0,
      note: '' 
    });
  };

  const handleAddContribution = () => {
    if (!newContribution.amount || !newContribution.date) return;
    const record = {
      id: generateId(),
      person: newContribution.person,
      date: newContribution.date,
      amount: Number(newContribution.amount)
    };
    setContributions([...contributions, record]);
    setNewContribution({ ...newContribution, amount: 0 });
    alert('已新增投入記錄');
  };

  const handleDeleteAsset = (id) => {
    if (confirm('確定刪除此筆記錄？')) {
      // 如果正在編輯這筆，取消編輯狀態
      if (editingAssetId === id) {
        handleCancelEdit();
      }
      setAssets(assets.filter(a => a.id !== id));
    }
  };

  const handleDeleteContribution = (id) => {
    if (confirm('確定刪除此筆記錄？')) {
      setContributions(contributions.filter(c => c.id !== id));
    }
  };

  // --- Render Views ---

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 總覽卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium mb-1">目前總資產 (TWD)</h3>
          <div className="text-3xl font-bold text-slate-800">{formatCurrency(totalAssetsTwd)}</div>
          <div className="text-xs text-slate-400 mt-2">根據最新一筆記錄計算</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium mb-1">阿慧總投入</h3>
          <div className="text-2xl font-bold text-pink-600">
            {formatCurrency(contributions.filter(c => c.person === 'A_Hui').reduce((sum, c) => sum + c.amount, 0))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium mb-1">阿儒總投入</h3>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(contributions.filter(c => c.person === 'A_Ru').reduce((sum, c) => sum + c.amount, 0))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 圓餅圖 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5" /> 資產分佈
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.type]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 曲線圖與成長率 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          {/* Chart Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setChartMode('total')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${chartMode === 'total' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                總資產
              </button>
              <button 
                onClick={() => setChartMode('investment')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${chartMode === 'investment' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                投資部位 (股)
              </button>
            </div>
            
            <div className="flex items-center gap-2">
               <span className="text-sm text-slate-500">區間:</span>
               <select 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5"
                value={chartPeriod}
                onChange={(e) => setChartPeriod(e.target.value)}
              >
                {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          
          {/* 年度成長顯示區塊 */}
          <div className="mb-4 bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-blue-500"/>
              <span className="text-sm font-medium text-blue-900">年度績效查詢：</span>
              <select 
                  className="bg-white border border-blue-200 text-blue-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-1"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}年度</option>)}
              </select>
            </div>
            <div className="text-right">
              {annualStats.growth !== null ? (
                <div className="flex items-center gap-2">
                   <span className={`text-lg font-bold ${annualStats.growth >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {annualStats.growth > 0 ? '+' : ''}{annualStats.growth.toFixed(2)}%
                   </span>
                   <span className="text-xs text-slate-500 hidden sm:inline">
                     ({formatCurrency(annualStats.startVal)} → {formatCurrency(annualStats.endVal)})
                   </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">該年度資料不足</span>
              )}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(tick) => tick.substring(5)} />
                <YAxis width={80} tick={{fontSize: 12}} tickFormatter={(val) => `${(val/10000).toFixed(0)}萬`} />
                <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                {chartMode === 'total' ? (
                  <Line type="monotone" dataKey="total" name="總資產" stroke="#0f172a" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                ) : (
                  <>
                    <Line type="monotone" dataKey="investment" name="總投資" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="us_inv" name="美股" stroke="#82ca9d" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="tw_inv" name="台股" stroke="#ffc658" strokeDasharray="5 5" />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 短期成長指標 */}
          <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
            {[1, 3, 6, 12, 36].map(months => {
               const growth = calculateTrailingGrowth(months, chartMode);
               if (growth === null) return null;
               return (
                 <div key={months} className="bg-slate-50 p-2 rounded-lg">
                   <div className="text-xs text-slate-500 mb-1">
                     {months === 12 ? '近1年' : months === 36 ? '近3年' : `近${months}月`}
                   </div>
                   <div className={`text-sm font-bold flex justify-center items-center gap-1 ${growth >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                     {growth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                     {Math.abs(growth).toFixed(1)}%
                   </div>
                 </div>
               );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAssets = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* 輸入表單 */}
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit sticky top-24">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          {editingAssetId ? <Edit className="w-5 h-5 text-orange-500" /> : <PlusCircle className="w-5 h-5 text-blue-600" />}
          {editingAssetId ? '編輯資產記錄' : '新增資產快照'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">記錄日期</label>
            <input 
              type="date" 
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              value={newAsset.date}
              onChange={e => setNewAsset({...newAsset, date: e.target.value})}
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">類別</label>
            <select 
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              value={newAsset.type}
              onChange={e => setNewAsset({...newAsset, type: e.target.value})}
            >
              {Object.entries(ASSET_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">金額 (原幣)</label>
            <input 
              type="number" 
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="0"
              value={newAsset.amount || ''}
              onChange={e => setNewAsset({...newAsset, amount: Number(e.target.value)})}
            />
          </div>
          {(newAsset.type === 'us_stock' || newAsset.type === 'us_cash') && (
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">匯率 (USD/TWD)</label>
              <input 
                type="number" 
                className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                placeholder="32.5"
                value={newAsset.exchangeRate || ''}
                onChange={e => setNewAsset({...newAsset, exchangeRate: Number(e.target.value)})}
              />
            </div>
          )}
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">備註 (選填)</label>
            <textarea 
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              placeholder="例如：賣出台積電..."
              rows={3}
              value={newAsset.note}
              onChange={e => setNewAsset({...newAsset, note: e.target.value})}
            />
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleSaveAsset}
              className={`flex-1 text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center flex items-center justify-center gap-2 ${editingAssetId ? 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-300' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300 focus:ring-4'}`}
            >
              <Save size={16} /> {editingAssetId ? '更新記錄' : '儲存記錄'}
            </button>
            {editingAssetId && (
              <button 
                onClick={handleCancelEdit}
                className="text-slate-700 bg-slate-200 hover:bg-slate-300 focus:ring-4 focus:ring-slate-100 font-medium rounded-lg text-sm px-4 py-2.5 flex items-center justify-center"
              >
                <X size={16} /> 取消
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 記錄列表 */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" /> 歷史記錄
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">日期</th>
                <th className="px-4 py-3 whitespace-nowrap">類別</th>
                <th className="px-4 py-3 whitespace-nowrap">金額(原幣)</th>
                <th className="px-4 py-3 whitespace-nowrap">台幣現值</th>
                <th className="px-4 py-3 w-1/3 min-w-[200px]">備註</th>
                <th className="px-4 py-3 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {assets.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
                <tr key={record.id} className={`border-b hover:bg-slate-50 ${editingAssetId === record.id ? 'bg-orange-50' : 'bg-white'}`}>
                  <td className="px-4 py-4 whitespace-nowrap">{record.date}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs text-white bg-opacity-80`} style={{backgroundColor: COLORS[record.type]}}>
                      {ASSET_LABELS[record.type]}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {record.type.includes('us') ? '$' : 'NT$'} {record.amount.toLocaleString()}
                    {record.type.includes('us') && <div className="text-xs text-slate-400">@{record.exchangeRate}</div>}
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap">
                    {formatCurrency(record.amount * record.exchangeRate)}
                  </td>
                  <td className="px-4 py-4 text-slate-500 break-words">
                    {record.note}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditAsset(record)} className="text-blue-500 hover:text-blue-700" title="編輯">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteAsset(record.id)} className="text-red-500 hover:text-red-700" title="刪除">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assets.length === 0 && <div className="p-8 text-center text-slate-400">目前沒有記錄</div>}
        </div>
      </div>
    </div>
  );

  const renderContributions = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" /> 新增投入資金
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">記錄日期</label>
            <input 
              type="date" 
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
              value={newContribution.date}
              onChange={e => setNewContribution({...newContribution, date: e.target.value})}
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">投入者</label>
            <select 
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
              value={newContribution.person}
              onChange={e => setNewContribution({...newContribution, person: e.target.value})}
            >
              <option value="A_Ru">阿儒</option>
              <option value="A_Hui">阿慧</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">投入金額 (TWD)</label>
            <input 
              type="number" 
              className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
              placeholder="0"
              value={newContribution.amount || ''}
              onChange={e => setNewContribution({...newContribution, amount: Number(e.target.value)})}
            />
          </div>
          <button 
            onClick={handleAddContribution}
            className="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center flex items-center justify-center gap-2"
          >
            <Save size={16} /> 儲存記錄
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" /> 投入明細
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">日期</th>
                <th className="px-6 py-3">投入者</th>
                <th className="px-6 py-3">金額</th>
                <th className="px-6 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {contributions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
                <tr key={record.id} className="bg-white border-b hover:bg-slate-50">
                  <td className="px-6 py-4">{record.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${record.person === 'A_Hui' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                      {record.person === 'A_Hui' ? '阿慧' : '阿儒'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold">{formatCurrency(record.amount)}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDeleteContribution(record.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contributions.length === 0 && <div className="p-8 text-center text-slate-400">目前沒有投入記錄</div>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Wallet size={20} />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                阿儒 & 阿慧 投資筆記本
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 bg-slate-200 p-1 rounded-xl w-fit mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp size={16} /> 總覽儀表板
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'assets' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign size={16} /> 資產記錄
          </button>
          <button
            onClick={() => setActiveTab('contributions')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'contributions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={16} /> 投入資金
          </button>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'assets' && renderAssets()}
        {activeTab === 'contributions' && renderContributions()}
      </div>
    </div>
  );
}
