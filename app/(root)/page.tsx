import HeaderBox from '@/components/ui/HeaderBox'
import TotalBalanceBox from '@/components/ui/TotalBalanceBox';
import React from 'react'

const Home = () => {
  const loggedInUser = {firstName: "John", lastName: "Doe"}; // Example logged-in user data
  return (
    <section className="p-4">
      <div>
        <header className="text-2xl font-bold mb-4">
          <HeaderBox type="greeting"
          title="Welcome to the Banking App!"
          description="This is the home page."
          user={loggedInUser || null} 
          subtext="Manage your finances with ease." />
        </header>
        <TotalBalanceBox  
        accounts={[
          { id: "checking", name: "Checking", balance: 900 },
          { id: "savings", name: "Savings", balance: 350 },
        ]}
        totalBanks={1}
        totalCurrentBalance={1250.00}
        />
      </div>
    </section>
  )
}

export default Home