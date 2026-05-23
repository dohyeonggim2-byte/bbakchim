// api/kospi.js — 금융위원회 주식시세정보 (삼성전자 종목 시세)
// 코스피 지수 API 별도 신청 전까지 임시로 삼성전자 시세 사용
export default async function handler(req, res) {
  const KEY = process.env.DATA_GO_KR_KEY;
  if (!KEY) return res.status(200).json({ error: 'no_api_key_in_env' });
  
  // 최근 영업일 (어제 또는 금요일)
  function getBasDt(daysBack = 1) {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    const day = d.getDay();
    if (day === 0) d.setDate(d.getDate() - 2);
    if (day === 6) d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0,10).replace(/-/g, '');
  }
  
  // 어제부터 최대 5일 전까지 시도 (휴장일 대응)
  for (let back = 1; back <= 5; back++) {
    const basDt = getBasDt(back);
    
    const url = `https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo` +
      `?serviceKey=${encodeURIComponent(KEY)}&numOfRows=1&pageNo=1&resultType=json` +
      `&likeItmsNm=${encodeURIComponent('삼성전자')}&basDt=${basDt}`;
    
    try {
      const response = await fetch(url);
      const text = await response.text();
      
      let data;
      try { data = JSON.parse(text); }
      catch(e) {
        // Forbidden 등 — 다음 날짜 시도 X (영구 에러)
        return res.status(200).json({
          name: '주가',
          value: null,
          error: 'api_response_not_json',
          raw: text.slice(0, 300),
          attempted_basDt: basDt
        });
      }
      
      const item = data?.response?.body?.items?.item?.[0];
      if (item) {
        res.setHeader('Cache-Control', 's-maxage=600');
        return res.status(200).json({
          name: '삼성전자',
          value: parseFloat(item.clpr),         // 종가
          rate: parseFloat(item.fltRt),          // 등락률 %
          change: parseFloat(item.vs),           // 전일 대비
          high: parseFloat(item.hipr),           // 고가
          low: parseFloat(item.lopr),            // 저가
          volume: parseInt(item.trqu),           // 거래량
          basDt: item.basDt,
          itmsNm: item.itmsNm
        });
      }
      // 이 날짜에 데이터 없으면 더 이전 날짜로
    } catch (err) {
      // 네트워크 에러 시 다음 날짜 시도
      continue;
    }
  }
  
  // 5일 시도해도 없으면
  return res.status(200).json({
    name: '삼성전자',
    value: null,
    error: 'no_data_in_5_days'
  });
}
