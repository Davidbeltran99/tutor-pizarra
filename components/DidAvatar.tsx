"use client";

import { useEffect, useRef, useState } from "react";

type ClientKeyApiResponse = {
  ok?: boolean;
  client_key?: string;
  allowed_domains?: string[];
  message?: string;
  description?: string;
};

export default function DidAvatar() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const agentRef = useRef<unknown>(null);
  const [status, setStatus] = useState("iniciando...");

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setStatus("pidiendo client key...");

        const res = await fetch("/api/did/client-key", {
          method: "GET",
        });

        const data = (await res.json()) as ClientKeyApiResponse;

        if (!res.ok || !data?.client_key) {
          throw new Error(
            data?.message ||
              data?.description ||
              "No se pudo obtener client key"
          );
        }

        if (
          Array.isArray(data.allowed_domains) &&
          !data.allowed_domains.includes("http://localhost:3000")
        ) {
          throw new Error(
            "El client_key existe, pero no permite http://localhost:3000"
          );
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
      } catch (error) {
        console.error("ERROR D-ID:", error);

        if (mounted) {
          setStatus(
            error instanceof Error
              ? error.message
              : "Error conectando con D-ID"
          );
        }
      }
    }

    init();

    return () => {
      mounted = false;

      const currentAgent = agentRef.current as {
        disconnect?: () => Promise<void>;
      } | null;

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
        muted
        style={{
          width: "100%",
          minHeight: 420,
          objectFit: "cover",
          borderRadius: 10,
          background: "black",
        }}
      />
      <p
        style={{
          marginTop: 10,
          fontSize: 14,
          color: "#9ca3af",
        }}
      >
        {status}
      </p>
    </div>
  );
}