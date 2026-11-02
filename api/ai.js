// وشيجة — سيرفر الذكاء الاصطناعي (Vercel Function)
// يحتاج متغير البيئة ANTHROPIC_API_KEY في إعدادات Vercel. ولا يطلع المفتاح للمتصفح أبداً.
// تقدر تغيّر النموذج بمتغير AI_MODEL (الافتراضي claude-opus-5-5).
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
// النماذج اللي تدعم إعادة المحاولة التلقائية على نموذج ثاني لو رفض الطلب
const SUPPORTS_FALLBACKS = /^claude-(opus-5|sonnet-5-5|fable-5)/.test(MODEL);
const MAX_CHARS = 200_000;
const MAX_IMAGES = 4;
const MAX_IMAGE_B64 = 3_500_000; // ~٢٫٦ ميقا (حد Vercel للطلب ٤٫٥ ميقا) — المتصفح يصغّر الصور قبل الإرسال
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// حد بسيط لكل جهاز (يحمي رصيدك من الإفراط) — يتصفّر لما السيرفر يعيد التشغيل
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = Number(process.env.AI_LIMIT_PER_10_MIN || 30);
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > LIMIT;
}

export default async function handler(req, res) {
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  if (req.method === 'GET') return res.status(200).json({ ok: hasKey });
  if (req.method !== 'POST') return res.status(405).json({ code: 'bad_request', error: 'POST only' });
  if (!hasKey) return res.status(503).json({ code: 'unavailable', error: 'ANTHROPIC_API_KEY is not set' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const raw = body && Array.isArray(body.messages) ? body.messages : null;
  if (!raw || !raw.length) return res.status(400).json({ code: 'bad_request', error: 'messages required' });

  const messages = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }));
  const chars = messages.reduce((n, m) => n + m.content.length, 0);
  if (!messages.length || messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user' || chars > MAX_CHARS) {
    return res.status(400).json({ code: 'bad_request', error: 'invalid messages' });
  }

  const sent = Array.isArray(body.images) ? body.images : [];
  const images = sent
    .filter((i) => i && IMAGE_TYPES.includes(i.media_type) && typeof i.data === 'string' && i.data.length < MAX_IMAGE_B64)
    .slice(0, MAX_IMAGES);
  if (sent.length && !images.length) return res.status(400).json({ code: 'bad_image', error: 'image too large or unsupported type' });

  // نحسب الطلب بعد ما نتأكد إنه سليم. Vercel يحط عنوان الزائر الحقيقي في x-real-ip
  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',').pop().trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ code: 'rate_limited', error: 'Too many requests' });
  if (images.length) {
    const last = messages[messages.length - 1];
    last.content = [
      ...images.map((i) => ({ type: 'image', source: { type: 'base64', media_type: i.media_type, data: i.data } })),
      { type: 'text', text: last.content },
    ];
  }

  try {
    const client = new Anthropic();
    const params = { model: MODEL, max_tokens: 16000, messages };
    const response = SUPPORTS_FALLBACKS
      ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await client.messages.create(params);
    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ text: 'ما أقدر أساعد في هذا الطلب. جرّب تسأل بطريقة ثانية.', refused: true });
    }
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    return res.status(200).json({ text, truncated: response.stop_reason === 'max_tokens' });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ code: 'rate_limited', error: 'rate limited' });
    if (err instanceof Anthropic.AuthenticationError) return res.status(503).json({ code: 'unavailable', error: 'invalid API key' });
    if (err instanceof Anthropic.BadRequestError) return res.status(400).json({ code: 'bad_request', error: 'request rejected' });
    if (err instanceof Anthropic.APIError) return res.status(503).json({ code: 'unavailable', error: 'AI service unavailable' });
    return res.status(500).json({ code: 'unavailable', error: 'server error' });
  }
}
