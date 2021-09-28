import { request } from 'graphql-request'
import { utils } from 'ethers'
import { getDeployedSubgraphUri, getChainData } from '@connext/nxtp-utils'
import { getReceiverTransactionsQuery, getLiquidityQuery } from './queries'
import { config } from '../config'

export const getTVL = async () => {
  const chainData = await getChainData()
  const chains = config.chains

  let tvl = 0

  for (const chainId of chains) {
    try {
      const subgraph = getDeployedSubgraphUri(chainId)
      const cd = chainData!.get(String(chainId))
      console.log(cd!.name)

      let _skip = 0
      let totalTransactions = 0
      let totalForChain = 0
      let flag = 1
      const _first = 1000

      while (flag) {
        const txs = await request(subgraph!, getReceiverTransactionsQuery, {
          receivingChainId: chainId,
          status: 'Fulfilled',
          first: _first,
          skip: _skip,
        })

        if (!txs || !txs.transactions) {
          break
        }
        totalTransactions += txs.transactions.length
        _skip += txs.transactions.length

        console.log(txs)
        console.log(
          'length of the transactions queried',
          txs.transactions.length,
        )

        if (txs.transactions.length < _first) {
          flag = 0
        }

        // let liq: Record<string, any> = {};
        for (const tx of txs.transactions) {
          const decimals = cd!.assetId[utils.getAddress(tx.receivingAssetId)]
            ?.decimals

          totalForChain += parseFloat(utils.formatUnits(tx.amount, decimals))
        }
      }

      tvl += totalForChain

      console.log('chainId: ', chainId)
      console.log('totalForChain', totalForChain)
      console.log('total transactions', totalTransactions)
    } catch (err) {
      console.error(err)
    }
  }
  console.log('tvl', tvl)
}

export const getRouterLiquidity = async () => {
  const chainData = await getChainData()
  const chains = config.chains

  for (const chainId of chains) {
    const subgraph = getDeployedSubgraphUri(chainId)

    const res = await request(subgraph!, getLiquidityQuery, {})

    // console.log(res.assetBalances)
    if (!res || !res.assetBalances || res.assetBalances.length === 0) {
      continue
    }

    const cd = chainData!.get(String(chainId))
    console.log(cd!.name)

    for (const a of res.assetBalances) {
      const [asset, router] = a.id.split('-')

      //   console.log(router, asset)

      const assetInfo = cd!.assetId[utils.getAddress(asset)]
      const formatedAmount = parseFloat(
        utils.formatUnits(a.amount, assetInfo.decimals),
      )

      if (Math.floor(formatedAmount) < 10) {
        continue
      }

      console.log(router, assetInfo.symbol, formatedAmount)
    }
  }
}