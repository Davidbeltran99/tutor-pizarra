"use client";

import React, { useMemo, useRef, useState } from "react";
import { Stage, Layer, Line, Rect, Text } from "react-konva";

type DrawLine = {
  points: number[];
};

type TutorResult = {
  is_correct?: boolean;
  feedback?: string;
  hint?: string;
  student_answer?: string;
};

type Exercise = {
  question: string;
  answer: string;
};

function generateExercise(): Exercise {
  const operations = ["+", "-"];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  if (operation === "+") {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;

    return {
      question: `${a} + ${b} = ?`,
      answer: String(a + b),
    };
  }

  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * a) + 1;

  return {
    question: `${a} - ${b} = ?`,
    answer: String(a - b),
  };
}

export default function Whiteboard() {
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TutorResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [rawText, setRawText] = useState("");
  const [finalAnswer, setFinalAnswer] = useState("");
  const [exercise, setExercise] = useState<Exercise>(() => generateExercise());

  const stageRef = useRef<any>(null);

  const exerciseLabel = useMemo(() => exercise.question, [exercise]);

  const handleMouseDown = (e: any) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;

    setLines((prev) => [...prev, { points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (!point) return;

    setLines((prev) => {
      const lastLine = prev[prev.length - 1];
      if (!lastLine) return prev;

      const updatedLastLine = {
        ...lastLine,
        points: [...lastLine.points, point.x, point.y],
      };

      return [...prev.slice(0, -1), updatedLastLine];
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearBoard = () => {
    setLines([]);
    setPreviewImage(null);
    setLoading(false);
    setResult(null);
    setErrorMessage("");
    setRawText("");
    setFinalAnswer("");
  };

  const newExercise = () => {
    clearBoard();
    setExercise(generateExercise());
  };

  const reviewWithAI = async () => {
    if (!stageRef.current) return;

    if (!finalAnswer.trim()) {
      setErrorMessage("Escribe la respuesta final antes de revisar.");
      return;
    }

    const dataURL = stageRef.current.toDataURL({ pixelRatio: 3 });
    setPreviewImage(dataURL);
    setLoading(true);
    setResult(null);
    setErrorMessage("");
    setRawText("");

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exercise: exercise.question,
          expectedAnswer: exercise.answer,
          finalAnswer: finalAnswer.trim(),
          image: dataURL,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setErrorMessage(data.message || "Error con OpenAI");
        return;
      }

      setRawText(data.result || "");

      try {
        const parsed = JSON.parse(data.result);
        setResult(parsed);
      } catch {
        setErrorMessage("OpenAI respondió, pero no devolvió JSON válido.");
      }
    } catch {
      setErrorMessage("No se pudo conectar con el backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "760px" }}>
      <div style={{ marginBottom: "18px" }}>
        <p style={{ fontSize: "22px", margin: 0 }}>
          Ejercicio: <strong>{exerciseLabel}</strong>
        </p>
      </div>

      <Stage
        width={600}
        height={360}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          border: "2px solid #d1d5db",
          background: "#ffffff",
          borderRadius: "12px",
        }}
      >
        <Layer>
          <Text
            x={20}
            y={20}
            text="Usa la pizarra para hacer tus cuentas"
            fontSize={22}
            fill="#374151"
          />

          <Rect
            x={150}
            y={90}
            width={300}
            height={180}
            stroke="#9ca3af"
            strokeWidth={3}
            cornerRadius={16}
            dash={[10, 8]}
          />

          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke="black"
              strokeWidth={12}
              tension={0.2}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Layer>
      </Stage>

      <div style={{ marginTop: "18px" }}>
        <label
          htmlFor="finalAnswer"
          style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}
        >
          Respuesta final
        </label>

        <input
          id="finalAnswer"
          type="text"
          value={finalAnswer}
          onChange={(e) => setFinalAnswer(e.target.value)}
          placeholder="Escribe aquí tu respuesta"
          style={{
            width: "100%",
            maxWidth: "320px",
            padding: "12px",
            fontSize: "18px",
            border: "1px solid #9ca3af",
            borderRadius: "8px",
            outline: "none",
            color: "black",
            background: "white",
          }}
        />
      </div>

      <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={clearBoard}
          style={{
            padding: "10px 16px",
            background: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          Borrar
        </button>

        <button
          onClick={reviewWithAI}
          disabled={loading}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
            fontSize: "15px",
          }}
        >
          {loading ? "Revisando..." : "Revisar"}
        </button>

        <button
          onClick={newExercise}
          style={{
            padding: "10px 16px",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          Nuevo ejercicio
        </button>
      </div>

      {previewImage && (
        <div style={{ marginTop: "20px" }}>
          <p style={{ fontWeight: "bold" }}>Vista previa:</p>
          <img
            src={previewImage}
            alt="Vista previa de la pizarra"
            style={{
              border: "1px solid #ccc",
              background: "white",
              maxWidth: "600px",
              borderRadius: "10px",
            }}
          />
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            border: "1px solid #7f1d1d",
            borderRadius: "8px",
          }}
        >
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: "20px",
            padding: "14px",
            border: "1px solid #374151",
            borderRadius: "10px",
          }}
        >
          <p><strong>Resultado del tutor:</strong></p>
          <p>¿Correcto?: {result.is_correct ? "Sí" : "No"}</p>
          <p>Respuesta del estudiante: {result.student_answer || "No detectada"}</p>
          <p>Feedback: {result.feedback || "Sin feedback"}</p>
          <p>Pista: {result.hint || "Sin pista"}</p>
        </div>
      )}

      {rawText && (
        <details style={{ marginTop: "14px" }}>
          <summary>Ver respuesta cruda</summary>
          <pre style={{ whiteSpace: "pre-wrap" }}>{rawText}</pre>
        </details>
      )}
    </div>
  );
}