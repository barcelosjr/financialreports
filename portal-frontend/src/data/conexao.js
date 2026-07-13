// Lista fixa de tipos de conexão que uma empresa pode usar para alimentar
// seus relatórios. Hoje só "Power BI" está implementado — os demais tipos
// de fonte de dados do ERP entram aqui conforme forem sendo suportados.
export const TIPOS_CONEXAO = [
  { valor: 'powerbi', label: 'API Azure AD / Power BI' },
];

export function labelTipoConexao(valor) {
  return TIPOS_CONEXAO.find((t) => t.valor === valor)?.label ?? valor;
}

// Campos exigidos pela conexão via Power BI — mesmos nomes de variável do
// .env do portal-backend (ver README dele), para não haver dúvida na hora
// de configurar de verdade.
export const CAMPOS_POWERBI = [
  { chave: 'tenantId', label: 'TENANT_ID', placeholder: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
  { chave: 'clientId', label: 'CLIENT_ID', placeholder: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
  { chave: 'clientSecret', label: 'CLIENT_SECRET', placeholder: '••••••••••••••••', sensivel: true },
  { chave: 'groupId', label: 'GROUP_ID', placeholder: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
  { chave: 'datasetId', label: 'DATASET_ID', placeholder: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
];

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Simula a validação de conexão com o Power BI (sem backend real ainda —
// ver "Próximos passos" no README). Confere se todos os campos foram
// preenchidos e se os IDs têm formato de GUID, que é o formato real usado
// pelo Azure AD/Power BI.
export async function testarConexaoPowerBI(campos) {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const faltando = CAMPOS_POWERBI.filter((c) => !campos[c.chave]?.trim()).map((c) => c.label);
  if (faltando.length > 0) {
    return { ok: false, mensagem: `Preencha todos os campos para testar a conexão (faltando: ${faltando.join(', ')}).` };
  }

  const idsInvalidos = ['tenantId', 'clientId', 'groupId', 'datasetId'].filter(
    (chave) => !GUID_REGEX.test(campos[chave].trim())
  );
  if (idsInvalidos.length > 0) {
    return {
      ok: false,
      mensagem: 'TENANT_ID, CLIENT_ID, GROUP_ID e DATASET_ID devem ser GUIDs válidos (ex: 3fa85f64-5717-4562-b3fc-2c963f66afa6).',
    };
  }

  return { ok: true, mensagem: 'Conexão validada com sucesso — modelo semântico acessível.' };
}
