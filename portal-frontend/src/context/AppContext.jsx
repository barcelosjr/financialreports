import { SessaoProvider, useSessao } from './SessaoContext';
import { EstruturaProvider, useEstrutura } from './EstruturaContext';
import { TenantProvider, useTenant } from './TenantContext';

// AppProvider/useApp() são a fachada de compatibilidade sobre os três
// contextos por domínio (Sessão, Estrutura, Tenant) — evita reescrever
// todas as telas de uma vez. Telas novas podem já importar useSessao/
// useTenant/useEstrutura diretamente para só re-renderizar quando o
// domínio que de fato usam mudar.
export function AppProvider({ children }) {
  return (
    <SessaoProvider>
      <EstruturaProvider>
        <TenantProvider>{children}</TenantProvider>
      </EstruturaProvider>
    </SessaoProvider>
  );
}

export function useApp() {
  const sessao = useSessao();
  const estrutura = useEstrutura();
  const tenant = useTenant();
  return { ...sessao, ...estrutura, ...tenant };
}

export { useSessao, useEstrutura, useTenant };
