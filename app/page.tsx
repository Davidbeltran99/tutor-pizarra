import Whiteboard from "../components/Whiteboard";
import DidAvatar from "../components/DidAvatar";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Tutor con Avatar 🤖</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: 20,
        }}
      >
        <DidAvatar />
        <Whiteboard />
      </div>
    </main>
  );
}