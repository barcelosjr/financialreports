<?php
declare(strict_types=1);

namespace App;

/**
 * Roteador enxuto (sem framework): casa metodo+caminho contra padroes tipo
 * "/contabil/estrutura/:id" e chama o handler com os parametros de rota.
 * Handlers leem query string e corpo JSON diretamente (Request::query()/
 * Request::body()) -- igual ao estilo dos handlers do Express que estamos
 * espelhando.
 */
class Router
{
    /** @var array<int, array{0: string, 1: string, 2: callable}> */
    private array $routes = [];

    public function get(string $pattern, callable $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function put(string $pattern, callable $handler): void
    {
        $this->add('PUT', $pattern, $handler);
    }

    public function delete(string $pattern, callable $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    private function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = [$method, $pattern, $handler];
    }

    public function dispatch(string $method, string $path): void
    {
        foreach ($this->routes as [$routeMethod, $pattern, $handler]) {
            if ($routeMethod !== $method) {
                continue;
            }
            $params = $this->match($pattern, $path);
            if ($params === null) {
                continue;
            }
            $handler($params);
            return;
        }

        http_response_code(404);
        echo json_encode(['error' => 'Rota não encontrada.']);
    }

    /** @return array<string, string>|null */
    private function match(string $pattern, string $path): ?array
    {
        $patternParts = $pattern === '/' ? [] : explode('/', trim($pattern, '/'));
        $pathParts = $path === '/' ? [] : explode('/', trim($path, '/'));

        if (count($patternParts) !== count($pathParts)) {
            return null;
        }

        $params = [];
        foreach ($patternParts as $i => $part) {
            if (str_starts_with($part, ':')) {
                $params[substr($part, 1)] = urldecode($pathParts[$i]);
            } elseif ($part !== $pathParts[$i]) {
                return null;
            }
        }
        return $params;
    }
}
