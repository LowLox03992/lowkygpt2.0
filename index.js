require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ✅ Client OpenAI SDK mais branché sur Groq (OpenAI-compatible)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1", // Groq base URL :contentReference[oaicite:3]{index=3}
});

// 🎭 Personnalité par salon (optionnel). Mets les IDs de salons.
const rolesByChannel = {
  // "123456789012345678": "Tu es un assistant clair et sympa.",
  // "234567890123456789": "Tu es un dev senior, réponses très techniques.",
};

client.on("clientReady", () => {
  console.log("Bot connecté !");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const content = message.content.replace(`<@${client.user.id}>`, "").trim();
  const systemRole = rolesByChannel[message.channel.id] || "Tu es un assistant utile et concis.";

  try {
    // 🖼️ Images gratuites via Pollinations
    if (content.toLowerCase().startsWith("image")) {
      const prompt = content.slice("image".length).trim() || "une image stylée";
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
      return message.reply(url);
    }

    // 🤖 Texte via Groq
    const resp = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // modèle Groq (rapide). Liste dispo via /models :contentReference[oaicite:4]{index=4}
      messages: [
        { role: "system", content: systemRole },
        { role: "user", content },
      ],
    });

    return message.reply(resp.choices?.[0]?.message?.content ?? "Je n'ai pas pu répondre.");
  } catch (err) {
    console.error(err);
    return message.reply("⚠️ Erreur IA (Groq). Vérifie ta clé GROQ_API_KEY.");
  }
});

client.login(process.env.TOKEN);
