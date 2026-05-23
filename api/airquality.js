// api/airquality.js — 에어코리아 시도별 실시간
export default async function handler(req, res) {
  const KEY = process.env.DATA_GO_KR_KEY;
  if (!KEY) return res.status(200).json({ error: 'no_api_key_in_env' });
  
  const sido = req.query.sido || '서울';
  
  const url = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty` +
    `?serviceKey=${encodeURIComponent(KEY)}&returnType=json&numOfRows=100&pageNo=1` +
    `&sidoName=${encodeURIComponent(sido)}&ver=1.0`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch(e){ 
      return res.status(200).json({ error: 'api_response_not_json', raw: text.slice(0,300) });
    }
    
    const items = data?.response?.body?.items || [];
    if (items.length === 0) {
      return res.status(200).json({ pm10: null, pm25: null, error: 'no_data' });
    }
    
    const valid = items.filter(it => it.pm10Value !== '-' && it.pm25Value !== '-');
    if(valid.length === 0){
      return res.status(200).json({ pm10: null, pm25: null, error: 'no_valid_data' });
    }
    
    const avgPm10 = valid.reduce((s, it) => s + parseInt(it.pm10Value || 0), 0) / valid.length;
    const avgPm25 = valid.reduce((s, it) => s + parseInt(it.pm25Value || 0), 0) / valid.length;
    
    res.setHeader('Cache-Control', 's-maxage=1800');
    res.status(200).json({
      sido,
      pm10: Math.round(avgPm10),
      pm25: Math.round(avgPm25),
      stations: valid.length,
      pm10Grade: avgPm10 <= 30 ? '좋음' : avgPm10 <= 80 ? '보통' : avgPm10 <= 150 ? '나쁨' : '매우나쁨',
      pm25Grade: avgPm25 <= 15 ? '좋음' : avgPm25 <= 35 ? '보통' : avgPm25 <= 75 ? '나쁨' : '매우나쁨'
    });
  } catch (err) {
    res.status(200).json({ error: err.message });
  }
}
