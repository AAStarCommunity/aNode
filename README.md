# aNode
aNode is a permissionless and public goods for community to support their own ERC-20 token for gas sponsor, useroperation security check and more feats.

- ERC-4337 bundler support (Pimlico, Alchemy, AAStar Rundler)
- ERC-20 PNTs and Community customized ERC-20 gas token support
- Self-running paymaster support with SuperPaymaster relay and contract(if you want publish your ERC-20 gas token)
- Entrypoint V06 support
- Entrypoint V07, V08 is working on (inlude EIP-7704, EOA delegation)

Just send me useroperation!

## Phase design
1. Phase 1: a off-chain **paymaster** signature node, working with on-chain contract.
  - sign after verify the useroperation and sender account SBT and PNTs balance
  - contract invoke by Entrypoint(validatePaymasterSignaure)
  - contract set and change different public key on-chain contract by owner
2. Phase 2: a passkey signature **validator**
  - invoked by outer aNode to verify it is user's will, returen a aNode BLS signature aggregation
  - if the BLS collection is enough, act as a sender, send to bundler RPC
  - will be changed for PQC
3. Phase 3: hardware dependent, **account manager** with TEE security guarantee
  - support web interface for account life management(many details)
  - support RPC API for KMS service
4. Phase 4: **Guardian** as social recovery and deadman's switch and more security service
  - join gourp weight for multi signature on creating AA account
  - verify special useroperation for changing the private key, by social verifications, not onchain
  - provide signature to confirm the special useroperation
  - the last guardian will submit to bundler if signature is enough
  - will change to Hash algorithm cause of Post Quantumn Computing


## On chain contract
We use pimlico singliton paymaster contract as initial version, thanks for their love and contribution.
It act as onchain deposit account to Entrypoint, and a manageable public key to verify off chain signature.
Entrypoint will invoke it's function to verify.
It must register to SuperPaymaster to join the OpenPNTs and OpenCards and more protocols to use infras.
We provide a 5-minutes guidance to do this.

## Off chain relay
We use Rust to develop a new simple version, you can deploy it to Cloudflare with almost zero cost.
We reference the Nodejs paymaster from ZeroDev, thanks for their contribution.
It act as a off chain signer(can rotate) after verifying their pre-setting rules(like only support specific contract, specific ERC-20 and more).

## Register on SuperPaymaster to run
This mechanism requires SuperPaymaster(include one contract and permissionless relays), which act as a register, a stake contract and smart router(relay do this). 


