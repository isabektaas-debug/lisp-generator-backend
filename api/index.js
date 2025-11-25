module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { commandName, description, licenseKey } = req.body;

  if (!licenseKey || !['DEMO-2024-FREE', 'ISA-BEKTAS-001'].includes(licenseKey)) {
    return res.status(403).json({ error: 'Geçersiz lisans' });
  }

  if (!commandName || !description) {
    return res.status(400).json({ error: 'Eksik bilgi' });
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=AIzaSyBXp4-XSQokEJLxTOtFJ90BibLo8pIfvlE',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `AutoCAD LISP kodu: ${commandName} - ${description}` }]
          }]
        })
      }
    );

    const data = await response.json();
    const code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({ success: true, code: code.replace(/```/g, '').trim() });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
