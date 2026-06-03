"use client";

import { useState } from "react";

export default function PdfUpload() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    filename: string;
    chunks: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload-pdf`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "アップロード失敗");
      }

      const data = await response.json();
      setResult({ filename: data.filename, chunks: data.chunks });
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h2 className="text-lg font-semibold mb-4 text-slate-200">
        📄 社内ドキュメントをアップロード
      </h2>

      <label className="block">
        <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
          {uploading ? (
            <div className="text-blue-400">
              <div className="animate-spin text-3xl mb-2">⏳</div>
              <p>アップロード中・ベクトル化中...</p>
            </div>
          ) : (
            <div className="text-slate-400">
              <div className="text-3xl mb-2">📁</div>
              <p>PDFファイルをクリックして選択</p>
              <p className="text-sm mt-1">FAQ・製品仕様・マニュアル等</p>
            </div>
          )}
        </div>
        <input
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {result && (
        <div className="mt-4 p-4 bg-green-900/40 border border-green-700 rounded-lg">
          <p className="text-green-400 font-medium">✅ アップロード完了</p>
          <p className="text-slate-300 text-sm mt-1">
            {result.filename} → {result.chunks}チャンクに分割してベクトル化しました
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-900/40 border border-red-700 rounded-lg">
          <p className="text-red-400 font-medium">❌ エラー</p>
          <p className="text-slate-300 text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}