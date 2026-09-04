import React, { useEffect, useState } from 'react';
import { useFactory } from '../context/FactoryContext';
import { 
  FolderCheck, 
  RefreshCw, 
  Zap, 
  X, 
  FileJson, 
  CheckCircle2, 
  ArrowRight,
  HardDrive
} from 'lucide-react';

export const FolderSyncBanner: React.FC = () => {
  const { 
    lastFolderFileChangeNotice, 
    clearFolderChangeNotice,
    targetDirectory,
    targetProjectFilename,
    folderWatchActive,
    checkFolderNow
  } = useFactory();

  const [visible, setVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (lastFolderFileChangeNotice) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [lastFolderFileChangeNotice]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await checkFolderNow();
    } finally {
      setTimeout(() => setIsChecking(false), 500);
    }
  };

  if (!visible || !lastFolderFileChangeNotice) {
    return null;
  }

  const timeStr = new Date(lastFolderFileChangeNotice.timestamp).toLocaleTimeString('ru-RU');

  return (
    <div 
      id="folder-live-sync-banner"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500/80 text-white rounded-2xl shadow-2xl p-3.5 sm:p-4 flex items-start sm:items-center gap-3.5">
        {/* Animated Icon */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
            {lastFolderFileChangeNotice.source === 'server_disk' ? (
              <HardDrive className="w-5 h-5 animate-pulse" />
            ) : (
              <FolderCheck className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Обновление из общей папки в реальном времени
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
              {timeStr}
            </span>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-white mt-0.5 truncate">
            Файл «{lastFolderFileChangeNotice.filename}» изменен другим устройством
          </p>

          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-300 flex-wrap">
            <span className="flex items-center gap-1 text-emerald-300 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              Схема на главном экране мгновенно обновлена
            </span>
            {lastFolderFileChangeNotice.summary && (
              <span className="text-slate-400 font-mono">
                • {lastFolderFileChangeNotice.summary}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            title="Проверить файл в папке повторно"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              clearFolderChangeNotice();
            }}
            title="Закрыть уведомление"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
