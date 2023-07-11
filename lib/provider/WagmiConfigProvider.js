import { WagmiConfig } from 'wagmi'

import { wagmiClient } from '../../config/wagmi'

export default ({ children }) => <WagmiConfig client={wagmiClient}>{children}</WagmiConfig>