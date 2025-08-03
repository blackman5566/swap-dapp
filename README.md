# 🦄 Swap DApp Frontend (with L1 ↔ L2 Support) [[Demo Video](https://www.youtube.com/watch?v=UL8BmhMOH6w)]

This is the Web3 integration interface I started on July 15, 2025 and delivered in roughly two weeks: directly connected to my own AMM smart contracts (see https://github.com/blackman5566/swap-contracts), supporting multi-hop swaps, liquidity operations, and native asset bridging between Ethereum Sepolia (L1) and Arbitrum Sepolia (L2). The full system—from wallet flow, fast nonce-based signed login with replay protection, contract interaction, to cross-chain bridging—was independently designed and implemented by me.

## Purpose & Key Capabilities
- End-to-end implementation: wallet connection, signed login (nonce challenge to prevent replay), token approvals, slippage/path computation, swap, add liquidity, cross-chain deposit/withdraw.  
- Multi-hop path support: automatically decompose swap routes and compute minimum acceptable output (slippage protection).  
- Native L1 ↔ L2 bridging: bidirectional asset movement between Sepolia and Arbitrum Sepolia (deposit / withdraw).  
- Integrated with own smart contract repo: works with the companion repository (https://github.com/blackman5566/swap-contracts), consuming actual deployed addresses and ABIs to keep frontend and backend aligned.  
- Practical delivery: fast turnaround, replay prevention, visual transaction state, low-slippage design, and cross-layer safety checks.

## Core Dependencies (see actual versions in `package.json`)
- `react` / `next`: UI and page framework  
- `wagmi`: wallet connection and chain/account state management  
- `@wagmi/connectors`: injected wallet connectors like MetaMask  
- `ethers`: contract interaction, signing, number formatting  
- `viem`: token unit and arithmetic helpers (`formatEther` / `parseEther`)  
- `react-i18next` / `i18next`: internationalization  
- `lucide-react`: icons (direction, status, etc.)  
- `clsx`: conditional class merging (if used)  
- `next/dynamic`: client-only component lazy loading  

Optional / situational:  
- `@tanstack/react-query`: data fetching & caching  
- `date-fns` / `dayjs`: time formatting  
- `axios` or native `fetch`: additional API calls  

## Environment Variables (put in `.env.local`, DO NOT commit)  
These values should be replaced with the actual addresses and keys deployed from the smart contract repository. Inject them dynamically in development/deployment; do not hardcode.

```env
NEXT_PUBLIC_SWAPX_ADDRESS=0xe039608E695D21aB11675EBBA00261A0e750526c  # replace with deployed address from swap-contracts
NEXT_PUBLIC_GOLDX_ADDRESS=0x071586BA1b380B00B793Cc336fe01106B0BFbE6D  # replace
NEXT_PUBLIC_ENERGYCOIN_ADDRESS=0xe70f935c32dA4dB13e7876795f1e175465e6458e  # replace
NEXT_PUBLIC_USDT_ADDRESS=0x3C15538ED063e688c8DF3d571Cb7a0062d2fB18D  # replace

NEXT_PUBLIC_FACTORY_ADDRESS=0xccf1769D8713099172642EB55DDFFC0c5A444FE9  # replace
NEXT_PUBLIC_ROUTER_ADDRESS=0x3904b8f5b0F49cD206b7d5AABeE5D1F37eE15D8d  # replace

NEXT_PUBLIC_ETHERSCAN_API_KEY=your_etherscan_api_key_here  # use a rotatable/test key or hide behind a proxy

```

## Security Notes
- All `NEXT_PUBLIC_` variables are bundled into the client and visible to users; avoid placing non-rotatable secrets (e.g., permanent mainnet keys).  
- Wrap external queries (e.g., Etherscan or on-chain reads) behind your own backend proxy so the real API key lives server-side.  
- Ensure `.env.local` is in `.gitignore`, for example:  
  ```
  node_modules/
  .next/
  dist/
  .env*
  ```  
- Always validate wallet `chainId` before cross-chain operations to prevent sending assets to the wrong layer.

## Authentication / Wallet Login Flow
Login uses a frontend-generated random nonce as a challenge; the user signs it with their wallet to prevent replay attacks. There is no persistent backend session—this is for demo/testing only, not a production identity solution.

## Author
This is an end-to-end implementation I independently built, from frontend to smart contracts (https://github.com/blackman5566/swap-contracts) and cross-chain logic. I delivered AMM multi-hop swapping, L1/L2 bridging, wallet flow, and replay-safe authentication in a very short time, solving real multi-chain asset flow and exchange challenges. MIT License.
