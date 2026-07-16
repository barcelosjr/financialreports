import { useState } from 'react';
import { RefreshCw, Loader2, CalendarRange } from 'lucide-react';
import { PERIODOS, labelPeriodo } from '../data/constants';
import { periodosNoIntervalo, periodosDoAno, anosDisponiveis, periodosFechamentoAnual } from '../data/financeiro';

const ANOS = anosDisponiveis();

function tipoInicialDe(periodos) {
  if (periodos.length === 1) return 'mes';
  const anoUnico = new Set(periodos.map((p) => p.split('-')[0])).size === 1;
  const anoCompleto = anoUnico && periodos.length === periodosDoAno(periodos[0].split('-')[0]).length;
  return anoCompleto ? 'ano' : 'meses';
}

export default function FiltroPeriodoRelatorio({
  modo = 'padrao',
  permitirAH = true,
  permitirAV = true,
  periodosIniciais,
  opcoes,
  onOpcoesChange,
  onAplicar,
}) {
  const anual = modo === 'anualComparativo';
  const [tipo, setTipo] = useState(() => tipoInicialDe(periodosIniciais));
  const [mesUnico, setMesUnico] = useState(periodosIniciais[periodosIniciais.length - 1]);
  const [inicio, setInicio] = useState(periodosIniciais[0]);
  const [fim, setFim] = useState(periodosIniciais[periodosIniciais.length - 1]);
  const [ano, setAno] = useState(periodosIniciais[0].split('-')[0]);
  // Balanço: anos escolhidos (multi-seleção). Default = anos que já vieram
  // selecionados (o balanço inicia com o ano atual).
  const [anosSel, setAnosSel] = useState(() =>
    anual ? [...new Set(periodosIniciais.map((p) => p.split('-')[0]))] : []
  );
  const [carregando, setCarregando] = useState(false);

  function toggleAno(a) {
    setAnosSel((prev) => {
      if (prev.includes(a)) return prev.length === 1 ? prev : prev.filter((x) => x !== a);
      return [...prev, a];
    });
  }

  function resolver() {
    if (anual) {
      const fechamentos = periodosFechamentoAnual().filter((f) => anosSel.includes(f.ano));
      return { periodos: fechamentos.map((f) => f.periodo), rotulos: fechamentos.map((f) => f.ano) };
    }
    if (tipo === 'mes') return { periodos: [mesUnico], rotulos: null };
    if (tipo === 'ano') return { periodos: periodosDoAno(ano), rotulos: null };
    return { periodos: periodosNoIntervalo(inicio, fim), rotulos: null };
  }

  function handleAtualizar() {
    const { periodos, rotulos } = resolver();
    if (periodos.length === 0) return;
    setCarregando(true);
    setTimeout(() => {
      onAplicar(periodos, rotulos);
      setCarregando(false);
    }, 800);
  }

  function toggleOpcao(chave) {
    onOpcoesChange({ ...opcoes, [chave]: !opcoes[chave] });
  }

  return (
    <div className="surface rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {anual ? (
          <div>
            <label className="label !mb-1 !text-xs flex items-center gap-1.5">
              <CalendarRange size={13} className="text-clay-500" /> Ano(s) — posição de fechamento
            </label>
            <div className="flex items-center gap-1.5">
              {ANOS.map((a) => {
                const ativo = anosSel.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAno(a)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      ativo
                        ? 'border-clay-400 bg-clay-50 text-clay-700 dark:bg-clay-700/15 dark:text-clay-300'
                        : 'border-sand-300 dark:border-sand-700 text-sand-600 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-800'
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="label !mb-1 !text-xs">Período</label>
              <select className="input !w-auto !py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="mes">Mês</option>
                <option value="meses">Meses</option>
                <option value="ano">Ano</option>
              </select>
            </div>

            {tipo === 'mes' && (
              <div>
                <label className="label !mb-1 !text-xs">Mês</label>
                <select className="input !w-auto !py-2 text-sm" value={mesUnico} onChange={(e) => setMesUnico(e.target.value)}>
                  {PERIODOS.map((p) => <option key={p} value={p}>{labelPeriodo(p)}</option>)}
                </select>
              </div>
            )}

            {tipo === 'meses' && (
              <>
                <div>
                  <label className="label !mb-1 !text-xs">De</label>
                  <select
                    className="input !w-auto !py-2 text-sm"
                    value={inicio}
                    onChange={(e) => { const v = e.target.value; setInicio(v); if (v > fim) setFim(v); }}
                  >
                    {PERIODOS.map((p) => <option key={p} value={p}>{labelPeriodo(p)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label !mb-1 !text-xs">até</label>
                  <select
                    className="input !w-auto !py-2 text-sm"
                    value={fim}
                    onChange={(e) => { const v = e.target.value; setFim(v); if (v < inicio) setInicio(v); }}
                  >
                    {PERIODOS.map((p) => <option key={p} value={p}>{labelPeriodo(p)}</option>)}
                  </select>
                </div>
              </>
            )}

            {tipo === 'ano' && (
              <div>
                <label className="label !mb-1 !text-xs">Ano</label>
                <select className="input !w-auto !py-2 text-sm" value={ano} onChange={(e) => setAno(e.target.value)}>
                  {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
          </>
        )}

        <button className="btn-primary" onClick={handleAtualizar} disabled={carregando}>
          {carregando ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {carregando ? 'Consultando...' : 'Atualizar'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-sand-150 dark:border-sand-800">
        <label className="flex items-center gap-1.5 text-sm text-sand-600 dark:text-sand-300 cursor-pointer">
          <input type="checkbox" className="accent-clay-500" checked={opcoes.media} onChange={() => toggleOpcao('media')} />
          Média do período
        </label>
        {permitirAH && (
          <label className="flex items-center gap-1.5 text-sm text-sand-600 dark:text-sand-300 cursor-pointer">
            <input type="checkbox" className="accent-clay-500" checked={opcoes.ah} onChange={() => toggleOpcao('ah')} />
            Análise Horizontal (AH)
          </label>
        )}
        {permitirAV && (
          <label className="flex items-center gap-1.5 text-sm text-sand-600 dark:text-sand-300 cursor-pointer">
            <input type="checkbox" className="accent-clay-500" checked={opcoes.av} onChange={() => toggleOpcao('av')} />
            Análise Vertical (AV)
          </label>
        )}
      </div>
    </div>
  );
}
