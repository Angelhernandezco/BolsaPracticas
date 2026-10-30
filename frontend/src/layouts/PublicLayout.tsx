import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import Logo from '../components/Logo'
import { Button } from '../components/ui'
import { useAuth } from '../app/AuthContext'

export default function PublicLayout() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const panel =
    user?.role === 'student'
      ? '/estudiante'
      : user?.role === 'company'
        ? '/empresa'
        : '/admin'
  return (
    <div className="site-shell">
      <header className="public-header">
        <div className="container nav-inner">
          <Logo />
          <nav
            className={open ? 'public-nav open' : 'public-nav'}
            aria-label="Navegación principal"
          >
            <NavLink to="/" onClick={() => setOpen(false)}>
              Inicio
            </NavLink>
            <NavLink to="/como-funciona" onClick={() => setOpen(false)}>
              Cómo funciona
            </NavLink>
          </nav>
          <div className="nav-actions">
            {user ? (
              <Link className="button button-primary" to={panel}>
                Ir a mi panel
              </Link>
            ) : (
              <>
                <Link
                  className="button button-ghost desktop-only"
                  to="/iniciar-sesion"
                >
                  Iniciar sesión
                </Link>
                <Link className="button button-primary" to="/registro">
                  Crear cuenta
                </Link>
              </>
            )}
            <Button
              variant="ghost"
              className="menu-button"
              aria-label="Abrir menú"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Logo />
            <p>
              Un punto de encuentro para el talento universitario y las
              empresas.
            </p>
          </div>
          <div>
            <strong>Plataforma</strong>
            <Link to="/iniciar-sesion">Iniciar sesión</Link>
            <Link to="/registro">Crear una cuenta</Link>
          </div>
          <div>
            <strong>Ayuda</strong>
            <Link to="/como-funciona">Cómo funciona</Link>
            <a href="mailto:soporte@bolsapracticas.mx">Contacto</a>
          </div>
        </div>
        <div className="container footer-bottom">
          © 2026 Bolsa Prácticas · Proyecto académico
        </div>
      </footer>
    </div>
  )
}
