import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Contract, utils } from 'ethers'
import Loader from 'react-loader-spinner'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiChevronDown, BiChevronUp } from 'react-icons/bi'
import { TiArrowRight } from 'react-icons/ti'

import Network from '../network'
import Alert from '../../alerts'

import { numberFormat } from '../../../lib/utils'

const ABI = [
  // Read-Only Functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',

  // Authenticated Functions
  'function transfer(address to, uint amount) returns (boolean)',
  'function mint(address account, uint256 amount)',
]

export default function Faucets() {
  const { chains, assets, wallet, preferences } = useSelector(state => ({ chains: state.chains, assets: state.assets, wallet: state.wallet, preferences: state.preferences }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { signer, chain_id, address } = { ...wallet_data }
  const { theme } = { ...preferences }

  const [options, setOptions] = useState(null)
  const [collapse, setCollapse] = useState(true)
  const [minting, setMinting] = useState(null)
  const [mintResponse, setMintResponse] = useState(null)

  const items = [
    {
      label: 'Receiving address',
      name: 'address',
      type: 'text',
      placeholder: 'Send funds to an address',
    },
    {
      label: 'Chain',
      name: 'chain_id',
      type: 'chains_select',
      placeholder: 'Select Chain',
    },
  ]

  useEffect(() => {
    if (chain_id && address) {
      setOptions({
        ...options,
        address: options ? options.address : address,
        chain_id: chain_id || options?.chain_id,
      })
    }
  }, [chain_id, address])

  useEffect(() => {
    setMintResponse(null)
  }, [options])

  const chain = chains_data?.find(_chain => _chain?.chain_id === options?.chain_id)
  const asset = assets_data?.find(_asset => _asset?.id === 'test')

  const mint = async () => {
    setMintResponse(null)
    setMinting(true)

    const contract_address = asset?.contracts?.find(_contract => _contract.chain_id === options?.chain_id)?.contract_address

    const contract = new Contract(contract_address, ABI, signer)

    try {
      const response = await contract.mint(options?.address, utils.parseEther(process.env.NEXT_PUBLIC_FAUCET_AMOUNT))

      setMintResponse({ status: 'success', message: 'Faucet Successful', ...response })
    } catch (error) {
      setMintResponse({ status: 'failed', message: error?.data?.message || error?.message })
    }

    setMinting(false)
  }

  return assets_data && (
    <>
      <button
        onClick={() => setCollapse(!collapse)}
        className="w-full bg-transparent flex items-center justify-center text-gray-400 dark:text-gray-500 text-lg space-x-1 my-4"
      >
        {!signer && (
          <span>Connect wallet to </span>
        )}
        <span>Faucets</span>
        {collapse ?
          <BiChevronDown size={20} />
          :
          <BiChevronUp size={20} />
        }
      </button>
      {!collapse && (
        <div className="w-full sm:w-96 form mb-4 px-2">
          {items.map((item, i) => (
            <div key={i} className="form-element">
              {item.label && (
                <div className="form-label text-gray-600 dark:text-gray-400 font-medium">{item.label}</div>
              )}
              {item.type === 'chains_select' ?
                <div className="-mt-2">
                  <Network
                    side="chain"
                    disabled={minting}
                    chain_id={options?.[item.name]}
                    onSelect={_chain_id => {
                      setOptions({
                        ...options,
                        chain_id: _chain_id,
                      })
                    }}
                  />
                </div>
                :
                <input
                  type={item.type}
                  disabled={minting}
                  placeholder={item.placeholder}
                  value={options?.[item.name]}
                  onChange={e => setOptions({ ...options, [`${item.name}`]: e.target.value })}
                  className="form-input dark:border-0 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg"
                />
              }
            </div>
          ))}
          {signer && Object.entries(options || {}).filter(([key, value]) => value && items.findIndex(item => item.name === key) > -1).length >= items.length && (
            <div className="flex justify-end space-x-2 mb-2">
              <button
                type="button"
                disabled={minting}
                onClick={() => setCollapse(!collapse)}
                className="btn btn-default btn-rounded bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                disabled={minting}
                onClick={() => mint()}
                className="btn btn-default btn-rounded bg-indigo-500 hover:bg-indigo-600 flex items-center text-white space-x-1.5"
              >
                {minting && (
                  <Loader type="Puff" color={theme === 'dark' ? '#F9FAFB' : '#F9FAFB'} width="16" height="16" />
                )}
                <span>Faucet</span>
                {asset && (
                  <>
                    <span className="font-mono">{numberFormat(process.env.NEXT_PUBLIC_FAUCET_AMOUNT, '0,0.00')}</span>
                    <span>{asset.symbol}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      {mintResponse && (
        <div className="mx-2 sm:mx-8">
          <Alert
            color={`${mintResponse.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : mintResponse.status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white mb-4 sm:mb-6`}
            icon={mintResponse.status === 'failed' ? <BiMessageError className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> : mintResponse.status === 'success' ? <BiMessageCheck className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" /> : <BiMessageDetail className="w-4 sm:w-6 h-4 sm:h-6 stroke-current mr-3" />}
            rounded={true}
          >
            <div className="flex items-center justify-between space-x-1">
              <span className="font-mono leading-5 text-xs">{mintResponse.message}</span>
              {['success'].includes(mintResponse.status) && mintResponse.hash && chain?.explorer?.url && (
                <a
                  href={`${chain.explorer.url}${chain.explorer.transaction_path?.replace('{tx}', mintResponse.hash)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center font-semibold pr-1.5"
                >
                  <span>View on {chain.explorer.name}</span>
                  <TiArrowRight size={16} className="transform -rotate-45" />
                </a>
              )}
            </div>
          </Alert>
        </div>
      )}
    </>
  )
}