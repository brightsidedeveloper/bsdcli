import signale from 'signale'

// Custom logger for a cool banner
export default function displayBanner(): void {
  signale.star('Welcome to BrightSide!')
  signale.info("Let's create something amazing! 🚀")
}
