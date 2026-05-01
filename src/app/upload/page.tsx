'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, CheckCircle, AlertCircle, FileArchive, ArrowRight, Loader2, Music2 } from 'lucide-react';

interface UploadResult {
  inserted: number;
  skipped: number;
  filesProcessed: string[];
}

export default function UploadPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      setError('Please upload a .zip file');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setError('');
    setResult(null);

    const tick = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 3, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      clearInterval(tick);
      setProgress(100);

      if (!res.ok) {
        setError(data.error ?? 'Upload failed');
        setStatus('error');
      } else {
        setResult(data);
        setStatus('success');
      }
    } catch {
      clearInterval(tick);
      setError('Network error while uploading');
      setStatus('error');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/zip': ['.zip'] },
    maxFiles: 1,
    disabled: status === 'uploading',
  });

  return (
    <div className="min-h-screen bg-spotify-bg flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2 text-spotify-green font-bold text-lg">
          <Music2 className="w-5 h-5" />
          Wrapped
        </Link>
        <Link href="/dashboard" className="text-spotify-gray hover:text-white text-sm transition-colors">
          ← Back to dashboard
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold mb-3">Upload Your Data</h1>
            <p className="text-spotify-gray text-lg">
              Drop your Spotify data ZIP file to import your listening history
            </p>
          </div>

          {status === 'idle' || status === 'error' ? (
            <>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300
                  ${isDragActive
                    ? 'border-spotify-green bg-spotify-green/10 scale-[1.02]'
                    : 'border-white/20 hover:border-spotify-green/50 hover:bg-white/3'
                  }
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isDragActive ? 'bg-spotify-green/20' : 'bg-white/5'}`}>
                    {isDragActive ? (
                      <FileArchive className="w-10 h-10 text-spotify-green" />
                    ) : (
                      <Upload className="w-10 h-10 text-white/40" />
                    )}
                  </div>
                  <div>
                    <p className="text-xl font-semibold mb-1">
                      {isDragActive ? 'Drop it!' : 'Drag & drop your ZIP file'}
                    </p>
                    <p className="text-spotify-gray text-sm">
                      or <span className="text-spotify-green">click to browse</span>
                    </p>
                  </div>
                  <p className="text-xs text-white/30">
                    Accepts the ZIP from Spotify&apos;s &quot;Request your data&quot; feature
                  </p>
                </div>
              </div>

              {status === 'error' && (
                <div className="mt-4 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-5 py-4">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="mt-6 bg-spotify-card rounded-xl p-5 border border-white/5">
                <p className="text-sm font-medium text-white mb-3">What&apos;s supported</p>
                <ul className="space-y-2 text-sm text-spotify-gray">
                  <li className="flex items-center gap-2"><span className="text-spotify-green">✓</span> Spotify Extended Streaming History (Streaming_History_Audio_*.json)</li>
                  <li className="flex items-center gap-2"><span className="text-spotify-green">✓</span> Spotify Account Data (StreamingHistory_music_*.json)</li>
                  <li className="flex items-center gap-2"><span className="text-spotify-green">✓</span> Duplicate detection — re-uploading is safe</li>
                </ul>
              </div>
            </>
          ) : status === 'uploading' ? (
            <div className="bg-spotify-card rounded-2xl p-10 border border-white/5 text-center">
              <Loader2 className="w-12 h-12 text-spotify-green animate-spin mx-auto mb-5" />
              <p className="text-xl font-semibold mb-2">Processing your history…</p>
              <p className="text-spotify-gray text-sm mb-6">This may take a minute for large files</p>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-spotify-green rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-white/30 mt-2">{Math.round(progress)}%</p>
            </div>
          ) : (
            <div className="bg-spotify-card rounded-2xl p-10 border border-white/5 text-center">
              <div className="w-20 h-20 bg-spotify-green/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-10 h-10 text-spotify-green" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Import complete!</h2>
              <p className="text-spotify-gray mb-6">Your listening history has been imported</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-3xl font-bold text-spotify-green">{result?.inserted.toLocaleString()}</p>
                  <p className="text-sm text-spotify-gray mt-1">New records added</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-3xl font-bold text-white/60">{result?.skipped.toLocaleString()}</p>
                  <p className="text-sm text-spotify-gray mt-1">Duplicates skipped</p>
                </div>
              </div>

              {result?.filesProcessed && result.filesProcessed.length > 0 && (
                <div className="mb-8 text-left bg-white/3 rounded-lg p-4">
                  <p className="text-xs text-spotify-gray mb-2 font-medium">FILES PROCESSED</p>
                  {result.filesProcessed.map((f) => (
                    <p key={f} className="text-xs text-white/50 font-mono">{f}</p>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStatus('idle'); setProgress(0); }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-full transition-colors"
                >
                  Upload more
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 bg-spotify-green hover:bg-green-400 text-black font-bold py-3 rounded-full transition-colors flex items-center justify-center gap-2"
                >
                  View Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
