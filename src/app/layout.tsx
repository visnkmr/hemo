// 'use client'
// import { ThemeProvider } from "../src/components/ThemeContext"
import React from "react"
// import { Providers } from "../src/components/ThemeContext"
// import Thedarkhtml from "../src/components/thedarkhtml"
// import { useLocalStorage } from "../src/components/useLocalStorage"
import './globals.css'
import {Metadata} from 'next'


export const metadata:Metadata = {
  title: 'Hemo',
  description: 'LLM chat UI made for use with Filedime',
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  // const [showon, setshow] = useLocalStorage("dark",true);
  return (
    <html suppressHydrationWarning className="h-full" lang="en">
      <body className="h-full flex flex-col dark:bg-gray-900">
        {/* <Providers> */}

        {/* <Thedarkhtml> */}
        {/* <Topthread/> */}
        {/* <DarkButton/> */}
        {children}
        {/* </Thedarkhtml> */}
        {/* </Providers> */}

        {/* <Footer/> */}
      </body>

    </html>
  )
}