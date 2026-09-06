import React, { useState } from 'react';
import { useFactory } from '../context/FactoryContext';
import { CanvasNode, EquipmentNode, ContainerNode, ElementReference } from '../types';
import { 
  Link2, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ExternalLink, 
  Copy, 
  Check, 
  Share2, 
  QrCode, 
  Search, 
  Boxes, 
  Cpu, 
  Zap, 
  ChevronRight, 
  Compass, 
  Info,
  FolderTree
} from 'lucide-react';
import { generateElementUrl, copyTextToClipboard } from '../utils/linkUtils';

interface ElementLinksSectionProps {
  node: CanvasNode;
  canEdit: boolean;
}

const RELATIONSHIP_PRESETS = [
  'Питание от (Электро)',
  'Подача заготовок на',
  'Выход продукции на',
  'Управляется от (ПЛК)',
  'Резервный агрегат',
  'Датчик / Телеметрия',
  'Трубопровод подачи',
  'Смежный агрегат'
];

export const ElementLinksSection: React.FC<ElementLinksSectionProps> = ({ node, canEdit }) => {
  const { 
    state, 
    focusNode, 
    openShareModal, 
    addElementLink, 
    removeElementLink, 
    showToast 
  } = useFactory();

  const [isAddingLink, setIsAddingLink] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [relationshipText, setRelationshipText] = useState<string>('Связанный узел');
  const [searchTargetTerm, setSearchTargetTerm] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Direct element links
  const elementLinks: ElementReference[] = node.elementLinks || [];

  // Physical diagram links connected to this node
  const outgoingLinks = state.links.filter(l => l.fromId === node.id);
  const incomingLinks = state.links.filter(l => l.toId === node.id);

  // Parent container
  const parentContainer = node.parentId 
    ? state.containers.find(c => c.id === node.parentId) 
    : null;

  // Candidates for adding a new link (excluding current node)
  const candidateEquipments = state.equipment.filter(e => e.id !== node.id);
  const candidateContainers = state.containers.filter(c => c.id !== node.id);

  const filteredCandidates = [...candidateEquipments, ...candidateContainers].filter(item => {
    if (!searchTargetTerm) return true;
    const term = searchTargetTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.tag.toLowerCase().includes(term) ||
      ('type' in item && item.type.toLowerCase().includes(term))
    );
  });

  const directUrl = generateElementUrl(node, 'element');

  const handleCopyDirectUrl = async () => {
    const success = await copyTextToClipboard(directUrl);
    if (success) {
      setCopiedUrl(true);
      showToast('Ссылка скопирована! 📋', `Прямой URL для «${node.name}» в буфере обмена`, 'success');
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleSaveLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) {
      showToast('Выберите целевой элемент', 'Укажите станок или зону для связывания', 'warning');
      return;
    }
    addElementLink(node.id, selectedTargetId, relationshipText || 'Связанный узел');
    setIsAddingLink(false);
    setSelectedTargetId('');
    setRelationshipText('Связанный узел');
    setSearchTargetTerm('');
  };

  return (
    <div className="pt-3 border-t border-slate-200 dark:border-white/10 my-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Ссылки и навигация
          </span>
          {(elementLinks.length > 0 || outgoingLinks.length > 0 || incomingLinks.length > 0) && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
              {elementLinks.length + outgoingLinks.length + incomingLinks.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => openShareModal(node.id)}
          className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-blue-200 dark:border-blue-500/30"
          title="Поделиться прямой ссылкой или QR-кодом для перехода из внешних сервисов"
        >
          <Share2 className="w-3 h-3" />
          <span>Поделиться / QR</span>
        </button>
      </div>

      {/* External Share Link Snippet */}
      <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold flex items-center gap-1">
            <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
            <span>Прямая ссылка для внешних систем (1C, ERP, Jira):</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate select-all">
            {directUrl}
          </div>
          <button
            type="button"
            onClick={handleCopyDirectUrl}
            className="p-1.5 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
            title="Скопировать ссылку на элемент"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Parent Workshop Link */}
      {parentContainer && (
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FolderTree className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Размещено в цехе / зоне:</div>
              <div className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                {parentContainer.name} ({parentContainer.tag})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => focusNode(parentContainer.id)}
            className="px-2 py-1 rounded-lg bg-white dark:bg-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] flex items-center gap-1 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer shrink-0"
            title="Перейти к родительскому цеху"
          >
            <span>К цеху</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* User-defined Cross-Reference Links */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Связанные элементы оборудования ({elementLinks.length}):
          </span>
          {canEdit && !isAddingLink && (
            <button
              type="button"
              onClick={() => setIsAddingLink(true)}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Добавить связь</span>
            </button>
          )}
        </div>

        {elementLinks.length === 0 && !isAddingLink ? (
          <div className="p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-center text-slate-400 text-xs">
            <div className="text-[11px]">Нет перекрестных ссылок на другие станки</div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsAddingLink(true)}
                className="mt-1.5 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium text-[11px] hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Связать с другим агрегатом</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {elementLinks.map(link => {
              const targetNode = state.equipment.find(e => e.id === link.targetId) || 
                                 state.containers.find(c => c.id === link.targetId);

              return (
                <div
                  key={link.id}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs group hover:border-blue-300 dark:hover:border-blue-500/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-mono font-bold">
                        {targetNode?.tag || 'ID: ' + link.targetId}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        • {link.relationship || 'Связан'}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11px] mt-0.5">
                      {targetNode ? targetNode.name : 'Узел не найден (удален)'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {targetNode && (
                      <button
                        type="button"
                        onClick={() => focusNode(targetNode.id)}
                        className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
                        title={`Перейти к ${targetNode.name} на схеме`}
                      >
                        <span>Перейти</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                    {targetNode && (
                      <button
                        type="button"
                        onClick={async () => {
                          const url = generateElementUrl(targetNode, 'element');
                          const ok = await copyTextToClipboard(url);
                          if (ok) showToast('Ссылка скопирована', `URL узла «${targetNode.name}» в буфере`, 'success');
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                        title="Скопировать прямую ссылку на этот элемент"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeElementLink(node.id, link.id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                        title="Удалить ссылку"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Link Inline Form */}
      {isAddingLink && (
        <form 
          onSubmit={handleSaveLink}
          className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Создать ссылку на элемент</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAddingLink(false)}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              Отмена
            </button>
          </div>

          {/* Target Element Search & Select */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Целевой агрегат или цех:
            </label>
            <div className="relative mb-1.5">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Фильтр по названию или тегу..."
                value={searchTargetTerm}
                onChange={e => setSearchTargetTerm(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400"
              />
            </div>
            <select
              value={selectedTargetId}
              onChange={e => setSelectedTargetId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 font-medium cursor-pointer"
              required
            >
              <option value="">-- Выберите целевой элемент ({filteredCandidates.length}) --</option>
              {filteredCandidates.map(c => (
                <option key={c.id} value={c.id}>
                  [{c.tag}] {c.name} {c.type === 'container' ? '(Цех/Зона)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Relationship Note & Presets */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Характер связи / Назначение перехода:
            </label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {RELATIONSHIP_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRelationshipText(preset)}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer border ${
                    relationshipText === preset
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Например: Питание от ГРЩ-1, Подача на конвейер..."
              value={relationshipText}
              onChange={e => setRelationshipText(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 placeholder:text-slate-400"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingLink(false)}
              className="px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!selectedTargetId}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <Link2 className="w-3 h-3" />
              <span>Создать ссылку</span>
            </button>
          </div>
        </form>
      )}

      {/* Connected Physical Lines (Links on Canvas) */}
      {(outgoingLinks.length > 0 || incomingLinks.length > 0) && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Физические коммуникации схемы:
          </div>

          <div className="space-y-1">
            {outgoingLinks.map(l => {
              const target = state.equipment.find(e => e.id === l.toId) || state.containers.find(c => c.id === l.toId);
              if (!target) return null;
              return (
                <div 
                  key={l.id}
                  className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-blue-500 font-mono font-semibold">
                      Выходная линия →
                    </span>
                    <div className="font-medium text-slate-700 dark:text-slate-300 truncate text-[11px]">
                      {target.name} ({target.tag})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => focusNode(target.id)}
                    className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                  >
                    <span>Перейти</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {incomingLinks.map(l => {
              const source = state.equipment.find(e => e.id === l.fromId) || state.containers.find(c => c.id === l.fromId);
              if (!source) return null;
              return (
                <div 
                  key={l.id}
                  className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-emerald-500 font-mono font-semibold">
                      Входная линия ←
                    </span>
                    <div className="font-medium text-slate-700 dark:text-slate-300 truncate text-[11px]">
                      {source.name} ({source.tag})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => focusNode(source.id)}
                    className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                  >
                    <span>Перейти</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
