import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Song, Category } from '../types';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw, 
  Tag, 
  Tags,
  Music, 
  Search, 
  FileJson,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { PageHeader, PageHeaderButton } from './PageHeader';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface AdminDashboardProps {
  songs: Song[];
  categories: Category[];
  isLoading?: boolean;
  onNewSongClick: () => void;
  onEditSongClick: (song: Song) => void;
  onDeleteSongClick: (song: Song) => void;
  onManageCategoriesClick: () => void;
  onManageTagsClick: () => void;
  onImportJSON: (file: File) => void;
  onResetFactory: () => void;
  onExportJSON: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  songs,
  categories,
  isLoading = false,
  onNewSongClick,
  onEditSongClick,
  onDeleteSongClick,
  onManageCategoriesClick,
  onManageTagsClick,
  onImportJSON,
  onResetFactory,
  onExportJSON,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [pageInput, setPageInput] = useState('1');
  const [manageOpen, setManageOpen] = useState(false);
  const manageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!manageOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (manageRef.current && !manageRef.current.contains(e.target as Node)) {
        setManageOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [manageOpen]);

  const filteredSongs = useMemo(() => {
    return songs.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.number && s.number.toString().includes(searchTerm)) ||
        (s.hymnal && s.hymnal.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.lyrics && s.lyrics.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCategory ? s.category === selectedCategory : true;

      return matchesSearch && matchesCat;
    });
  }, [songs, searchTerm, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const goToPage = (value: number) => {
    if (Number.isNaN(value)) {
      setPageInput(String(page));
      return;
    }
    setPage(Math.min(totalPages, Math.max(1, value)));
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToPage(parseInt(pageInput, 10));
  };

  const pageSongs = filteredSongs.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = filteredSongs.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filteredSongs.length);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportJSON(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      <PageHeader
        icon={Shield}
        title="Painel Geral"
        description="Gestão de cadastros, categorias, edições e backup do caderno de hinos"
        actions={
          <div className="relative" ref={manageRef}>
            <PageHeaderButton
              icon={SlidersHorizontal}
              variant="secondary"
              onClick={() => setManageOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={manageOpen}
            >
              Gerenciar
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${manageOpen ? 'rotate-180' : ''}`} />
            </PageHeaderButton>

            {manageOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 bg-stone-950 border border-stone-700 rounded-button shadow-xl z-20 overflow-hidden py-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setManageOpen(false);
                    onManageCategoriesClick();
                  }}
                  className="w-full px-3 py-2.5 text-left text-xs font-semibold text-stone-200 hover:bg-stone-800 hover:text-emerald-300 flex items-center gap-2"
                >
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  Categorias
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setManageOpen(false);
                    onManageTagsClick();
                  }}
                  className="w-full px-3 py-2.5 text-left text-xs font-semibold text-stone-200 hover:bg-stone-800 hover:text-emerald-300 flex items-center gap-2"
                >
                  <Tags className="w-3.5 h-3.5 text-emerald-400" />
                  Tags
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase font-mono tracking-wider">Total de Músicas</p>
            <p className="text-3xl font-display font-black text-emerald-300 mt-1">
              {isLoading ? '…' : songs.length}
            </p>
          </div>
          <Music className="w-8 h-8 text-emerald-500/40" />
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase font-mono tracking-wider">Categorias</p>
            <p className="text-3xl font-display font-black text-emerald-300 mt-1">{categories.length}</p>
          </div>
          <Tag className="w-8 h-8 text-emerald-500/40" />
        </div>
      </div>

      {/* Seção: Músicas */}
      <section className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Music className="w-5 h-5 text-emerald-400 shrink-0" />
            <h3 className="text-lg font-display font-bold text-emerald-100">Músicas</h3>
          </div>
          <PageHeaderButton icon={Plus} onClick={onNewSongClick}>
            Adicionar
          </PageHeaderButton>
        </div>
        
        {/* Table Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-stone-800">
          
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nº, título, letra..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2 pl-9 pr-3 text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-400">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs font-medium">Carregando músicas…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 font-mono uppercase tracking-wider">
                  <th className="py-3 px-3">Nº</th>
                  <th className="py-3 px-3">Título</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Tom</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {pageSongs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-stone-500">
                      Nenhuma música encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  pageSongs.map((song) => (
                    <tr key={song.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold">
                        {song.number ? (
                          <span className="text-emerald-300">#{song.number}</span>
                        ) : (
                          <span className="text-emerald-400 text-[10px] uppercase bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                            Cântico
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-display font-bold text-stone-100">
                        {song.title}
                        {song.subtitle && (
                          <span className="block text-[11px] font-normal italic text-stone-400">
                            {song.subtitle}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-300 rounded-full text-[10px]">
                          {song.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-stone-300">
                        {song.originalKey || '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditSongClick(song)}
                            className="p-1.5 bg-stone-800 hover:bg-blue-900/60 text-blue-300 rounded-button border border-stone-700"
                            title="Editar Música"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteSongClick(song)}
                            className="p-1.5 bg-stone-800 hover:bg-rose-900/60 text-rose-300 rounded-button border border-stone-700"
                            title="Excluir Música"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className={`flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-stone-800 ${isLoading ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <p className="text-[11px] text-stone-500 font-mono">
              {filteredSongs.length === 0
                ? '0 músicas'
                : `${rangeStart}–${rangeEnd} de ${filteredSongs.length}`}
            </p>

            <label className="flex items-center gap-2 text-xs text-stone-400">
              <span className="whitespace-nowrap">Por página</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
                className="bg-stone-950 border border-stone-800 rounded-button px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none text-stone-200 rounded-button border border-stone-700"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <form
              onSubmit={handlePageInputSubmit}
              className="flex items-center gap-1.5 text-xs text-stone-300"
            >
              <span>Página</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={() => goToPage(parseInt(pageInput, 10))}
                className="w-14 bg-stone-950 border border-stone-800 rounded-button px-2 py-1.5 text-center text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Ir para página"
              />
              <span className="text-stone-500">/ {totalPages}</span>
            </form>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none text-stone-200 rounded-button border border-stone-700"
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Seção: Backup */}
      <section className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-display font-bold text-emerald-100">Backup</h3>
        </div>
        <p className="text-xs text-stone-400">
          Exportação, importação e restauração dos dados do caderno de hinos.
        </p>

        <div className="flex items-center gap-3 flex-wrap text-xs">
          <button
            onClick={onExportJSON}
            className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-button border border-stone-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar Backup (JSON)</span>
          </button>

          <label className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-button border border-stone-700 flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Importar Backup (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <button
            onClick={onResetFactory}
            className="px-4 py-2.5 bg-stone-800 hover:bg-rose-950/60 text-stone-300 hover:text-rose-300 font-semibold rounded-button border border-stone-700 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>Restaurar Hinos de Fábrica</span>
          </button>
        </div>
      </section>

    </div>
  );
};
