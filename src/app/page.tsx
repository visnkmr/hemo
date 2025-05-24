"use client"
import GPTchatinterface from "../components/gptchatinterface";

export default function Home() {
  const url=typeof window !== 'undefined' ? window.location.hostname : '/'
    console.log(url)
    return <GPTchatinterface fgptendpoint={url} setasollama={true}/>
}
