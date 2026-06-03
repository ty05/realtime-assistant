"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Utterance {
  id: string;
  text: string;
  aiResponse: string | null;
  needsRag: boolean;
  needsLlm: boolean;
  ragSources: string[];
  loading: boolean;
}

export default function AudioAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [status, setStatus] = useState<string>("待機中");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const sessionIdRef = useRef<string>("");
  const startSegmentRef = useRef<((stream: MediaStream) => void) | null>(null);

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  const sendAudio = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size < 1000) return;

    const utteranceId = crypto.randomUUID();

    setUtterances((prev) => [
      ...prev,
      {
        id: utteranceId,
        text: "🎤 認識中...",
        aiResponse: null,
        needsRag: false,
        needsLlm: false,
        ragSources: [],
        loading: true,
      },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/process-audio?session_id=${sessionIdRef.current}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.text || data.text.trim() === "" || data.skip) {
        setUtterances((prev) => prev.filter((u) => u.id !== utteranceId));
        return;
      }

      setUtterances((prev) =>
        prev.map((u) =>
          u.id === utteranceId
            ? {
                ...u,
                text: data.text,
                aiResponse: data.ai_response,
                needsRag: data.needs_rag,
                needsLlm: data.needs_llm,
                ragSources: data.rag_sources || [],
                loading: false,
              }
            : u
        )
      );
    } catch {
      setUtterances((prev) => prev.filter((u) => u.id !== utteranceId));
    }
  }, []);

  const startSegment = useCallback((stream: MediaStream) => {
    if (!isRecordingRef.current) return;

    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      if (!isRecordingRef.current) return;
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      sendAudio(audioBlob);
      setTimeout(() => startSegmentRef.current?.(stream), 100);
      setStatus("録音中 🎤");
    };

    mediaRecorder.start();
  }, [sendAudio]);

  useEffect(() => {
    startSegmentRef.current = startSegment;
  }, [startSegment]);

  const startVAD = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    analyser.fftSize = 512;
    source.connect(analyser);
    audioContextRef.current = audioContext;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkVolume = () => {
      if (!isRecordingRef.current) return;
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;

      if (volume > 15) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else {
        if (!silenceTimerRef.current && mediaRecorderRef.current?.state === "recording") {
          silenceTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              mediaRecorderRef.current.stop();
              setStatus("処理中...");
            }
            silenceTimerRef.current = null;
          }, 800);
        }
      }
      requestAnimationFrame(checkVolume);
    };
    checkVolume();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;
      isRecordingRef.current = true;
      setIsRecording(true);
      setStatus("録音中 🎤");
      startVAD(stream);
      startSegment(stream);
    } catch {
      setStatus("マイクへのアクセスが拒否されました");
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setStatus("待機中");

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (audioContextRef.current) audioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-200">
          🎙️ リアルタイム対応アシスタント
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{status}</span>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {isRecording ? "⏹ 停止" : "▶ スタート"}
          </button>
        </div>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {utterances.length === 0 && (
          <div className="text-center text-slate-500 py-16">
            スタートボタンを押して会話を始めてください
          </div>
        )}

        {utterances.map((u) => (
          <div key={u.id} className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">顧客の発言</p>
              <p className="text-slate-100">
                {u.loading ? (
                  <span className="animate-pulse text-slate-400">🎤 認識中...</span>
                ) : (
                  u.text
                )}
              </p>
            </div>

            <div
              className={`rounded-lg p-4 ${
                u.loading
                  ? "bg-slate-700"
                  : u.needsRag
                  ? "bg-blue-900/40 border border-blue-700"
                  : u.needsLlm
                  ? "bg-purple-900/40 border border-purple-700"
                  : "bg-slate-700/40"
              }`}
            >
              {u.loading ? (
                <p className="text-slate-400 animate-pulse">⏳ 分析中...</p>
              ) : u.aiResponse ? (
                <>
                  <p className="text-xs text-slate-400 mb-1">
                    {u.needsRag ? "📚 ドキュメントから回答" : "💡 AI提案"}
                  </p>
                  <p className="text-slate-100 text-sm">{u.aiResponse}</p>
                  {u.ragSources.length > 0 && (
                    <p className="text-xs text-blue-400 mt-2">
                      出典: {u.ragSources.join(", ")}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-slate-500 text-sm">—</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}