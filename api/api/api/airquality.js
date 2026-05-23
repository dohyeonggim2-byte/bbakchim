// api/airquality.js — 에어코리아 시도별 실시간 측정
export default async function handler(req, res) {
  const KEY = process.env.DATA_GO_KR_KEY;
  
  // URL 파라미터로 시도 받기 (기본: 서울)
  const sido = req.query.sido || '서울';
  
  const url = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty` +
    `?serviceKey=${KEY}&returnType=json&numOfRows=100&pageNo=1` +
    `&sidoName=${encodeURIComponent(sido)}&ver=1.0`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const items = data?.response?.body?.items || [];
    
    if (items.length === 0) {
      return res.status(200).json({ pm10: null, pm25: null, error: 'no_data' });
    }
    
    // 측정소들의 평균 계산
    const valid = items.filter(it => it.pm10Value !== '-' && it.pm25Value !== '-');
    const avgPm10 = valid.reduce((s, it) => s + parseInt(it.pm10Value || 0), 0) / valid.length;
    const avgPm25 = valid.reduce((s, it) => s + parseInt(it.pm25Value || 0), 0) / valid.length;
    
    res.setHeader('Cache-Control', 's-maxage=1800'); // 30분 캐시
    res.status(200).json({
      sido,
      pm10: Math.round(avgPm10),
      pm25: Math.round(avgPm25),
      stations: valid.length,
      // 등급 판정
      pm10Grade: avgPm10 <= 30 ? '좋음' : avgPm10 <= 80 ? '보통' : avgPm10 <= 150 ? '나쁨' : '매우나쁨',
      pm25Grade: avgPm25 <= 15 ? '좋음' : avgPm25 <= 35 ? '보통' : avgPm25 <= 75 ? '나쁨' : '매우나쁨'
    });
  } catch (err) {
    res.status(200).json({ error: err.message });
  }
}
