import { useContext } from 'react';
import { Link, Outlet } from 'react-router-dom'
import { CinemaModeContext } from '../player'; // Assuming player still exports this

const Header = () => {
  const { cinemaMode } = useContext(CinemaModeContext);
  const navbarEnabled = !cinemaMode;

  return (
    // Ensure base body styles from index.css provide the main background
    <div className="min-h-screen flex flex-col"> {/* Ensure footer is pushed down */}
      {navbarEnabled && (
        <nav className='bg-indigo-900 shadow-md p-4 fixed w-full z-10 top-0'> {/* Synthwave: Changed bg */}
          {/* Slightly different bg, subtle shadow, more padding */}
          <div className='container mx-auto flex flex-wrap items-center'>
            <div className='flex flex-1 text-cyan-100'> {/* Synthwave: Changed text (could inherit) */}
              <Link to="/" className='font-semibold text-xl tracking-tight'> {/* Adjusted font */}
                Broadcast Box
              </Link>
            </div>
            {/* Add other nav items here if needed */}
          </div>
        </nav>
      )}

      {/* Adjusted padding top to account for new header height */}
      <main className={`flex-grow ${navbarEnabled && "pt-20 md:pt-24"}`}>
        <Outlet />
      </main>

      {/* Refined Footer */}
      <footer className="bg-indigo-900 text-cyan-400 text-sm mt-12"> {/* Synthwave: Changed bg and text */}
        <div className="container mx-auto px-4 py-4 text-center">
          <ul className="flex items-center justify-center space-x-6">
            <li>
              <a href="https://github.com/Glimesh/broadcast-box" className="hover:text-fuchsia-300 transition-colors">GitHub</a> {/* Synthwave: Accent hover */}
            </li>
            <li>
              <a href="https://pion.ly" className="hover:text-fuchsia-300 transition-colors">Pion</a> {/* Synthwave: Accent hover */}
            </li>
            <li>
              <a href="https://glimesh.tv" className="hover:text-fuchsia-300 transition-colors">Glimesh</a> {/* Synthwave: Accent hover */}
            </li>
          </ul>
          <p className="mt-3">© {new Date().getFullYear()} Broadcast Box Contributors</p> {/* Inherits text-cyan-400 */}
        </div>
      </footer>
    </div>
  )
}

export default Header