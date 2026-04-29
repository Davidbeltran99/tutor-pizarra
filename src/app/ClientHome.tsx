"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CodeEditor from "../components/CodeEditor";
import ConsolePanel from "../components/ConsolePanel";
import TutorAssistantPanel from "../components/TutorAssistantPanel";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type Student = {
  id: number;
  username: string;
  name: string;
  grade: string;
  created_at: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const DEFAULT_WELCOME = "¡Hola! 👋 Soy tu tutor de programación. Puedes preguntarme por texto o por voz.";

const getStoredValue = (key: string) => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "IA";
};

const isGenericAiFailure = (text: string) =>
  /no pude responder|no encontré explicación|no pude conectarme/i.test(text);

export default function ClientHome() {
  const [token, setToken] = useState<string | null>(() => getStoredValue("token"));
  const [username, setUsername] = useState(() => getStoredValue("username") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsMessage, setStudentsMessage] = useState("Cargando estudiantes...");
  const [isRefreshingHint, setIsRefreshingHint] = useState(false);

  const [code, setCode] = useState(`print("Hola profe Juan")`);
  const [output, setOutput] = useState("Sin salida todavía...");
  const [tutorMessage, setTutorMessage] = useState("");
  const [liveHint, setLiveHint] = useState("");

  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLiveCodeRef = useRef("");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: DEFAULT_WELCOME },
  ]);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    }),
    []
  );

  const resetTutorState = useCallback(() => {
    setOutput("Sin salida todavía...");
    setTutorMessage("");
    setLiveHint("");
    setCode(`print("Hola profe Juan")`);
    lastLiveCodeRef.current = "";
    setChatMessages([{ role: "assistant", text: DEFAULT_WELCOME }]);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setGrade("");
    setStudents([]);
    setStudentsMessage("Cargando estudiantes...");
    resetTutorState();
  }, [resetTutorState]);

  const handleSessionExpired = useCallback(() => {
    handleLogout();
    setAuthMessage("Tu sesión venció. Vuelve a entrar.");
  }, [handleLogout]);

  const fetchStudents = useCallback(async () => {
    if (!localStorage.getItem("token")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        method: "GET",
        headers: authHeaders(),
      });

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await response.json();
      const nextStudents = Array.isArray(data.students) ? data.students : [];
      setStudents(nextStudents);
      setStudentsMessage(nextStudents.length > 0 ? "" : "Todavía no hay estudiantes registrados.");
    } catch {
      setStudentsMessage("No pude cargar la lista de estudiantes.");
    }
  }, [authHeaders, handleSessionExpired]);

  const applyAuthSuccess = (data: {
    token: string;
    user?: { username?: string; name?: string; grade?: string };
  }) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.user?.username || username);
    setToken(data.token);
    setUsername(data.user?.username || username);
    setPassword("");
    setConfirmPassword("");
    setFullName(data.user?.name || "");
    setGrade(data.user?.grade || "");
    setAuthMessage("");
    setIsRegisterMode(false);
  };

  const handleLogin = async () => {
    setAuthMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.token) {
        setAuthMessage(data.message || "No se pudo iniciar sesión");
        return;
      }

      applyAuthSuccess(data);
    } catch {
      setAuthMessage("No se pudo conectar con el servidor");
    }
  };

  const handleRegister = async () => {
    setAuthMessage("");

    if (password !== confirmPassword) {
      setAuthMessage("Las contraseñas no coinciden");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: username,
          password,
          name: fullName,
          grade,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.token) {
        setAuthMessage(data.message || "No se pudo crear la cuenta");
        return;
      }

      applyAuthSuccess(data);
    } catch {
      setAuthMessage("No se pudo conectar con el servidor");
    }
  };

  const requestLiveHelp = useCallback(
    async (manual = false) => {
      if (!token) return;
      const trimmedCode = code.trim();

      if (trimmedCode.length < 8) {
        setLiveHint("");
        return;
      }

      if (!manual && trimmedCode === lastLiveCodeRef.current) return;

      if (manual) setIsRefreshingHint(true);

      try {
        const response = await fetch(`${API_BASE_URL}/live-help`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ code }),
        });

        if (response.status === 401) {
          handleSessionExpired();
          return;
        }

        const data = await response.json();
        const nextHint = String(data.hint || "").trim();

        if (!nextHint || isGenericAiFailure(nextHint)) return;

        lastLiveCodeRef.current = trimmedCode;
        setLiveHint(nextHint);
      } catch {
        if (manual) setLiveHint("No pude actualizar la pista ahora mismo.");
      } finally {
        if (manual) setIsRefreshingHint(false);
      }
    },
    [authHeaders, code, handleSessionExpired, token]
  );

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      void fetchStudents();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStudents, token]);

  useEffect(() => {
    if (!token) return;

    if (liveTimerRef.current) clearTimeout(liveTimerRef.current);

    liveTimerRef.current = setTimeout(() => {
      void requestLiveHelp(false);
    }, 5000);

    return () => {
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    };
  }, [code, requestLiveHelp, token]);

  const ejecutarCodigo = async () => {
    setOutput("Ejecutando...");
    setTutorMessage("Estoy revisando tu código...");

    try {
      const inputMatches = code.match(/input\s*\(/g) || [];
      const inputsArray: string[] = [];

      if (inputMatches.length > 0) {
        for (let index = 0; index < inputMatches.length; index++) {
          const userValue = prompt(`Ingresa valor para input #${index + 1}`);
          inputsArray.push(userValue || "");
        }
      }

      const response = await fetch(`${API_BASE_URL}/run`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ code, inputs: inputsArray }),
      });

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await response.json();
      const result = data.output || "Sin salida";
      const tutor = data.tutor || "Código ejecutado.";

      setOutput(result);
      setTutorMessage(tutor);
      if (!isGenericAiFailure(tutor)) setLiveHint(tutor);

      setChatMessages((prevMessages) => {
        const last = prevMessages[prevMessages.length - 1];
        if (last?.role === "assistant" && last.text === tutor) return prevMessages;
        return [...prevMessages, { role: "assistant", text: tutor }];
      });
    } catch {
      setOutput("Error conectando con backend");
      setTutorMessage("No pude conectarme con el servidor.");
    }
  };

  const preguntarTutor = async (question: string) => {
    if (!question.trim()) return;

    setChatMessages((prevMessages) => [...prevMessages, { role: "user", text: question }]);
    setTutorMessage("Pensando...");

    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          question,
          codeContext: code,
          liveHintContext: liveHint,
        }),
      });

      if (response.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await response.json();
      const answer = data.answer || "No pude responder.";

      setTutorMessage(answer);
      setChatMessages((prevMessages) => [...prevMessages, { role: "assistant", text: answer }]);
    } catch {
      const errorText = "No pude conectarme con el servidor.";
      setTutorMessage(errorText);
      setChatMessages((prevMessages) => [...prevMessages, { role: "assistant", text: errorText }]);
    }
  };

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_28px_60px_rgba(15,23,42,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-600 to-cyan-500 p-8 text-white lg:flex">
            <div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                Tutor IA
              </span>
              <h1 className="mt-6 text-4xl font-bold leading-tight">
                Aprende programación de forma simple y divertida.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-blue-50">
                Un lugar para escribir código, ver resultados y recibir ayuda clara del tutor.
              </p>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="rounded-3xl bg-white/15 p-4">✅ Más claro y más fácil de usar</div>
              <div className="rounded-3xl bg-white/15 p-4">🎤 Puedes preguntar por voz o por texto</div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mx-auto w-full max-w-md">
              <h2 className="text-3xl font-bold text-slate-900">
                {isRegisterMode ? "Crear cuenta" : "Entrar"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isRegisterMode ? "Crea una cuenta para usar el tutor." : "Ingresa para seguir practicando."}
              </p>

              <div className="mt-8 space-y-4">
                {isRegisterMode && (
                  <>
                    <input
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Nombre completo"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                    />
                    <input
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="Grado o nivel"
                      value={grade}
                      onChange={(event) => setGrade(event.target.value)}
                    />
                  </>
                )}

                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Usuario"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />

                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Contraseña"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                {isRegisterMode && (
                  <input
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Confirmar contraseña"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                )}
              </div>

              <button
                onClick={isRegisterMode ? handleRegister : handleLogin}
                className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-md transition ${
                  isRegisterMode ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isRegisterMode ? "Crear cuenta" : "Entrar"}
              </button>

              <button
                onClick={() => {
                  setAuthMessage("");
                  setPassword("");
                  setConfirmPassword("");
                  setIsRegisterMode((prev) => !prev);
                }}
                className="mt-3 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                {isRegisterMode ? "Ya tengo cuenta" : "Crear cuenta nueva"}
              </button>

              {authMessage && (
                <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{authMessage}</p>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-4 lg:px-6 lg:py-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <section className="soft-card rounded-[30px] p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                  Tutor activo
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  Usuario: {username || "Estudiante"}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  Estudiantes: {students.length}
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Tutor IA de Programación</h1>
              <p className="mt-1 text-sm text-slate-600">
                Un espacio compacto para escribir, ejecutar y resolver dudas rápido.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={ejecutarCodigo}
                className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
              >
                ▶ Ejecutar código
              </button>
              <button
                onClick={handleLogout}
                className="rounded-2xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-300"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Tutor en vivo:</span>{" "}
            {isRefreshingHint ? "Actualizando pista..." : liveHint || "Empieza a escribir o pulsa ✨ Pista para recibir ayuda."}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_430px]">
          <div className="flex min-h-0 flex-col gap-4">
            <div className="min-h-[320px] xl:h-[380px]">
              <CodeEditor code={code} setCode={setCode} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="min-h-[210px] lg:h-[240px]">
                <ConsolePanel
                  output={output}
                  isSuccess={
                    !!output &&
                    output !== "Sin salida todavía..." &&
                    !/error|traceback/i.test(output)
                  }
                />
              </div>

              <div className="soft-card overflow-hidden rounded-[28px] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Estudiantes registrados</h2>
                    <p className="text-xs text-slate-500">Lista rápida</p>
                  </div>

                  <button
                    onClick={() => void fetchStudents()}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Actualizar
                  </button>
                </div>

                <div className="max-h-[190px] space-y-2 overflow-y-auto pr-1">
                  {students.length > 0 ? (
                    students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xs font-bold text-white">
                          {getInitials(student.name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="truncate text-sm font-bold text-slate-900">{student.name}</p>
                              <p className="text-xs text-slate-500">@{student.username}</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                              {student.grade || "Sin grado"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Registrado el {formatDate(student.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{studentsMessage}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-[640px] xl:h-[calc(100vh-170px)]">
            <TutorAssistantPanel
              message={tutorMessage}
              liveHint={liveHint}
              messages={chatMessages}
              onAsk={preguntarTutor}
              onRefreshHint={() => requestLiveHelp(true)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
