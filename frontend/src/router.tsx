import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { RequireAuth } from '@/auth/RequireAuth'
import { Dashboard } from '@/pages/Dashboard'
import { Placeholder } from '@/pages/Placeholder'
import { IPsPage } from '@/pages/IPs'
import { ScanPage } from '@/pages/Scan'
import { SubnetsPage } from '@/pages/Subnets'
import { ClientsPage } from '@/pages/Clients'
import { EnvSettings } from '@/pages/EnvSettings'
import { LoginPage } from '@/pages/Login'
import { RegisterPage } from '@/pages/Register'

export const router = createBrowserRouter(
  [
    { path: 'login', element: <LoginPage /> },
    { path: 'register', element: <RegisterPage /> },
    {
      element: <Layout />,
      children: [
        // Pública en la SPA: el backend la protege con localhost + PIN (permite configurar la BD antes del login).
        { path: 'env', element: <EnvSettings /> },
        {
          element: <RequireAuth />,
          children: [
            { index: true, element: <Dashboard /> },
            { path: 'ips', element: <IPsPage /> },
            { path: 'subnets', element: <SubnetsPage /> },
            { path: 'clients', element: <ClientsPage /> },
            { path: 'scan', element: <ScanPage /> },
          ],
        },
        { path: '*', element: <Placeholder title="No encontrado" phase="ninguna fase" /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL }, // '/app/'
)