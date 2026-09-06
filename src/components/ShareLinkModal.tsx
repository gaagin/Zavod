import React, { useState, useEffect } from 'react';
import { useFactory } from '../context/FactoryContext';
import { 
  generateElementUrl, 
  copyTextToClipboard, 
  generateQrCodeDataUrl, 
  LinkParamType 
} from '../utils/linkUtils';
import { EquipmentNode, ContainerNode } from '../types';
import { 
  X, 
  Copy, 
  Check, 
  QrCode, 
  ExternalLink, 
  Link2, 
  Share2, 
  Barcode, 
  Tag, 
  Hash, 
  Download, 
  CheckCircle2, 
  Compass,
  FileCode
} from 'lucide-react';

interface ShareLinkModalProps {
  nodeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ nodeId, isOpen, onClose }) => {
  const { state, focusNode, showToast } = useFactory();

  const [activeParamType, setActiveParamType] = useState<LinkParamType>('element');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'integrations'>('link');

  const targetNode = nodeId 
    ? (state.equipment.find(e => e.id === nodeId) || state.containers.find(c => c.id === nodeId))
    : null;

  const eq = targetNode && targetNode.type === 'equipment' ? (targetNode as EquipmentNode) : null;
  const barcode = eq?.barcode || eq?.barkod;
  const stockCode = eq?.stockCode || eq?.stokKod;

  const currentUrl = targetNode ? generateElementUrl(targetNode, activeParamType) : '';
  const directIdUrl = targetNode ? generateElementUrl(targetNode, 'element') : '';
  const tagUrl = targetNode ? generateElementUrl(targetNode, 'tag') : '';
  const barcodeUrl = targetNode && barcode ? generateElementUrl(targetNode, 'barcode') : '';
  const stockCodeUrl = targetNode && stockCode ? generateElementUrl(targetNode, 'stockCode') : '';
  const markdownText = targetNode ? `[${targetNode.name} (${targetNode.tag})](${currentUrl})` : '';
  const htmlText = targetNode ? `<a href="${currentUrl}" target="_blank" rel="noopener noreferrer">${targetNode.name} (${targetNode.tag})</a>` : '';

  // Generate QR code on URL change
  useEffect(() => {
    if (!targetNode || !isOpen) return;
    let isMounted = true;
    generateQrCodeDataUrl(currentUrl).then(dataUrl => {
      if (isMounted) {
        setQrCodeUrl(dataUrl);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentUrl, targetNode, isOpen]);

  if (!isOpen || !targetNode) return null;

  const handleCopy = async (text: string, key: string, label = 'Ссылка') => {
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedKey(key);
      showToast(`${label} скопирована! 📋`, 'Готово к вставке в другой сервис, браузер или мессенджер', 'success');
      setTimeout(() => {
        setCopiedKey(null);
      }, 2500);
    } else {
      showToast('Не удалось скопировать', 'Пожалуйста, скопируйте текст вручную', 'error');
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `QR_${targetNode.tag}_${targetNode.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('QR-код скачан', 'Файл изображения сохранен на вашем устройстве', 'info');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col text-slate-800 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                  {targetNode.tag}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {targetNode.type === 'equipment' ? 'Оборудование' : 'Цех / Зона'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {targetNode.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-white/10 px-4 gap-4 bg-slate-100/50 dark:bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('link')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'link'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Прямые ссылки (URL)</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'qr'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR-код для цеха</span>
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'integrations'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Интеграция с 1C / ERP</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {activeTab === 'link' && (
            <>
              {/* Type selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Тип идентификатора в ссылке:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setActiveParamType('element')}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeParamType === 'element'
                        ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <Hash className="w-3 h-3" />
                    <span>По ID</span>
                  </button>
                  <button
                    onClick={() => setActiveParamType('tag')}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeParamType === 'tag'
                        ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>По тегу</span>
                  </button>
                  {barcode && (
                    <button
                      onClick={() => setActiveParamType('barcode')}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeParamType === 'barcode'
                          ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <Barcode className="w-3 h-3" />
                      <span>По Barkod</span>
                    </button>
                  )}
                  {stockCode && (
                    <button
                      onClick={() => setActiveParamType('stockCode')}
                      className={`px-2 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeParamType === 'stockCode'
                          ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <Tag className="w-3 h-3 text-indigo-400" />
                      <span>По Stok kod</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Primary URL box */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Прямая веб-ссылка для перехода:
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">
                    {currentUrl}
                  </div>
                  <button
                    onClick={() => handleCopy(currentUrl, 'main-url', 'Прямая ссылка')}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'main-url' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Скопировать</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  💡 При открытии этой ссылки в браузере или другом сервисе SCADA автоматически развернет схему, отцентрирует рабочее окно на данном узле и подсветит его.
                </p>
              </div>

              {/* Alternative Quick Copies */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Быстрое копирование в других форматах:
                </div>

                <div className="space-y-1.5">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Markdown ссылка (для Telegram, Jira, Notion):</span>
                      <code className="text-slate-800 dark:text-slate-200 font-mono text-[11px] truncate block">{markdownText}</code>
                    </div>
                    <button
                      onClick={() => handleCopy(markdownText, 'markdown', 'Markdown-ссылка')}
                      className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
                      title="Скопировать Markdown"
                    >
                      {copiedKey === 'markdown' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">HTML ссылка (для порталов и отчетов):</span>
                      <code className="text-slate-800 dark:text-slate-200 font-mono text-[11px] truncate block">{htmlText}</code>
                    </div>
                    <button
                      onClick={() => handleCopy(htmlText, 'html', 'HTML-ссылка')}
                      className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
                      title="Скопировать HTML"
                    >
                      {copiedKey === 'html' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-3 py-2">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-white/10">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt={`QR-код для ${targetNode.name}`} 
                    className="w-48 h-48 rounded-lg" 
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400 font-mono text-xs">
                    Генерация QR-кода...
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  QR-код для физической маркировки оборудования
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Распечатайте и наклейте на агрегат в цеху. Оператор или инженер сможет навести камеру смартфона/планшета и мгновенно открыть этот станок на интерактивной карте.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleDownloadQR}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать изображение (PNG)</span>
                </button>
                <button
                  onClick={() => handleCopy(currentUrl, 'qr-url', 'Ссылка QR-кода')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 dark:border-white/10 cursor-pointer"
                >
                  {copiedKey === 'qr-url' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>Копировать URL</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Compass className="w-4 h-4" />
                  <span>Интеграция с внешними системами</span>
                </div>
                <p className="text-[11px] text-blue-700 dark:text-blue-300/90">
                  Внешние сервисы (1C:Предприятие, SAP ERP, WMS-склады, Telegram-боты оповещения, корпоративные Wiki) могут формировать гиперссылки на элементы схемы, используя параметры запроса.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                    <Hash className="w-3.5 h-3.5 text-blue-500" />
                    <span>1. Переход по ID узла:</span>
                  </div>
                  <code className="text-[11px] font-mono text-blue-600 dark:text-blue-400 block break-all">
                    ?element={targetNode.id}
                  </code>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-500" />
                    <span>2. Переход по тегу агрегата:</span>
                  </div>
                  <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 block break-all">
                    ?tag={targetNode.tag}
                  </code>
                </div>

                {barcode && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                      <Barcode className="w-3.5 h-3.5 text-purple-500" />
                      <span>3. Переход по штрихкоду (Barkod):</span>
                    </div>
                    <code className="text-[11px] font-mono text-purple-600 dark:text-purple-400 block break-all">
                      ?barcode={barcode}
                    </code>
                  </div>
                )}

                {stockCode && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                      <Tag className="w-3.5 h-3.5 text-indigo-500" />
                      <span>4. Переход по артикулу (Stok kod):</span>
                    </div>
                    <code className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 block break-all">
                      ?stockCode={stockCode}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
          <button
            onClick={() => {
              focusNode(targetNode.id);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Сфокусировать на схеме</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
