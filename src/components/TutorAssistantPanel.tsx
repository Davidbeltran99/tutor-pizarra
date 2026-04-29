"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
};

type Props = {
  message: string;
  liveHint?: string;
  messages: Message[];
  onAsk: (question: string) => Promise<void> | void;
  onRefreshHint?: () => Promise<void> | void;
};

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  0: SpeechRecognitionAlternative;
  length: number;
};

type SpeechRecognitionEventLike = {
  results: {
    0: SpeechRecognitionResultLike;
    length: number;
  };
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void | Promise<void>) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

export default function TutorAssistantPanel({
  message,
  liveHint,
  messages,
  onAsk,
  onRefreshHint,
}: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [question, setQuestion] = useState("");
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const latestTutorMessage = useMemo(() => {
    const reversed = [...messages].reverse();
    const lastAssistant = reversed.find((msg) => msg.role === "assistant");

    return (lastAssistant?.text || message || "Hola, soy tu tutor 👋")
      .replace(/[#*`>-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }, [messages, message]);

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window) || !text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.02;
    utterance.lang = "es-CO";

    const voices = window.speechSynthesis.getVoices();
    const bestVoice =
      voices.find((voice) => voice.lang.includes("es-CO")) ||
      voices.find((voice) => voice.lang.includes("es-MX")) ||
      voices.find((voice) => voice.lang.includes("es-ES")) ||
      voices[0];

    if (bestVoice) utterance.voice = bestVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleAsk = async () => {
    const clean = question.trim();
    if (!clean) return;
    setQuestion("");
    await onAsk(clean);
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Usa Google Chrome para usar voz");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-CO";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = async (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(transcript);
      setIsListening(false);
      await onAsk(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
  };

  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, liveHint]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  return (
    <div className="soft-card flex h-full min-h-0 flex-col overflow-hidden rounded-[28px]">
      <div className="border-b border-slate-200 bg-gradient-to-r from-pink-50 to-yellow-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="overflow-hidden rounded-2xl border-4 border-white shadow-md">
            <Image
              src="/avatar/avatar.png"
              alt="Tutor IA"
              width={52}
              height={52}
              className="h-[52px] w-[52px] object-cover"
              priority
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-bold text-slate-900">🤖 Tutor en vivo</p>
                <p className="text-[11px] text-slate-600">El mismo chat te guía y responde.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">
                  {isSpeaking ? "Hablando" : "Listo"}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                  {isListening ? "Escuchando" : "Micrófono"}
                </span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => speakText(latestTutorMessage)}
                className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                🔊 Escuchar
              </button>
              <button
                onClick={stopSpeaking}
                className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-300"
              >
                ⏹️ Detener
              </button>
              <button
                onClick={startVoiceRecognition}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                🎤 Hablar
              </button>
              <button
                onClick={() => void onRefreshHint?.()}
                className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-200"
              >
                ✨ Pista
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div
          ref={chatContainerRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3"
        >
          {!!liveHint && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              ✨ {liveHint}
            </div>
          )}

          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-5 ${
                  msg.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-800"
                }`}
              >
                {msg.text}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">
              Aquí aparecerá la conversación con el tutor.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <label className="mb-1 block text-xs font-bold text-slate-700">Escribe tu pregunta</label>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="min-h-[76px] w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Ejemplo: ¿por qué falla este código?"
            rows={3}
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">Pregunta corta = respuesta corta.</p>
            <div className="flex gap-2">
              <button
                onClick={startVoiceRecognition}
                className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-200"
              >
                🎙️ Dictar
              </button>
              <button
                onClick={handleAsk}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-blue-700"
              >
                Preguntar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
