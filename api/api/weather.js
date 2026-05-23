// api/weather.js — 기상청 초단기실황 (서울 강남구 기본)
export default async function handler(req, res) {
  const KEY = process.env.DATA_GO_KR_KEY;
  
  // URL 파라미터로 지역 받기 (기본: 서울 강남)
  const nx = req.query.nx || 61;
  const ny = req.query.ny || 126;
  
  // 현재 시각 기준 base_time (10분 단위 갱신)
  const now = new Date();
  now.setMinutes(now.getMinutes() - 40); // 40분 전 데이터가 가장 안전
  const base_date = now.toISOString().slice(0,10).replace(/-/g, '');
  const base_time = String(now.getHours()).padStart(2,'0') + '00';
  
  const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst` +
    `?serviceKey=${KEY}&numOfRows=10&pageNo=1&dataType=JSON` +
    `&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    const items = data?.response?.body?.items?.item || [];
    
    // 카테고리별 정리
    const result = {};
    items.forEach(it => {
      if (it.category === 'T1H') result.temp = parseFloat(it.obsrValue);    // 기온
      if (it.category === 'RN1') result.rain = parseFloat(it.obsrValue);    // 1시간 강수량
      if (it.category === 'REH') result.humidity = parseFloat(it.obsrValue); // 습도
      if (it.category === 'WSD') result.wind = parseFloat(it.obsrValue);    // 풍속
      if (it.category === 'PTY') result.rainType = parseInt(it.obsrValue);  // 강수형태
    });
    
    res.setHeader('Cache-Control', 's-maxage=600'); // 10분 캐시
    res.status(200).json({
      ...result,
      base_date,
      base_time
    });
  } catch (err) {
    res.status(200).json({ error: err.message });
  }
}
