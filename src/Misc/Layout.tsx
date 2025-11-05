import { Outlet } from 'react-router-dom'
import Header from './Header'
import './style.scss'
const Layout = () => {
  return (
    <div className="App">
      <div className="page">
        <Outlet />
      </div>
    </div>
  )
}

export default Layout