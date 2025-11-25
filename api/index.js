const fs = require('fs').promises;
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Admin istatistik görüntüleme
  if (req.method === 'GET' && req.query.admin === 'stats') {
    try {
      const usageData = await fs.readFile(path.join(process.cwd(), 'data', 'usage.json'), 'utf8');
      return res.status(200).json(JSON.parse(usageData));
    } catch (error) {
      return res.status(200).json({});
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { commandName, description, licenseKey } = req.body;

  // Lisans kontrolü
  const validLicenses = ['DEMO-2024-FREE', 'ISA-BEKTAS-001', 'PREMIUM-2024-001'];
  
  if (!licenseKey || !validLicenses.includes(licenseKey)) {
    return res.status(403).json({ error: 'Geçersiz lisans anahtarı' });
  }

  if (!commandName || !description) {
    return res.status(400).json({ error: 'Komut adı ve açıklama gerekli' });
  }

  try {
    // Kullanım verilerini oku
    let usageData = {};
    try {
      const data = await fs.readFile(path.join(process.cwd(), 'data', 'usage.json'), 'utf8');
      usageData = JSON.parse(data);
    } catch (e) {
      usageData = {};
    }

    // Bugünün tarihi
    const today = new Date().toISOString().split('T')[0];

    // Kullanıcı verisi
    if (!usageData[licenseKey]) {
      usageData[licenseKey] = {
        totalUsage: 0,
        dailyUsage: {},
        lastUsed: null
      };
    }

    // Günlük kullanım kontrolü
    const dailyCount = usageData[licenseKey].dailyUsage[today] || 0;
    
    if (dailyCount >= 10) {
      return res.status(429).json({ 
        error: 'Günlük kullanım limitiniz doldu (10/10). Yarın tekrar deneyin.' 
      });
    }

    // Gemini API çağrısı
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=AIzaSyBXp4-XSQokEJLxTOtFJ90BibLo8pIfvlE',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ 
              text: `AutoCAD için AutoLISP kodu yaz. Komut Adı: ${commandName}. İşlev: ${description}. KURALLAR: Sadece çalışır AutoLISP kodu üret, (defun c:${commandName} () ...) şeklinde başla, hata kontrolü ekle, SADECE KOD ver, açıklama yapma.` 
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );

    const data = await response.json();
    const code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanCode = code.replace(/```lisp\n?/g, '').replace(/```autolisp\n?/g, '').replace(/```\n?/g, '').trim();

    // Kullanım verilerini güncelle
    usageData[licenseKey].totalUsage += 1;
    usageData[licenseKey].dailyUsage[today] = dailyCount + 1;
    usageData[licenseKey].lastUsed = new Date().toISOString();

    // Dosyaya kaydet
    await fs.writeFile(
      path.join(process.cwd(), 'data', 'usage.json'),
      JSON.stringify(usageData, null, 2)
    );

    return res.status(200).json({ 
      success: true, 
      code: cleanCode,
      usage: {
        daily: dailyCount + 1,
        remaining: 9 - dailyCount
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
  }
};
```

**Commit** edin!

---

## 📊 İSTATİSTİKLERİ GÖRMEK İÇİN:
```
https://lisp-generator-backend.vercel.app/api/index?admin=stats
