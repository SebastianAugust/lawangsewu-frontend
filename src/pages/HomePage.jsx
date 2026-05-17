import { useState, useEffect } from 'react'
import api from '../api/axios'

function HomePage() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    api.get('/test')
      .then(response => {
        setMessage(response.data.message)
      })
      .catch(error => {
        setMessage('Gagal konek ke API')
      })
  }, [])

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-blue-600">Lawang Sewu POS</h1>
    </div>
  )
}

export default HomePage