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

// Groq (OpenAI-compatible)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// 🎭 Personnalité par salon (optionnel)
const rolesByChannel = {
  // "123456789012345678": "Tu es un assistant clair et sympa.",
  // "234567890123456789": "Tu es un dev senior, très technique.",
};

// 🧠 Mémoire par salon (RAM)
const memoryByChannel = new Map();

// Réglages mémoire
const MAX_TURNS = 12; // nombre de messages gardés (user+assistant)
const MAX_CHARS_PER_MSG = 1500; // évite les pavés trop longs

function getChannelMemory(channelId) {
  if (!memoryByChannel.has(channelId)) memoryByChannel.set(channelId, []);
  return memoryByChannel.get(channelId);
}

function pushToMemory(channelId, role, content) {
  const mem = getChannelMemory(channelId);
  const safe = (content || "").slice(0, MAX_CHARS_PER_MSG);
  mem.push({ role, content: safe });

  // garde seulement les derniers échanges
  while (mem.length > MAX_TURNS * 2) mem.shift();
}

client.on("clientReady", () => {
  console.log("Bot connecté !");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const content = message.content.replace(`<@${client.user.id}>`, "").trim();
  const channelId = message.channel.id;

  // commande pour reset la mémoire du salon
  if (content.toLowerCase() === "reset") {
    memoryByChannel.set(channelId, []);
    return message.reply("🧠 Mémoire du salon réinitialisée.");
  }

  const systemRole =
    rolesByChannel[channelId] || "Tu es un assistant utile, naturel et concis.";

  try {
    // 🖼️ Images gratuites (Pollinations)
    if (content.toLowerCase().startsWith("image")) {
      const prompt = content.slice("image".length).trim() || "une image stylée";
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt
      )}`;
      // (Optionnel) mémoriser le prompt image comme contexte
      pushToMemory(channelId, "user", `[DEMANDE IMAGE] ${prompt}`);
      pushToMemory(channelId, "assistant", `[IMAGE] ${url}`);
      return message.reply(url);
    }

    // 🧠 Construire messages avec mémoire
    const mem = getChannelMemory(channelId);

    // Ajoute le message utilisateur à la mémoire
    pushToMemory(channelId, "user", content);

    const messages = [
      { role: "system", content: systemRole },
      ...mem,
    ];

    const resp = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
    });

    const answer =
      resp.choices?.[0]?.message?.content?.trim() || "Je n'ai pas pu répondre.";

    // Ajoute la réponse à la mémoire
    pushToMemory(channelId, "assistant", answer);

    return message.reply(answer);
  } catch (err) {
    console.error(err);
    return message.reply(
      "⚠️ Erreur IA. Vérifie GROQ_API_KEY ou réessaie dans 10 secondes."
    );
  }
});

client.login(process.env.TOKEN);
