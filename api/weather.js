// api/weather.js — 기상청 초단기실황 (서울 강남구 기본)
export default async function handler(req, res) {
  const KEY = process.env.DATA_GO_KR_KEY;
  if (!KEY) return res.status(200).json({ error: 'no_api_key_in_env' });
  
  const nx = req.query.nx || 61;
  const ny = req.query.ny || 126;
  
  const now = new Date();
  now.setMinutes(now.getMinutes() - 40);
  const base_date = now.toISOString().slice(0,10).replace(/-/g, '');
  const base_time = String(now.getHours()).padStart(2,'0') + '00';
  
  const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst` +
    `?serviceKey=${encodeURIComponent(KEY)}&numOfRows=10&pageNo=1&dataType=JSON` +
    `&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch(e){ 
      return res.status(200).json({ error: 'api_response_not_json', raw: text.slice(0,300) });
    }
    
    const items = data?.response?.body?.items?.item || [];
    const result = {};
    items.forEach(it => {
      if (it.category === 'T1H') result.temp = parseFloat(it.obsrValue);
      if (it.category === 'RN1') result.rain = parseFloat(it.obsrValue);
      if (it.category === 'REH') result.humidity = parseFloat(it.obsrValue);
      if (it.category === 'WSD') result.wind = parseFloat(it.obsrValue);
      if (it.category === 'PTY') result.rainType = parseInt(it.obsrValue);
    });
    
    res.setHeader('Cache-Control', 's-maxage=600');
    res.status(200).json({ ...result, base_date, base_time });
  } catch (err) {
    res.status(200).json({ error: err.message });
  }
}
