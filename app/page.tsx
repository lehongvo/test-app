import MetaMaskConnect from "./components/MetaMaskConnect";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Web3 Login
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to get started
          </p>
        </div>

        <MetaMaskConnect />
      </main>
    </div>
  );
}
