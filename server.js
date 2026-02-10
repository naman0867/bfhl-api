import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import Groq from "groq-sdk";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Load env values
const email = process.env.OFFICIAL_EMAIL;
const GROQ_KEY = process.env.GROQ_API_KEY;

console.log("Loaded Email:", email);
console.log("Loaded Groq Key:", GROQ_KEY);

// Groq client
const groq = new Groq({ apiKey: GROQ_KEY });

// ---------------- Utility Functions ---------------- //

const isPrime = (num) => {
  if (num < 2) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
};

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const lcm2 = (a, b) => (a * b) / gcd(a, b);

// ---------------- Groq AI Function ---------------- //

async function askGroq(question) {
  try {
    console.log("Calling Groq with KEY:", GROQ_KEY);

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: question }]
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    console.log("GROQ ERROR:", err.response?.data || err.message);
    return "AI_error";
  }
}

// ---------------- POST /bfhl ---------------- //

app.post("/bfhl", async (req, res) => {
  try {
    const body = req.body;

    if (!body || Object.keys(body).length !== 1) {
      return res.status(400).json({
        is_success: false,
        message: "Request must contain exactly one key"
      });
    }

    const key = Object.keys(body)[0];
    const value = body[key];

    switch (key) {
      case "fibonacci":
        if (typeof value !== "number" || value <= 0)
          return res.status(400).json({
            is_success: false,
            message: "fibonacci must be a positive integer"
          });

        let fib = [0, 1];
        for (let i = 2; i < value; i++) fib[i] = fib[i - 1] + fib[i - 2];

        return res.json({
          is_success: true,
          official_email: email,
          data: fib.slice(0, value)
        });

      case "prime":
        if (!Array.isArray(value))
          return res.status(400).json({
            is_success: false,
            message: "prime must be an array"
          });

        const primes = value.filter((n) => Number.isInteger(n) && isPrime(n));

        return res.json({
          is_success: true,
          official_email: email,
          data: primes
        });

      case "lcm":
        if (!Array.isArray(value) || value.some(n => n <= 0))
          return res.status(400).json({
            is_success: false,
            message: "lcm must be an array of positive integers"
          });

        const lcmResult = value.reduce((a, b) => lcm2(a, b));

        return res.json({
          is_success: true,
          official_email: email,
          data: lcmResult
        });

      case "hcf":
        if (!Array.isArray(value) || value.some(n => n <= 0))
          return res.status(400).json({
            is_success: false,
            message: "hcf must be an array of positive integers"
          });

        const hcfResult = value.reduce((a, b) => gcd(a, b));

        return res.json({
          is_success: true,
          official_email: email,
          data: hcfResult
        });

      case "AI":
        if (typeof value !== "string")
          return res.status(400).json({
            is_success: false,
            message: "AI input must be a string"
          });

        let aiResponse = await askGroq(value);

        return res.json({
          is_success: true,
          official_email: email,
          data: aiResponse
        });

      default:
        return res.status(400).json({
          is_success: false,
          message: "Invalid key"
        });
    }

  } catch (error) {
    console.log("SERVER ERROR:", error.message);
    return res.status(500).json({
      is_success: false,
      message: "Internal server error"
    });
  }
});

// ---------------- GET /health ---------------- //

app.get("/health", (req, res) => {
  res.json({
    is_success: true,
    official_email: email
  });
});

// ---------------- Start Server ---------------- //

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
