-- Fase 2: tenancy real (grupos economicos/empresas) + usuarios/auth.
-- Substitui CLIENTS (config.php) e os mocks de data/empresas.js e
-- data/usuarios.js do front -- mesmos campos.
--
-- Divergencias de proposito em relacao ao texto do PLANO.md:
--  - conexao Power BI fica em `empresas` (colunas conexao_*), nao numa
--    tabela `pbi_credenciais` por grupo -- o front (EmpresaFormModal.jsx)
--    ja configura a conexao por EMPRESA, nao por grupo.
--  - empresas_permitidas/relatorios_permitidos ficam em colunas JSON de
--    `usuarios`, nao numa tabela `permissoes` separada -- o front sempre
--    leu/gravou esses dois campos direto no objeto do usuario, sem
--    granularidade por linha; normalizar isso so agregaria indirecao sem
--    necessidade agora.

CREATE TABLE IF NOT EXISTS grupos (
    id CHAR(36) NOT NULL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    contrato VARCHAR(50) NULL,
    plano VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS empresas (
    id CHAR(36) NOT NULL PRIMARY KEY,
    grupo_id CHAR(36) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) NULL,
    conexao_tipo VARCHAR(20) NULL,
    conexao_status VARCHAR(20) NULL,
    conexao_tenant_id VARCHAR(100) NULL,
    conexao_client_id VARCHAR(100) NULL,
    conexao_client_secret VARCHAR(255) NULL,
    conexao_group_id VARCHAR(100) NULL,
    conexao_dataset_id VARCHAR(100) NULL,
    conexao_testado_em DATETIME NULL,
    CONSTRAINT fk_empresas_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    INDEX idx_empresas_grupo (grupo_id),
    INDEX idx_empresas_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
    id CHAR(36) NOT NULL PRIMARY KEY,
    grupo_id CHAR(36) NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papel VARCHAR(20) NOT NULL,
    empresas_permitidas JSON NOT NULL,
    relatorios_permitidos JSON NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'convidado',
    ultimo_acesso DATETIME NULL,
    acessos_mes INT NOT NULL DEFAULT 0,
    relatorios_visualizados_mes INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_usuarios_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_usuarios_email (email),
    INDEX idx_usuarios_grupo (grupo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
