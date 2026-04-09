"use client";

import { useEffect, useRef, useState } from "react";

export default function DidAvatar() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const agentRef = useRef<any>(null);
  const [status, setStatus] = useState("iniciando...");

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setStatus("pidiendo client key...");

        const res = await fetch("/api/did/client-key", {
          method: "POST",
        });

        const rawText = await res.text();
        let data: any = null;

        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error(
            `La ruta /api/did/client-key no devolvió JSON. Respuesta: ${rawText.slice(0, 120)}`
          );
        }

        if (!res.ok) {
          throw new Error(data?.message || "No se pudo obtener client key");
        }

        if (!data?.client_key) {
          throw new Error("D-ID no devolvió client_key");
        }

        const agentId = process.env.NEXT_PUBLIC_DID_AGENT_ID;

        if (!agentId) {
          throw new Error("Falta NEXT_PUBLIC_DID_AGENT_ID en .env.local");
        }

        setStatus("cargando SDK de D-ID...");

        const did = await import("@d-id/client-sdk");

        setStatus("creando conexión con avatar...");

        const auth = {
          type: "key" as const,
          clientKey: data.client_key,
        };

        const callbacks = {
          onSrcObjectReady(value: MediaStream) {
            if (videoRef.current) {
              videoRef.current.srcObject = value;
            }
          },
          onConnectionStateChange(state: string) {
            if (!mounted) return;
            setStatus(`estado: ${state}`);
          },
          onNewMessage(messages: unknown, type?: unknown) {
            console.log("D-ID mensajes:", messages, type);
          },
        };

        const agent = await did.createAgentManager(agentId, {
          auth,
          callbacks,
        });

        agentRef.current = agent;

        setStatus("conectando...");
        await agent.connect();

        if (mounted) {
          setStatus("avatar listo 🎉");
        }
      } catch (error: any) {
        console.error("ERROR D-ID:", error);
        if (mounted) {
          setStatus(error?.message || "Error conectando con D-ID");
        }
      }
    }

    init();

    return () => {
      mounted = false;

      const currentAgent = agentRef.current;
      if (currentAgent?.disconnect) {
        currentAgent.disconnect().catch((err: unknown) => {
          console.error("Error al desconectar D-ID:", err);
        });
      }
    };
  }, []);

  return (
    <div
      style={{
        width: 320,
        padding: 12,
        border: "1px solid #d1d5db",
        borderRadius: 12,
        background: "#111827",
        color: "white",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          minHeight: 420,
          objectFit: "cover",
          borderRadius: 10,
          background: "black",
        }}
      />

      <p style={{ marginTop: 10, fontSize: 14 }}>D-ID: {status}</p>
    </div>
  );
}