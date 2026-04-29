import Editor from "@monaco-editor/react";

type Props = {
  code: string;
  setCode: (value: string) => void;
};

export default function CodeEditor({ code, setCode }: Props) {
  return (
    <div className="h-full overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-white">Editor de código</p>
          <p className="text-xs text-slate-400">Escribe tu programa aquí</p>
        </div>

        <span className="rounded-full bg-blue-500/15 px-2 py-1 text-xs font-medium text-blue-200">
          Python
        </span>
      </div>

      <div className="h-[calc(100%-60px)]">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={(value) => setCode(value || "")}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            lineNumbersMinChars: 2,
            roundedSelection: true,
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}