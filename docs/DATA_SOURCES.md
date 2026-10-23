# 真實數據卡:資料來源與查證紀錄

遊戲在疾病、意外、長照、退休、詐騙、天災、股市等事件旁,會顯示一行「真實世界的台灣」,讓玩家知道這不只是遊戲設定。
數字都來自政府或公營機構公布的統計;內容放在 `src/game/facts.js`,數字更新時只要改那個檔案。

查證日期:2026 年 10 月。每一條都以發布機關的統計為準,下表的連結是報導或轉述該統計的新聞,方便追溯;正式引用時建議再到發布機關網站核對。

| 數據 | 發布機關 | 顯示在哪些事件 | 參考連結 |
|---|---|---|---|
| 平均每 3 分 48 秒有 1 人罹癌(2023 年資料) | 國民健康署 癌症登記報告 | 癌症、同事確診重大疾病 | [元氣網](https://health.udn.com/health/story/5999/9233973) |
| 癌症連 43 年居十大死因第一,2024 年 54,032 人死於癌症 | 衛生福利部 2024 年死因統計 | 名人罹癌新聞、重大傷病險 vs 癌症險、50 歲健檢 | [康健雜誌](https://www.commonhealth.com.tw/article/92814)、[世界日報](https://www.worldjournal.com/wj/story/121221/8812624) |
| 肺炎為 2024 年十大死因第三 | 衛生福利部 2024 年死因統計 | 重感冒併發肺炎 | [Heho 健康](https://heho.com.tw/archives/358405) |
| 2025 年平均壽命 81.27 歲(男 77.93、女 84.75) | 內政部 2025 年簡易生命表 | 身故事件 | [華視新聞](https://news.cts.com.tw/cts/life/202608/202608243070669.html) |
| 一生平均約 7.78 年處於不健康、需要他人照顧(2023 年) | 衛生福利部 健康平均餘命統計 | 慢性病、失能、長照險、75 歲晚年照顧 | [公視新聞網](https://news.pts.org.tw/article/755873) |
| 2024 年長照需求人數約 89.2 萬人 | 衛生福利部 | 中風後長照、父母需要照顧、撥 1966 | [公視新聞網](https://news.pts.org.tw/article/726945) |
| 2024 年交通事故 30 日內死亡 2,950 人、受傷約 52.4 萬人 | 交通部 道路交通事故統計 | 骨折、車禍、擦撞、第三人責任險 | [工商時報](https://www.ctee.com.tw/news/20250305701424-431401)、[道安總動員](https://roadsafety.tw/) |
| 2025 年平均失業率 3.35%,平均失業 19.9 週 | 行政院主計總處 人力資源調查 | 工作突然中斷 | [公視新聞網](https://news.pts.org.tw/article/794010) |
| 2025 年底 65 歲以上占 20.06%,進入超高齡社會 | 內政部 人口統計 | 退休前遇到大跌 | [聯合新聞網](https://udn.com/news/story/7266/9254576) |
| 勞保老年年金 ≈ 平均月投保薪資 × 年資 × 1.55%(36,000 元 × 30 年 ≈ 16,740 元/月) | 勞動部 勞工保險局 | 開始規劃退休、65 歲退休 | [勞動部](https://www.mol.gov.tw/1607/1632/1640/16464/) |
| 住宅地震基本保險全損最高 150 萬元 + 臨時住宿 20 萬元;投保率約 39%(2025 年 11 月) | 住宅地震保險基金 | 颱風房屋受損、颱風來了、地震書櫃、住宅險保障 | [住宅地震保險基金](https://www.treif.org.tw/)、[工商時報](https://www.ctee.com.tw/news/20250515702027-430601) |
| 2025 年詐騙財損 893.26 億元、受理 16.2 萬件 | 內政部警政署 165 打詐儀錶板 | 檢警詐騙電話、出租帳戶、假門票、LINE 借錢、投資群組、防詐講座 | [台視新聞](https://news.ttv.com.tw/news/11501190003200W) |
| 台股加權指數 2022 年全年下跌 22.4% | 臺灣證券交易所(財經媒體整理) | 帳面少兩成、下跌的市場行情 | [今周刊](https://www.businesstoday.com.tw/article/category/183008/post/202301030004/) |

## 歷史行情模式:台股加權指數年底收盤

選「台股真實歷史」時,每一年的股市報酬 = 當年年底收盤 ÷ 前一年年底收盤 − 1(資料在 `src/game/history.js`)。
加權指數是**價格指數**,不含股利,所以遊戲裡的報酬比真實的「含息報酬」略低;2025 年以後回到模擬行情。
測試 `test/history.test.js` 會把算出來的年報酬和下表「公布的漲跌幅」逐年比對。

| 年 | 年底收盤 | 全年漲跌 | 查證來源 |
|---|---|---|---|
| 1999 | 8,448.84 | (基期) | 由 2000 年收盤與全年跌點 3,704.90 回推 |
| 2000 | 4,743.94 | −43.85% | Wikipedia TAIEX 年度表 |
| 2001 | 5,551.24 | +17.02% | Wikipedia TAIEX 年度表 |
| 2002 | 4,452.45 | −19.79% | Wikipedia TAIEX 年度表 |
| 2003 | 5,890.69 | +32.30% | Wikipedia TAIEX 年度表 |
| 2004 | 6,139.69 | +4.2% | [中央銀行 2004 年報](https://www.cbc.gov.tw/public/data/publications/year2004/financial-60-65.pdf) |
| 2005 | 6,548.34 | +6.6% | [證交所 Fact Book 2006](https://www.twse.com.tw/downloads/zh/about/company/factbook/2006/web/0.0105.htm)、[央行 2005 年報](https://www.cbc.gov.tw/public/data/publications/year2005/05ar_ii-6.pdf) |
| 2006 | 7,823.72 | +19.48% | 央行年報(7,823.7) |
| 2007 | 8,506.28 | +8.7% | [證交所 Fact Book 2008](https://www.twse.com.tw/downloads/zh/about/company/factbook/2008/0.0105.htm)、央行 2007 年報 |
| 2008 | 4,591.22 | −46.02% | [證交所 60 週年刊](https://www.twse.com.tw/staticFiles/product/publication/twse60/html/174/) |
| 2009 | 8,188.11 | +78.34% | [證交所 60 週年刊](https://www.twse.com.tw/staticFiles/product/publication/twse60/html/174/) |
| 2010 | 8,972.50 | +9.58% | [證交所 Fact Book 2011](https://www.twse.com.tw/downloads/zh/about/company/factbook/2011/0.0105.htm) |
| 2011 | 7,072.08 | −21.18% | [證交所 Fact Book 2012](https://www.twse.com.tw/downloads/zh/about/company/factbook/2012/0.0105.htm) |
| 2012 | 7,699.50 | +8.87% | [央行 2013 年報](https://www.cbc.gov.tw/en/public/Attachment/463016195271.PDF) |
| 2013 | 8,611.51 | +11.85% | [證交所 Fact Book 2014](https://www.twse.com.tw/downloads/zh/about/company/factbook/2014/0.0105.htm) |
| 2014 | 9,307.26 | +8.08% | [今周刊(TEJ 年度統計)](https://www.businesstoday.com.tw/article/category/183008/post/202512310015/) |
| 2015 | 8,338.06 | −10.41% | [證交所 Fact Book 2016](https://www.twse.com.tw/downloads/zh/about/company/factbook/2016/0.0105.html) |
| 2016 | 9,253.50 | +10.98% | [中央社](https://www.cna.com.tw/news/afe/201612300211.aspx)、今周刊(TEJ) |
| 2017 | 10,642.86 | +15.01% | [Yahoo 股市(引證交所統計)](https://tw.stock.yahoo.com/) |
| 2018 | 9,727.41 | −8.60% | Yahoo 股市(引證交所統計) |
| 2019 | 11,997.14 | +23.33% | [台灣英文新聞](https://www.taiwannews.com.tw/zh/news/3847785)、證交所 108 年年報 |
| 2020 | 14,732.53 | +22.8% | [中央社](https://www.cna.com.tw/news/afe/202012310240.aspx) |
| 2021 | 18,218.84 | +23.66% | [中央社](https://www.cna.com.tw/news/firstnews/202112300397.aspx) |
| 2022 | 14,137.69 | −22.4% | Goodinfo 年 K 線、[今周刊](https://www.businesstoday.com.tw/article/category/183008/post/202301030004/) |
| 2023 | 17,930.81 | +26.83% | [聯合新聞網](https://money.udn.com/money/story/5607/9237541) |
| 2024 | 23,035.10 | +28.47% | [聯合新聞網](https://money.udn.com/money/story/5607/9237541)、[工商時報](https://www.ctee.com.tw/news/20241228700045-430201) |
| 2025 | 28,963.6 | +25.73% | [聯合新聞網](https://money.udn.com/money/story/5607/9237541)、[中央社](https://www.cna.com.tw/news/afe/202512310246.aspx) |

每一年旁邊的「發生了什麼」(例如 2008 年金融海嘯、2020 年疫情)是簡短的歷史背景,方便玩家連結真實事件;
行情格的劇情**不交給 AI 改寫**,避免改錯史實。

## 刻意沒有放的數據

- **2008 年金融海嘯台股跌幅**:不同來源的數字不一致(全年跌幅與高低點跌幅混用),查不到可靠的單一數字,所以不放。
- **2024 年詐騙財損**:不同時點的報導數字差異很大,改用 2025 年全年的 165 打詐儀錶板統計。
- **遊戲內的機率與金額**:遊戲本身的事件機率、醫療費與保費是教學用的簡化模型,刻意不和上面的真實數據混在一起,避免玩家誤以為遊戲數字就是真實費率。
