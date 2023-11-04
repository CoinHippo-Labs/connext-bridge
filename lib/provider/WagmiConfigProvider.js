import { WagmiConfig } from 'wagmi'

import { wagmiConfig } from '../../config/wagmi'

export default ({ children }) => <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>