// Rota de API (roda no servidor do EAS Hosting, não no celular): recebe um texto e devolve
// o áudio falado por uma voz neural do Azure, em MP3. A chave do Azure fica só aqui, no
// servidor (variáveis de ambiente), e nunca vai para o app.
// Uso: POST /api/voz  { "texto": "Sadec 1: decolando", "voz": "pt-BR-AntonioNeural" }

// Vozes neurais em português do Brasil que o app pode pedir (qualquer outra é recusada)
const VOZES = ['pt-BR-FranciscaNeural', 'pt-BR-AntonioNeural', 'pt-BR-ThalitaNeural', 'pt-BR-DonatoNeural', 'pt-BR-BrendaNeural', 'pt-BR-FabioNeural', 'pt-BR-GiovannaNeural'];

// Proteção da cota grátis: texto curto (as falas do rádio têm bem menos que isso)
const LIMITE_DE_LETRAS = 300;

// O texto vai dentro de um XML (SSML): os caracteres especiais precisam ser trocados
function escaparXml(texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function POST(request) {
  const chave = process.env.AZURE_SPEECH_KEY;
  const regiao = process.env.AZURE_SPEECH_REGION;
  if (!chave || !regiao) return new Response('Voz da nuvem não configurada', { status: 503 });

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return new Response('Corpo inválido', { status: 400 });
  }
  const texto = String(corpo.texto || '').trim().slice(0, LIMITE_DE_LETRAS);
  if (!texto) return new Response('Texto vazio', { status: 400 });
  const voz = VOZES.includes(corpo.voz) ? corpo.voz : VOZES[0];

  // SSML: qual voz fala e em que ritmo (+25%: a fala rápida de rádio)
  const ssml =
    `<speak version="1.0" xml:lang="pt-BR"><voice name="${voz}">` +
    `<prosody rate="+25%">${escaparXml(texto)}</prosody></voice></speak>`;

  const resposta = await fetch(`https://${regiao}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': chave,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'sadec-simulador',
    },
    body: ssml,
  });
  // Cota acabou, chave errada, Azure fora do ar...: o app usa a voz do aparelho
  if (!resposta.ok) return new Response('Falha na voz da nuvem', { status: 502 });

  return new Response(await resposta.arrayBuffer(), {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' },
  });
}
