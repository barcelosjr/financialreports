const PERIODO_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function isValidPeriodo(value) {
  return PERIODO_REGEX.test(value);
}

/**
 * Expande um intervalo "YYYY-MM" (formato aceito pela API publica) numa lista
 * de strings "MM/YYYY" (formato da coluna LANCAMENTOS[PERIODO] no modelo),
 * um valor por mes do intervalo. Usada para montar um filtro DAX
 * `LANCAMENTOS[PERIODO] IN {...}` sem depender de comparacao lexicografica de
 * "MM/YYYY", que nao ordena corretamente.
 */
function expandPeriodoRange(periodoInicio, periodoFim) {
  const [anoI, mesI] = periodoInicio.split('-').map(Number);
  const [anoF, mesF] = periodoFim.split('-').map(Number);

  const periodos = [];
  let ano = anoI;
  let mes = mesI;
  while (ano < anoF || (ano === anoF && mes <= mesF)) {
    periodos.push(`${String(mes).padStart(2, '0')}/${ano}`);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return periodos;
}

module.exports = { isValidPeriodo, expandPeriodoRange };
