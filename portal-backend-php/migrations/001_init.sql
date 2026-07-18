-- Fase 0: tabela de cache generico (substitui o cache em memoria do Node
-- em shared hosting, onde cada request PHP e um processo isolado). Usada
-- para queries DAX e, na Fase 3, para o token de acesso Azure AD.
CREATE TABLE IF NOT EXISTS cache (
    chave VARCHAR(191) NOT NULL PRIMARY KEY,
    valor LONGTEXT NOT NULL,
    expira_em DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
