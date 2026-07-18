<?php
declare(strict_types=1);

namespace App;

class Utils
{
    /**
     * Lê e valida o parâmetro obrigatório ?empresa=, restrito às empresas
     * autorizadas para a API key da requisição. Retorna a empresa validada,
     * ou null após já ter escrito a resposta 400/403.
     *
     * @param array<int,string> $empresasAutorizadas
     */
    public static function parseEmpresa(array $empresasAutorizadas): ?string
    {
        $empresa = Http::query('empresa');
        if (!$empresa) {
            Http::sendError(400, 'Parâmetro "empresa" é obrigatório.');
            return null;
        }
        if (!in_array($empresa, $empresasAutorizadas, true)) {
            Http::sendError(403, 'Empresa informada não está autorizada para esta API key.');
            return null;
        }
        return $empresa;
    }

    public static function handlePowerBIError(PowerBIException $err, string $fallbackMessage): void
    {
        if ($err->errorCode === 'UNAVAILABLE' || $err->errorCode === 'THROTTLED') {
            Http::sendError(503, 'Serviço de dados temporariamente indisponível. Tente novamente em instantes.');
            return;
        }
        error_log($fallbackMessage . ': ' . $err->getMessage());
        Http::sendError(500, $fallbackMessage);
    }

    /**
     * Escapa um valor de texto antes de interpolá-lo numa string literal DAX
     * (dobra aspas duplas) e rejeita quebras de linha/caracteres de controle
     * -- evita DAX injection em filtros construídos a partir de query params.
     */
    public static function escapeDaxString(string $value): string
    {
        if (preg_match('/[\r\n\t]/', $value)) {
            throw new \InvalidArgumentException('Valor contém caracteres inválidos.');
        }
        return str_replace('"', '""', $value);
    }
}
