import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Contract, constants, utils } from 'ethers'
import moment from 'moment'
import { RotatingSquare } from 'react-loader-spinner'

import { number_format, equals_ignore_case, loader_color } from '../../lib/utils'

export default ({
  chainId,
  asset,
  contractAddress,
  decimals = 18,
  symbol,
  trigger,
  className = '',
}) => {
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

  useEffect(() => {
    const getData = async () => {
      if (
        chainId &&
        contractAddress &&
        (
          trigger ||
          _trigger
        )
      ) {
        setBalance(
          await getBalance(
            chainId,
            {
              contract_address: contractAddress,
              decimals,
            },
          )
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
  }, [trigger, _trigger])

  useEffect(() => {
    if (typeof balance === 'number') {
      setBalance(null)
      setTrigger(
        moment()
          .valueOf()
      )
    }
  }, [chainId, contractAddress])

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
      provider &&
      contract_address
    ) {
      if (contract_address === constants.AddressZero) {
        balance = await provider.getBalance(
          address,
        )
      }
      else {
        const contract = new Contract(
          contract_address,
          [
            'function balanceOf(address owner) view returns (uint256)',
          ],
          provider,
        )

        balance = await contract.balanceOf(
          address,
        )
      }
    }

    return (
      balance &&
      Number(
        utils.formatUnits(
          balance,
          decimals ||
          18,
        )
      ),
    )
  }

  const asset_data = assets_data?.find(a =>
    a?.id === asset
  )
  const {
    contracts,
  } = { ...asset_data }

  const contract_data = contracts?.find(c =>
    c?.chain_id === chainId
  )
  const {
    contract_address,
  } = { ...contract_data }

  const _balance = balances_data?.[chainId]?.find(b =>
    equals_ignore_case(
      b?.contract_address,
      contractAddress ||
      contract_address,
    )
  )
  let {
    amount,
  } = { ..._balance }

  amount = trigger ?
    balance :
    !isNaN(amount) ?
      Number(amount) :
      null

  symbol =
    symbol ||
    contract_data?.symbol ||
    asset_data?.symbol

  return (
    chainId &&
    asset &&
    (
      <div className={`flex items-center justify-center text-slate-600 dark:text-slate-200 text-xs space-x-1 ${className}`}>
        {typeof amount === 'number' ?
          <>
            <span className="font-bold">
              {number_format(
                amount,
                amount > 1000000 ?
                  '0,0' :
                  amount > 10000 ?
                    '0,0.00' :
                    '0,0.000000',
                true,
              )}
            </span>
            <span className="hidden sm:block font-semibold">
              {symbol}
            </span>
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