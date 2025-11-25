export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-License-Key');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { commandName, description, licenseKey } = req.body;

    // License validation
    const validLicenses = ['DEMO-2024-FREE', 'ISA-BEKTAS-001', 'PREMIUM-2024-001'];
    
    if (!licenseKey || !validLicenses.includes(licenseKey)) {
      return res.status(403).json({ error: 'Geçersiz lisans anahtarı' });
    }

    if (!commandName || !description) {
      return res.status(400).json({ error: 'Komut adı ve açıklama gerekli' });
    }

    // Gemini API call
    const apiKey = 'AIzaSyBXp4-XSQokEJLxTOtFJ90BibLo8pIfvlE';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
    
    const prompt = `AutoCAD için AutoLISP kodu yaz. Komut Adı: ${commandName}. İşlev: ${description}. KURALLAR: Sadece çalışır AutoLISP kodu üret, (defun c:${commandName} () ...) şeklinde başla, hata kontrolü ekle, SADECE KOD ver.`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    if (!geminiResponse.ok) {
      return res.status(500).json({ error: 'AI servisi hatası' });
    }

    const data = await geminiResponse.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      let code = data.candidates[0].content.parts[0].text.trim();
      code = code.replace(/```lisp\n?/g, '').replace(/```autolisp\n?/g, '').replace(/```\n?/g, '').trim();
      
      return res.status(200).json({ success: true, code: code });
    }
    
    return res.status(500).json({ error: 'Kod üretilemedi' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
  }
}
```

### 4. "Commit changes" tıklayın

### 5. 60 saniye bekleyin

### 6. Test edin:
```
https://lisp-generator-backend.vercel.app/api/index
