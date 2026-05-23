// api/kospi.js — 코스피 지수 (디버깅 강화)
export default async function handler(req, res) {
  const KEY = process.env.DATA_GO_KR_KEY;
  if (!KEY) return res.status(200).json({ error: 'no_api_key_in_env' });
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const day = yesterday.getDay();
  if (day === 0) yesterday.setDate(yesterday.getDate() - 2);
  if (day === 6) yesterday.setDate(yesterday.getDate() - 1);
  const basDt = yesterday.toISOString().slice(0,10).replace(/-/g, '');
  
  const url = `https://apis.data.go.kr/1160100/service/GetMarketIndexInfoService/getStockMarketIndex` +
    `?serviceKey=${encodeURIComponent(KEY)}&numOfRows=10&pageNo=1&resultType=json&basDt=${basDt}&idxNm=${encodeURIComponent('코스피')}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    let data;
    try { 
      data = JSON.parse(text); 
    } catch(e){ 
      return res.status(200).json({ 
        name: '코스피', value: null,
        error: 'api_response_not_json',
        raw: text.slice(0, 300),
        attempted_basDt: basDt
      });
    }
    
    const item = data?.response?.body?.items?.item?.[0];
    if (!item) {
      return res.status(200).json({ 
        name: '코스피', value: null, error: 'no_data',
        raw_response: JSON.stringify(data).slice(0, 300),
        attempted_basDt: basDt
      });
    }
    
    res.setHeader('Cache-Control', 's-maxage=300');
    res.status(200).json({
      name: '코스피',
      value: parseFloat(item.clpr),
      rate: parseFloat(item.fltRt),
      change: parseFloat(item.vs),
      basDt: item.basDt
    });
  } catch (err) {
    res.status(200).json({ name: '코스피', value: null, error: err.message });
  }
}
