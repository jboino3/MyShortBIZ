import { Routes, Route } from 'react-router-dom'
import './App.css'
import Layout from './Misc/Layout'
import Bio from './Bio/Bio'
import Blog from './Blog/Blog'
import CV from './CV/CV'
import LinkPage from './Link/Link' // rename if conflict with window.Link
import Shop from './Shop/Shop'
import Social from './Social/Social'
import Store from './Store/Store'
import Studio from './Studio/Studio'
import Thesis from './Thesis/Thesis'
import Video from './Video/Video'
import Home from './Home/Home'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="home" element={<Home />} />
        <Route path="bio" element={<Bio />} />
        <Route path="blog" element={<Blog />} />
        <Route path="cv" element={<CV />} />
        <Route path="link" element={<LinkPage />} />
        <Route path="shop" element={<Shop />} />
        <Route path="social" element={<Social />} />
        <Route path="store" element={<Store />} />
        <Route path="studio" element={<Studio />} />
        <Route path="interactive" element={<Thesis />} />
        <Route path="video" element={<Video />} />
      </Route>
    </Routes>
  )
}

export default App