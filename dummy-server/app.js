const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post('/chat', (req, res) => {
    const userMessage = req.body.message;
    const userID = req.body.userID;
    console.log('user message ', userMessage);
    console.log('user ID ', userID);

    res.json({
        message: `Hello user number [${userID}], I got you message: "${userMessage}". Here is a flight to Barcelona in 15$ ✈️`,
    });
});

app.listen(port, () => {
    console.log(`⚡️server listening on http://localhost:${port}`);
});
