import { Navigate } from 'react-router-dom';

// Guarda de rota: além de esconder o item no menu, garante que uma URL não
// vire uma forma de escapar da permissão (ex: usuário comum navegando direto
// para /app/admin/usuarios).
export default function RequireAcesso({ permitido, children }) {
  if (!permitido) return <Navigate to="/app/dashboard" replace />;
  return children;
}
