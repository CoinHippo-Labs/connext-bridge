import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import Web3 from 'web3'
import { constants, providers } from 'ethers'

import Image from '../image'
import { WALLET_DATA, CHAIN_ID } from '../../reducers/types'

export default (
  {
    token_data,
  },
) => {
  const dispatch = useDispatch()
  const {
    chains,
    wallet,
    _chain_id,
  } = useSelector(state =>
    (
      {
        chains: state.chains,
        wallet: state.wallet,
        _chain_id: state.chain_id,
      }
    ),
    shallowEqual,
  )
  const {
    chains_data,
  } = { ...chains }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    provider,
  } = { ...wallet_data }
  const {
    chain_id,
  } = { ..._chain_id }

  const [web3, setWeb3] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [data, setData] = useState(null)

  useEffect(
    () => {
      if (!web3) {
        setWeb3(
          new Web3(
            Web3.givenProvider
          )
        )
      }
      else {
        try {
          web3.currentProvider._handleChainChanged = e => {
            try {
              const chainId = Web3.utils.hexToNumber(e?.chainId)

              setChainId(chainId)

              dispatch(
                {
                  type: CHAIN_ID,
                  value: chainId,
                }
              )

              const web3Provider = new providers.Web3Provider(provider)
              const signer = web3Provider.getSigner()

              dispatch(
                {
                  type: WALLET_DATA,
                  value: {
                    chain_id: chainId,
                    web3_provider: web3Provider,
                    signer,
                  },
                }
              )
            } catch (error) {}
          }
        } catch (error) {}
      }
    },
    [web3],
  )

  useEffect(
    () => {
      if (chain_id) {
        setChainId(chain_id)
      }
    },
    [chain_id],
  )

  useEffect(
    () => {
      const {
        chain_id,
        contract_data,
      } = { ...data }

      if (
        chain_id === chainId &&
        contract_data
      ) {
        addToken(
          chain_id,
          contract_data,
        )
      }
    },
    [chainId, data],
  )

  const addToken = async (
    chain_id,
    contract_data,
  ) => {
    if (
      web3 &&
      contract_data
    ) {
      if (chain_id === chainId) {
        try {
          const {
            contract_address,
            symbol,
            decimals,
            image,
          } = { ...contract_data }

          const response =
            await web3.currentProvider
              .request(
                {
                  method: 'wallet_watchAsset',
                  params: {
                    type: 'ERC20',
                    options: {
                      address: contract_address,
                      symbol,
                      decimals,
                      image:
                        image ?
                          `${
                            image.startsWith('/') ?
                              process.env.NEXT_PUBLIC_SITE_URL :
                              ''
                          }${image}` :
                          undefined,
                    },
                  },
                },
              )
        } catch (error) {}

        setData(null)
      }
      else {
        switchChain(
          chain_id,
          contract_data,
        )
      }
    }
  }

  const switchChain = async (
    chain_id,
    contract_data,
  ) => {
    try {
      await web3.currentProvider
        .request(
          {
            method: 'wallet_switchEthereumChain',
            params: [
              {
                chainId: web3.utils.toHex(chain_id),
              },
            ],
          },
        )
    } catch (error) {
      const {
        code,
      } = { ...error }

      if (code === 4902) {
        try {
          const {
            provider_params,
          } = {
            ...(
              (chains_data || [])
                .find(c =>
                  c.chain_id === chain_id
                )
            ),
          }

          await web3.currentProvider
            .request(
              {
                method: 'wallet_addEthereumChain',
                params: provider_params,
              },
            )
        } catch (error) {}
      }
    }

    if (contract_data) {
      setData(
        {
          chain_id,
          contract_data,
        }
      )
    }
  }

  const {
    contract_address,
  } = { ...token_data }

  return (
    contract_address !== constants.AddressZero &&
    (
      <button
        onClick={
          () =>
            addToken(
              token_data?.chain_id,
              token_data,
            )
        }
        className="min-w-max bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 shadow rounded cursor-pointer flex items-center py-1.5 px-2"
      >
        <Image
          src="/logos/wallets/metamask.png"
          width={16}
          height={16}
        />
      </button>
    )
  )
}