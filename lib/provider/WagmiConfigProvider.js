import { WagmiConfig } from 'wagmi'

import { wagmiClient } from '../../config/wagmi'

export default (
	{
		children,
	}
) => {
	return (
		<WagmiConfig client={wagmiClient}>
			{children}
		</WagmiConfig>
	)
}