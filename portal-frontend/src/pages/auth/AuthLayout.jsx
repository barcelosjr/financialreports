import Logo from '../../components/Logo';

const FRASES = [
  'Veja o resultado de cada empresa do grupo, sem esperar o contador fechar a planilha.',
  'DRE, Balanço e Fluxo de Caixa sempre atualizados, empresa a empresa ou consolidado.',
  'Acesso sob controle: cada usuário vê só o que faz sentido para ele ver.',
];

export default function AuthLayout({ children, frase = FRASES[0] }) {
  return (
    <div className="min-h-screen flex bg-sand-100 dark:bg-sand-950">
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden bg-sand-900">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #D97757 0%, transparent 45%), radial-gradient(circle at 80% 70%, #E9A47F 0%, transparent 40%)',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-sand-50 w-full">
          <Logo size="md" className="[&_span]:text-sand-50" />
          <div className="max-w-sm">
            <p className="font-serif text-2xl leading-snug text-sand-50">{frase}</p>
          </div>
          <p className="text-xs text-sand-400">© 2026 Financial Reports. Todos os direitos reservados.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="md" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
