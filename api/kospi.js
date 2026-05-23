// api/kospi.js — 코스피 지수 (한국거래소)
export default async function handler(req, res) {
  const KEY = process.env.DATA_GO_KR_KEY;
  
  // 어제 날짜 (영업일 기준 — 주말이면 금요일)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const day = yesterday.getDay();
  if (day === 0) yesterday.setDate(yesterday.getDate() - 2); // 일요일 → 금
  if (day === 6) yesterday.setDate(yesterday.getDate() - 1); // 토요일 → 금
  const basDt = yesterday.toISOString().slice(0,10).replace(/-/g, '');
  
  const url = `https://apis.data.go.kr/1160100/service/GetMarketIndexInfoService/getStockMarketIndex` +
    `?serviceKey=${KEY}&numOfRows=10&pageNo=1&resultType=json&basDt=${basDt}&idxNm=코스피`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const item = data?.response?.body?.items?.item?.[0];
    
    if (!item) {
      return res.status(200).json({ 
        name: '코스피', 
        value: null, 
        rate: null, 
        error: 'no_data' 
      });
    }
    
    res.setHeader('Cache-Control', 's-maxage=300'); // 5분 캐시
    res.status(200).json({
      name: '코스피',
      value: parseFloat(item.clpr),       // 종가
      rate: parseFloat(item.fltRt),       // 등락률 %
      change: parseFloat(item.vs),         // 전일 대비
      basDt: item.basDt
    });
  } catch (err) {
    res.status(200).json({ 
      name: '코스피', 
      value: null, 
      error: err.message 
    });
  }
}
