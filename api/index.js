export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-License-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { commandName, description, licenseKey } = req.body;

    const validLicenses = [
      'DEMO-2024-FREE',
      'ISA-BEKTAS-001',
      'PREMIUM-2024-001'
    ];

    if (!licenseKey || !validLicenses.includes(licenseKey)) {
      return res.status(403).json({ 
        error: 'Geçersiz lisans anahtarı' 
      });
    }

    if (!commandName || !description) {
      return res.status(400).json({ 
        error: 'Komut adı ve açıklama gerekli' 
      });
    }

    const geminiApiKey = 'AIzaSyBXp4-XSQokEJLxTOtFJ90BibLo8pIfvlE';
    
    const prompt = `AutoCAD için AutoLISP kodu yaz. 

Komut Adı: ${commandName}
İşlev: ${description}

KURALLAR:
- Sadece çalışır AutoLISP kodu üret
- (defun c:${commandName} () ...) şeklinde başla
- Hata kontrolü ekle
- SADECE KOD ver, açıklama yapma`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
