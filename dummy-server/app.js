const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors()); // ✅ זהו הפתרון העיקרי לבעיה
app.use(express.json()); // נדרש עבור JSON

app.post('/chat', (req, res) => {
  const userMessage = req.body.message;
  console.log('הודעה מהלקוח:', userMessage);

  res.json({
    message: `קיבלתי את ההודעה שלך: "${userMessage}". הנה הצעה: טיסה לברצלונה ב־50 ש"ח ✈️`,
  });
});

app.listen(port, () => {
  console.log(`⚡️ השרת רץ על http://localhost:${port}`);
});
