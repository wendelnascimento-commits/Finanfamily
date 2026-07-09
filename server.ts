import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON bodies
app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// API Route: Bank Transactions Sync Simulation
app.post("/api/bank/sync", (req, res) => {
  const { bankId, userRef } = req.body;
  if (!bankId || !userRef) {
    return res.status(400).json({ error: "bankId e userRef são obrigatórios." });
  }

  // Generate some realistic transactions depending on the selected bank
  const baseTransactions = [
    { desc: "Uber Trip", amount: 24.9, cat: "Transporte", type: "expense" },
    { desc: "iFood Delivery", amount: 68.4, cat: "Alimentação", type: "expense" },
    { desc: "Supermercado Extra", amount: 215.3, cat: "Supermercado", type: "expense" },
    { desc: "Assinatura Netflix", amount: 55.9, cat: "Assinaturas", type: "expense" },
    { desc: "Salário Mensal", amount: 4500.0, cat: "Salário", type: "income" },
    { desc: "Rendimento CDB", amount: 45.2, cat: "Investimentos", type: "income" },
    { desc: "Posto Shell Combustível", amount: 150.0, cat: "Transporte", type: "expense" },
    { desc: "Lojas Americanas", amount: 89.9, cat: "Compras", type: "expense" },
    { desc: "Drogaria São Paulo", amount: 42.1, cat: "Saúde", type: "expense" },
    { desc: "PIX Recebido", amount: 350.0, cat: "Outros", type: "income" },
  ];

  // Pick 3-5 random items
  const count = Math.floor(Math.random() * 3) + 3; // 3 to 5 transactions
  const shuffled = [...baseTransactions].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  const bankNameMap: Record<string, string> = {
    nubank: "Nubank",
    itau: "Itaú Unibanco",
    bradesco: "Bradesco",
    inter: "Banco Inter",
    santander: "Santander",
  };

  const bankName = bankNameMap[bankId] || "Banco Integrado";

  const transactions = selected.map((item, idx) => {
    // Generate a random date within the last 5 days
    const daysAgo = Math.floor(Math.random() * 5);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      id: `${bankId}-${Date.now()}-${idx}`,
      date: date.toISOString().split("T")[0],
      description: `${item.desc} (${bankName})`,
      amount: item.amount,
      category: item.cat,
      type: item.type,
      bankSynced: true,
      bankName: bankName,
      userRef: userRef,
    };
  });

  res.json({
    success: true,
    bankName,
    transactions,
    syncedAt: new Date().toLocaleTimeString("pt-BR"),
  });
});

// In-Memory queue for pending WhatsApp transactions
interface PendingWebhookTx {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: "expense" | "income";
  date: string;
  bankId: string;
}

let pendingWebhookTransactions: PendingWebhookTx[] = [];

// GET WhatsApp Webhook (Handshake validation for Meta API/Facebook Developers)
app.get("/api/whatsapp-webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe") {
      console.log("Meta Webhook verificado com sucesso!");
      return res.status(200).send(challenge);
    }
  }
  // Default to listing current queue if accessed directly or other uses
  res.json({ status: "online", webhookUrl: "/api/whatsapp-webhook" });
});

