<?php
declare(strict_types=1);

namespace App;

class PowerBIException extends \RuntimeException
{
    // Nome "errorCode" (não "code") de propósito: \Exception já declara
    // $code (não-readonly, int) -- redeclarar como readonly aqui é um
    // fatal error de PHP ("Cannot redeclare non-readonly property as
    // readonly"), que só se manifesta quando a classe é instanciada.
    public function __construct(string $message, public readonly int $status, public readonly string $errorCode)
    {
        parent::__construct($message);
    }
}
