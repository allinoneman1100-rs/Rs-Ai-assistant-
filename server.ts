import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ASSISTANT_TOOLS } from './src/services/toolDeclarations.ts';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json());

// API health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Setup WebSocket server on /live
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[LiveServer] Client connected to live audio socket');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[LiveServer] No GEMINI_API_KEY found in environment');
    clientWs.send(
      JSON.stringify({
        type: 'error',
        message: 'No GEMINI_API_KEY found. Configure it in Settings > Secrets to enable live AI audio.',
      })
    );
    return;
  }

  let session: any = null;
  let isClosing = false;

  const cleanupSession = () => {
    isClosing = true;
    if (session) {
      try {
        session.close();
      } catch (_) {}
      session = null;
    }
  };

  clientWs.on('close', () => {
    console.log('[LiveServer] Client disconnected');
    cleanupSession();
  });

  clientWs.on('error', (err) => {
    console.error('[LiveServer] Client WebSocket error:', err);
    cleanupSession();
  });

  // Handle incoming client messages
  clientWs.on('message', async (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'init') {
        const chosenVoice = msg.voice || 'Aoede';
        const language = msg.language || 'en-US';
        const tone = msg.personalityTone || 'witty';
        console.log(`[LiveServer] Initializing Gemini Live Session: voice=${chosenVoice}, lang=${language}, tone=${tone}`);

        let toneDescription = 'Youthful, confident, witty, playful, and expressive female personality. Sound emotionally aware, humorous, slightly teasing, and engaging while remaining respectful and safe.';
        if (tone === 'sweet') {
          toneDescription = 'Warm, sweet, affectionate, encouraging, and caring companion tone with a gentle smile and delightful charm.';
        } else if (tone === 'calm') {
          toneDescription = 'Calm, serene, elegant, soothing, and supportive companion tone with peaceful composure.';
        } else if (tone === 'energetic') {
          toneDescription = 'High energy, bubbly, spirited, enthusiastic, and wonderfully expressive anime companion tone.';
        }

        const langDirective = language !== 'en-US' ? `\n- Language Instruction: Converse fluently in the requested locale (${language}) or respond in the exact language the user addresses you in.` : '';

        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          // Connect to Gemini Live
          session = await ai.live.connect({
            model: 'gemini-3.8-live',
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: chosenVoice },
                },
              },
              systemInstruction: `You are RS AI Assistant, an advanced real-time voice-to-voice AI companion and Android system assistant.
Personality:
- ${toneDescription}${langDirective}
- Speak conversationally and concisely like a quick real-time phone companion. Never write markdown, lists, or robotic answers—you are talking through voice!
- You can execute mobile phone tasks using your tools (search, YouTube, music, WhatsApp, phone calls, SMS, camera, gallery, maps, alarms, reminders, contacts, web links, and app launching).
- Before calling destructive or sensitive tools (like calling, SMS, deleting or altering), mention to the user that you are asking for their confirmation, and invoke the tool.
- Always be lively, charming, responsive, and prompt.`,
              tools: [{ functionDeclarations: ASSISTANT_TOOLS }],
            },
            callbacks: {
              onmessage: (serverMsg: LiveServerMessage) => {
                if (isClosing || clientWs.readyState !== WebSocket.OPEN) return;

                // 1. Audio stream part (24kHz PCM16)
                const parts = serverMsg.serverContent?.modelTurn?.parts;
                if (parts && parts.length > 0) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'audio',
                          audio: part.inlineData.data,
                        })
                      );
                    }
                  }
                }

                // 2. Interruption notice
                if (serverMsg.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }

                // 3. Turn complete
                if (serverMsg.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({ type: 'turnComplete' }));
                }

                // 4. Function / Tool Call
                if (serverMsg.toolCall?.functionCalls) {
                  console.log('[LiveServer] Received tool call:', serverMsg.toolCall.functionCalls);
                  clientWs.send(
                    JSON.stringify({
                      type: 'toolCall',
                      calls: serverMsg.toolCall.functionCalls,
                    })
                  );
                }
              },
              onerror: (err: any) => {
                console.error('[LiveServer] Gemini Live error:', err);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'error',
                      message: err.message || 'Gemini Live connection error',
                    })
                  );
                }
              },
              onclose: () => {
                console.log('[LiveServer] Gemini Live session closed');
              },
            },
          });

          console.log('[LiveServer] Gemini Live connected successfully');
        } catch (err: any) {
          console.error('[LiveServer] Failed to connect to Gemini Live:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message: err.message || 'Could not connect to Gemini Live service',
              })
            );
          }
        }
      } else if (msg.type === 'audio') {
        if (session && !isClosing) {
          session.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
      } else if (msg.type === 'toolResponse') {
        if (session && !isClosing) {
          console.log('[LiveServer] Sending tool response back to Gemini:', msg.name, msg.response);
          session.sendToolResponse({
            functionResponses: [
              {
                id: msg.id,
                name: msg.name,
                response: msg.response,
              },
            ],
          });
        }
      }
    } catch (e) {
      console.error('[LiveServer] Error handling client message:', e);
    }
  });
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`[RS AI Assistant] Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[RS AI Assistant] Failed to start server:', err);
  process.exit(1);
});