// POST WhatsApp Webhook (Meta API, Twilio or Simulated input)
app.post("/api/whatsapp-webhook", (req, res) => {
  let rawText = "";
  let bankId = "nubank";

  if (req.body.message) {
    rawText = req.body.message;
    bankId = req.body.bankId || "nubank";
  } else if (req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body) {
    rawText = req.body.entry[0].changes[0].value.messages[0].text.body;
  } else if (req.body.Body) {
    rawText = req.body.Body;
  } else {
    rawText = req.body.text || req.body.msg || "";
  }

  if (!rawText) {
    return res.status(400).json({ error: "Nenhuma mensagem encontrada no corpo da requisição." });
  }

  // Parse amount: e.g. "Mercado R$ 145,20" -> 145.20
  const amountRegex = /(\d+(?:[.,]\d{2})?)/g;
  const amountMatches = rawText.match(amountRegex);
  
  let amount = 0;
  if (amountMatches) {
    const possibleAmount = amountMatches[amountMatches.length - 1];
    amount = parseFloat(possibleAmount.replace(/\./g, "").replace(",", "."));
  }

  if (isNaN(amount) || amount === 0) {
    const digitRegex = /(\d+)/g;
    const digitMatches = rawText.match(digitRegex);
    if (digitMatches) {
      amount = parseFloat(digitMatches[digitMatches.length - 1]);
    }
  }

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Não foi possível identificar um valor numérico válido na mensagem. Use formatos como 'Mercado R$ 150' ou 'Lanche 25,50'." });
  }

  let category = "Outros";
  const lowercaseText = rawText.toLowerCase();
  if (lowercaseText.includes("ifood") || lowercaseText.includes("restaurante") || lowercaseText.includes("almoco") || lowercaseText.includes("jantar") || lowercaseText.includes("comer") || lowercaseText.includes("padaria") || lowercaseText.includes("lanche") || lowercaseText.includes("pizza") || lowercaseText.includes("burguer")) {
    category = "Alimentação";
  } else if (lowercaseText.includes("uber") || lowercaseText.includes("combustivel") || lowercaseText.includes("posto") || lowercaseText.includes("gasolina") || lowercaseText.includes("onibus") || lowercaseText.includes("metro") || lowercaseText.includes("carro") || lowercaseText.includes("99app") || lowercaseText.includes("taxi")) {
    category = "Transporte";
  } else if (lowercaseText.includes("aluguel") || lowercaseText.includes("condominio") || lowercaseText.includes("luz") || lowercaseText.includes("agua") || lowercaseText.includes("internet") || lowercaseText.includes("energia") || lowercaseText.includes("gas")) {
    category = "Moradia";
  } else if (lowercaseText.includes("cinema") || lowercaseText.includes("jogo") || lowercaseText.includes("festa") || lowercaseText.includes("cerveja") || lowercaseText.includes("bar") || lowercaseText.includes("teatro") || lowercaseText.includes("show")) {
    category = "Lazer";
  } else if (lowercaseText.includes("investi") || lowercaseText.includes("investimento") || lowercaseText.includes("cdb") || lowercaseText.includes("acao") || lowercaseText.includes("fundo") || lowercaseText.includes("tesouro")) {
    category = "Investimentos";
  } else if (lowercaseText.includes("salario") || lowercaseText.includes("pagamento") || lowercaseText.includes("recebi") || lowercaseText.includes("ganhei") || lowercaseText.includes("provento")) {
    category = "Salário";
  } else if (lowercaseText.includes("farmacia") || lowercaseText.includes("remedio") || lowercaseText.includes("medico") || lowercaseText.includes("consulta") || lowercaseText.includes("dentista") || lowercaseText.includes("hospital")) {
    category = "Saúde";
  } else if (lowercaseText.includes("compra") || lowercaseText.includes("shopping") || lowercaseText.includes("loja") || lowercaseText.includes("roupa") || lowercaseText.includes("presente") || lowercaseText.includes("mercantil") || lowercaseText.includes("supermercado")) {
    category = "Compras";
  } else if (lowercaseText.includes("spotify") || lowercaseText.includes("netflix") || lowercaseText.includes("prime") || lowercaseText.includes("hbo") || lowercaseText.includes("assinatura") || lowercaseText.includes("disney")) {
    category = "Assinaturas";
  }

  const isIncome = lowercaseText.includes("recebi") || lowercaseText.includes("ganhei") || lowercaseText.includes("salario") || lowercaseText.includes("pix recebido") || lowercaseText.includes("+") || lowercaseText.includes("deposito");

  let description = rawText
    .replace(/r\$/gi, "")
    .replace(/reais/gi, "")
    .replace(/real/gi, "")
    .replace(/\b\d+(?:[.,]\d{1,2})?\b/g, "")
    .replace(/gastei/gi, "")
    .replace(/recebi/gi, "")
    .replace(/com/gi, "")
    .trim();

  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  } else {
    description = isIncome ? "Recebimento via WhatsApp" : "Gasto via WhatsApp";
  }

  const newTx = {
    id: `ws-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    description,
    amount,
    category,
    type: isIncome ? ("income" as const) : ("expense" as const),
    date: new Date().toISOString().split("T")[0],
    bankId,
  };

  pendingWebhookTransactions.push(newTx);

  res.json({
    success: true,
    message: "Mensagem recebida e processada com sucesso!",
    parsed: newTx
  });
});

// Poll pending WhatsApp Webhook transactions
app.get("/api/whatsapp-webhook/pending", (req, res) => {
  const current = [...pendingWebhookTransactions];
  pendingWebhookTransactions = []; // Clear queue on retrieval
  res.json({ transactions: current });
});

// API Route: Smart Tips using Gemini
app.post("/api/gemini/tips", async (req, res) => {
  const { transactions, goals, investments, familyMembers } = req.body;

  const fallbackTips = [
    {
      title: "Dica de Alimentação",
      message: "Seus gastos com alimentação externa (iFood, restaurantes) parecem altos neste mês. Que tal planejar refeições semanais para economizar?",
      type: "tip",
    },
    {
      title: "Ajuste de Reserva de Emergência",
      message: "Sua reserva em investimentos está excelente, mas considere aumentar o aporte em títulos de liquidez diária (CDB 100% CDI) para cobrir imprevistos da família.",
      type: "tip",
    },
    {
      title: "Alerta de Orçamento Coletivo",
      message: "Atenção ao teto orçamentário compartilhado. Vocês atingiram 85% do limite estipulado para a categoria de 'Compras e Entretenimento'.",
      type: "warning",
    },
  ];

  if (!ai) {
    // Fallback if API Key is not set or SDK initialization is skipped
    return res.json({
      tips: fallbackTips,
      isSimulated: true,
    });
  }

  try {
    const formattedTransactions = (transactions || [])
      .slice(0, 15) // Limit context to avoid hitting limits
      .map((t: any) => `${t.date}: ${t.description} - R$ ${t.amount} (${t.type === "expense" ? "Despesa" : "Receita"} - ${t.category})`)
      .join("\n");

    const formattedGoals = (goals || [])
      .map((g: any) => `Meta: ${g.title} - Alvo: R$ ${g.targetAmount}, Atual: R$ ${g.currentAmount} (Prazo: ${g.deadline})`)
      .join("\n");

    const prompt = `Analise o histórico financeiro da família e gere 3 dicas personalizadas, em português brasileiro.
Membros da família: ${(familyMembers || []).map((m: any) => m.name).join(", ")}
Investimentos totais: R$ ${(investments || []).reduce((acc: number, inv: any) => acc + inv.amount, 0)}

Transações Recentes:
${formattedTransactions || "Nenhuma transação registrada."}

Metas Ativas:
${formattedGoals || "Nenhuma meta registrada."}

Por favor, gere exatamente 3 dicas relevantes, variando entre conselhos gerais de economia, alertas de categorias acima do planejado ou incentivos de investimento. Retorne um array JSON contendo objetos com: "title" (título curto), "message" (conteúdo empático e prático) e "type" ("tip" ou "warning").`;

    // Promise that queries Gemini
    const geminiCall = async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Você é um consultor financeiro especialista em orçamento familiar, investimentos de renda fixa e variável no mercado brasileiro. Suas dicas devem ser empáticas, diretas e acionáveis.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Título curto da dica de economia ou alerta" },
                message: { type: Type.STRING, description: "Mensagem detalhada e empática com conselho prático" },
                type: { type: Type.STRING, enum: ["tip", "warning"], description: "Tipo da dica" }
              },
              required: ["title", "message", "type"]
            }
          }
        }
      });

      const text = response.text || "[]";
      return JSON.parse(text.trim());
    };

    // Race Gemini with a 10 second timeout to guarantee responsive UI and no 504 errors
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 10000)
    );

    const tips = await Promise.race([geminiCall(), timeoutPromise]);
    res.json({ tips, isSimulated: false });
  } catch (error: any) {
    console.log("Aviso na rota do Gemini (ativando fallback inteligente):", error.message || error);
    // Graceful fallback to avoid client-side JSON parsing errors of standard 500 HTML pages
    res.json({
      tips: fallbackTips,
      isSimulated: true,
      errorInfo: error.message || "Timeout/Network Error"
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
