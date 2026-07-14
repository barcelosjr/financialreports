import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { PERIODOS, labelPeriodo } from '../data/constants';
import { periodosNoIntervalo, periodosDoAno, anosDisponiveis } from '../data/financeiro';

const ANOS = anosDisponiveis();

function tipoInicialDe(periodos) {
  if (periodos.length === 1) return 'mes';
  const anoUnico = new Set(periodos.map((p) => p.split('-')[0])).size === 1;
  const anoCompleto = anoUnico && periodos.length === periodosDoAno(periodos[0].split('-')[0]).length;
  return anoCompleto ? 'ano' : 'meses';
}

export default function FiltroPeriodoRelatorio({ permitirAV = true, periodosIniciais, opcoes, onOpcoesChange, onAplicar }) {
  const [tipo, setTipo] = useState(() => tipoInicialDe(periodosIniciais));
  const [mesUnico, setMesUnico] = useState(periodosIniciais[periodosIniciais.length - 1]);
  const [inicio, setInicio] = useState(periodosIniciais[0]);
  const [fim, setFim] = useState(periodosIniciais[periodosIniciais.length - 1]);
  const [ano, setAno] = useState(periodosIniciais[0].split('-')[0]);
  const [carregando, setCarregando] = useState(false);

  function resolverPeriodos() {
    if (tipo === 'mes') return [mesUnico];
    if (tipo === 'ano') return periodosDoAno(ano);
    return periodosNoIntervalo(inicio, fim);
  }

  function handleAtualizar() {
    const periodos = resolverPeriodos();
    if (periodos.length === 0) return;
    setCarregando(true);
    setTimeout(() => {
      onAplicar(periodos);
      setCarregando(false);
    }, 800);
  }

  function toggleOpcao(chave) {
    onOpcoesChange({ ...opcoes, [chave]: !opcoes[chave] });
  }

  return (
    <div className="surface rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
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
        <label className="flex items-center gap-1.5 text-sm text-sand-600 dark:text-sand-300 cursor-pointer">
          <input type="checkbox" className="accent-clay-500" checked={opcoes.ah} onChange={() => toggleOpcao('ah')} />
          Análise Horizontal (AH)
        </label>
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
