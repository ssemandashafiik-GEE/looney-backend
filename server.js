import express from "express";
import axios from "axios";
import OpenAI from "openai";
import dotenv from "dotenv";
import cron from "node-cron";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let predictions = [];

async function fetchFixtures() {
  const res = await axios.get(
    "https://v3.football.api-sports.io/fixtures?next=10",
    {
      headers: {
        "x-apisports-key": process.env.FOOTBALL_API_KEY,
      },
    }
  );
  return res.data.response;
}

async function generatePrediction(match) {
  const prompt = `
  Predict outcome for:
  ${match.teams.home.name} vs ${match.teams.away.name}

  Return JSON:
  {
    "home": "",
    "away": "",
    "league": "",
    "kickoff": "",
    "tip": "",
    "odds": "",
    "confidence": 0,
    "elite": false,
    "reasoning": "",
    "factors": ["", "", ""]
  }
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse(completion.choices[0].message.content);
}

async function runPredictions() {
  const fixtures = await fetchFixtures();
  predictions = [];

  for (const f of fixtures) {
    const p = await generatePrediction(f);
    predictions.push(p);
  }

  console.log("Updated predictions");
}

cron.schedule("0 */6 * * *", runPredictions);
runPredictions();

app.get("/api/predictions", (req, res) => {
  res.json(predictions);
});

app.listen(3000, () => console.log("Looney Tips API running"));
