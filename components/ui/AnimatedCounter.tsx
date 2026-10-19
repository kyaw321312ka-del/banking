'use client'

import CountUp from 'react-countup'

const AnimatedCounter = (
    {amount}: {amount: number}
) => {
  return (
    <div><CountUp end={amount} duration={2} decimals={2} separator="," prefix="$" /></div>
  )
}

export default AnimatedCounter