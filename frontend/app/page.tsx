import PdfUpload from "./components/PdfUpload";
import AudioAssistant from "./components/AudioAssistant";

export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-bold text-center mb-8 text-blue-400">
        リアルタイム顧客対応アシスタント
      </h1>
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-6">
        <PdfUpload />
        <AudioAssistant />
      </div>
    </main>
  );
}