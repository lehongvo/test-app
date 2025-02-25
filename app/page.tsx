import MetaMaskConnect from '@/app/components/MetaMaskConnect'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <MetaMaskConnect />
    </main>
  )
}
