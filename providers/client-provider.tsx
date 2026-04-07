"use client"

import React from "react"
// import "@auth0/universal-components-react/styles"
import { Auth0ComponentProvider } from "@auth0/universal-components-react/rwa"

interface ClientProviderProps {
  children: React.ReactNode
}

export function ClientProvider({ children }: ClientProviderProps) {
  return (
    <Auth0ComponentProvider
      mode="proxy"
      proxyConfig={{
        baseUrl: '/'
      }}
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN}
      themeSettings={{
        mode: "light",
        theme: "default",
      }}
    >
      {children}
    </Auth0ComponentProvider>
  )
}
