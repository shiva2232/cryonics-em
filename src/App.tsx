import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import DeviceSelection from './pages/DeviceSelection'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/' element={<ProtectedRoute />}>
          <Route path='/:deviceId' element={<Dashboard />} />
          <Route path='/select-device' element={<DeviceSelection />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
