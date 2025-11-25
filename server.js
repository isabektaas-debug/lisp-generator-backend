const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - TAM AÇIK
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

async function readUsageData() {
  try {
    const data = await fs.readFile(path.join(__dirname, 'data', 'usage.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveUsageData(data) {
  try {
    await fs.writeFile(
      path.join(__dirname, 'data', 'usage.json'),
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error('Save error:', error);
  }
}

app.get('/api/stats', async (req, res) => {
  const usageData = await readUsageData();
  res.json(usageData);
});

app.post('/api/generate', async (req, res) => {
  const { commandName, description, licenseKey } = req.body;

  const validLicenses = ['DEMO-2024-FREE', 'ISA-BEKTAS-001', 'PREMIUM-2024-001'];
  
  if (!licenseKey || !validLicenses.includes(licenseKey)) {
    return res.status(403).json({ error: 'Geçersiz lisans anahtarı' });
  }

  if (!commandName || !description) {
    return res.status(400).json({ error: 'Komut adı ve açıklama gerekli' });
  }

  try {
    const usageData = await readUsageData();
    const today = new Date().toISOString().split('T')[0];

    if (!usageData[licenseKey]) {
      usageData[licenseKey] = {
        totalUsage: 0,
        dailyUsage: {},
        lastUsed: null
      };
    }

    const dailyCount = usageData[licenseKey].dailyUsage[today] || 0;
    
    if (dailyCount >= 10) {
      return res.status(429).json({ 
        error: 'Günlük kullanım limitiniz doldu (10/10). Yarın tekrar deneyin.' 
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ 
              text: `AutoCAD için AutoLISP kodu yaz. Komut Adı: ${commandName}. İşlev: ${description}. Sadece çalışır kod üret, (defun c:${commandName} () ...) şeklinde başla, SADECE KOD ver.` 
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );

    const data = await response.json();
    const code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanCode = code.replace(/```lisp\n?/g, '').replace(/```autolisp\n?/g, '').replace(/```\n?/g, '').trim();

    usageData[licenseKey].totalUsage += 1;
    usageData[licenseKey].dailyUsage[today] = dailyCount + 1;
    usageData[licenseKey].lastUsed = new Date().toISOString();

    await saveUsageData(usageData);

    res.json({ 
      success: true, 
      code: cleanCode,
      usage: {
        daily: dailyCount + 1,
        remaining: 9 - dailyCount
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
