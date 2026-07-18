-- Fase 1: plano de contas (estrutura hierarquica por relatorio + regras de
-- classificacao de conta). Substitui estruturas.json/classificacoes.json do
-- Node -- mesmos campos, agora em tabelas.

CREATE TABLE IF NOT EXISTS estruturas (
    id CHAR(36) NOT NULL PRIMARY KEY,
    empresa VARCHAR(20) NOT NULL,
    relatorio VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    parent_id CHAR(36) NULL,
    ordem INT NOT NULL,
    sinal CHAR(1) NOT NULL,
    INDEX idx_estruturas_empresa_relatorio (empresa, relatorio),
    INDEX idx_estruturas_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS classificacoes (
    id CHAR(36) NOT NULL PRIMARY KEY,
    empresa VARCHAR(20) NOT NULL,
    conta VARCHAR(50) NOT NULL,
    natureza CHAR(1) NULL,
    centro_custo VARCHAR(50) NULL,
    INDEX idx_classificacoes_empresa_conta (empresa, conta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS classificacao_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    regra_id CHAR(36) NOT NULL,
    relatorio VARCHAR(20) NOT NULL,
    node_id CHAR(36) NOT NULL,
    CONSTRAINT fk_classificacao_tags_regra FOREIGN KEY (regra_id) REFERENCES classificacoes(id) ON DELETE CASCADE,
    INDEX idx_classificacao_tags_regra (regra_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
