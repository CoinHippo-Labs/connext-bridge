import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import { Contract, constants, utils } from 'ethers'
import moment from 'moment'
import { RotatingSquare } from 'react-loader-spinner'

import { number_format, equals_ignore_case, loader_color } from '../../lib/utils'
import { BALANCES_DATA } from '../../reducers/types'

export default (
  {
    chainId,
    asset,
    contractAddress,
    decimals = 18,
    symbol,
    hideSymbol = false,
    trigger,
    className = '',
  },
) => {
  const dispatch = useDispatch()
  const {
    preferences,
    assets,
    rpc_providers,
    wallet,
    balances,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        assets: state.assets,
        rpc_providers: state.rpc_providers,
        wallet: state.wallet,
        balances: state.balances,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    assets_data,
  } = { ...assets }
  const {
    rpcs,
  } = { ...rpc_providers }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    web3_provider,
    address,
  } = { ...wallet_data }
  const {
    balances_data,
  } = { ...balances }

  const [balance, setBalance] = useState(null)
  const [_trigger, setTrigger] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (
          chainId &&
          contractAddress &&
          (
            trigger ||
            _trigger
          )
        ) {
          const contract_data = {
            contract_address: contractAddress,
            chain_id: chainId,
            decimals,
            symbol,
          }

          const balance =
            await getBalance(
              chainId,
              contract_data,
            )

          setBalance(balance)

          dispatch(
            {
              type: BALANCES_DATA,
              value: {
                [`${chainId}`]:
                  [
                    {
                      ...contract_data,
                      amount: balance,
                    }
                  ],
              },
            }
          )
        }
      }

      getData()

      const interval =
        setInterval(() =>
          getData(),
          30 * 1000,
        )

      return () => clearInterval(interval)
    },
    [trigger, _trigger],
  )

  useEffect(
    () => {
      if (typeof balance === 'number') {
        setBalance(null)
        setTrigger(
          moment()
            .valueOf()
        )
      }
    },
    [chainId, contractAddress],
  )

  const getBalance = async (
    chain_id,
    contract_data,
  ) => {
    const {
      contract_address,
      decimals,
    } = { ...contract_data }

    const provider = rpcs?.[chain_id]

    let balance

    if (
      address &&
      provider &&
      contract_address
    ) {
      if (contract_address === constants.AddressZero) {
        balance =
          await provider
            .getBalance(
              address,
            )
      }
      else {
        const contract =
          new Contract(
            contract_address,
            [
              'function balanceOf(address owner) view returns (uint256)',
            ],
            provider,
          )

        balance =
          await contract
            .balanceOf(
              address,
            )
      }
    }

    return (
      balance &&
      utils.formatUnits(
        balance,
        decimals ||
        18,
      ),
    )
  }

  const asset_data = (assets_data || [])
    .find(a =>
      a?.id === asset
    )

  const {
    contracts,
  } = { ...asset_data }

  const contract_data = (contracts || [])
    .find(c =>
      c?.chain_id === chainId
    )

  const {
    contract_address,
  } = { ...contract_data }

  const _balance = (balances_data?.[chainId] || [])
    .find(b =>
      equals_ignore_case(
        b?.contract_address,
        contractAddress ||
        contract_address,
      )
    )

  let {
    amount,
  } = { ..._balance }

  amount =
    trigger ?
      balance :
      [
        'string',
        'number',
      ].includes(typeof amount) &&
      !isNaN(amount) ?
        amount :
        null

  symbol =
    symbol ||
    contract_data?.symbol ||
    asset_data?.symbol

  return (
    chainId &&
    asset &&
    (
      <div className={`flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm space-x-1 ${className}`}>
        {
          [
            'string',
            'number',
          ].includes(typeof amount) &&
          !isNaN(amount) ?
            <>
              <span className="font-semibold">
                {number_format(
                  amount,
                  Number(amount) > 1000000 ?
                    '0,0' :
                    Number(amount) > 10000 ?
                      '0,0.00' :
                      '0,0.00000000',
                  true,
                )}
              </span>
              {
                !hideSymbol &&
                (
                  <span className="hidden sm:block font-semibold">
                    {symbol}
                  </span>
                )
              }
            </> :
            typeof amount === 'string' ?
              <span>
                n/a
              </span> :
              web3_provider &&
              (
                <RotatingSquare
                  color={loader_color(theme)}
                  width="16"
                  height="16"
                />
              )
        }
      </div>
    )
  )
}