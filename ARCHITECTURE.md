# Architecture Design

The following paragraphs describe the main functions of the protocol. Our protocol has 4 components, which may or may not end up being physically separate contracts:

* NeonEdgesToken - an ERC721-compliant NFT contract which produces the Edge artworks and holds who owns which Edge tokens
* EdgesVault - holds all of the squiggles that the protocol owns (currently encapsulated by the token contract)
* NeonEdgesMarket - a marketplace for buying and selling Edges.
* NeonEdgesDAO - a contract to force the DAO to purchase more and more squiggles as we make money from people buying and selling edges

In addition two non-protocol contracts are pictured, which are outside our control but we will interact with:
* OpenSea WyvernExchange - this is the standard OpenSea smart contract that everyone uses when they buy and sell on OpenSea
* Art Blocks Old BLOCKS Token - this is the ArtBlocks contract for chromie squiggles that controls who owns what squiggle. TokenIDs 0-10,000 are the squiggle tokens. Note that we use Chromie Squiggles in this example, but any ERC721-compliant NFT could be fractionalized by our protocol.

## Minting New Edges from Parent NFTs

If you already own a chromie squiggle you may choose to fractionalize it into edges (perhaps because the price of neon edges is higher than the price of a floor squiggle, and you wish to sell some edges). First, you approve token transfers on the parent contract, in this case the ArtBlocks squiggle contract. Then you call deposit on the vault contract, which moves control of the squiggle over to itself, and then tells the token contract to issue 100 new edges in your name.

daopurchasing.dia  daopurchasing.png  minting.dia  minting.png  redeeming.dia  redeeming.png

![Diagram of minting function calls](https://raw.githubusercontent.com/relyt29/neon-edges/main/diagrams/minting.png)


## Redeeming Edges for a Parent NFT

Later in time you observe that you want to own a parent NFT, and you have 100 edges. Perhaps this is because you think edges are ugly, or because you observe that the price of edges has gone so low that you can make a small arbitrage profit buying edges on the open market and redeeming them for a squiggle and then selling that on the open market. So first you obtain 100 edges (not pictured). Then you call redeem() on the vault, telling it which edges you own. The vault then checks with the token contract to make sure you do indeed own all of the edges. Assuming you own all of the edges, it then burns them (by sending the edge ownership from you to the address 0x0000...). On success, the vault picks a squiggle at random, and then transfers ownership on the parent NFT contract to you, the redeemer.

![Diagram of redeem function calls](https://raw.githubusercontent.com/relyt29/neon-edges/main/diagrams/redeeming.png)

## Forcing the Edges DAO to automatically buy squiggles

**Note: this function will be enabled in a future release and is not going to be implemented for the intial first rollout of the protocol.**

Perhaps you are a fan of the Edges ecosystem. At some point you observe that the Edges treasury, which has been collecting any and all fees of edges bought and sold on every NFT platform that allows royalties (opensea, rarible, the custom edges marketplace, some day coinbase and shoyu, etc) perpetually, has a lot of money. So you observe that in fact they have enough money to buy a squiggle on opensea. So you send a transaction purchaseSquiggle(tokenid) to the DAO telling it to buy a squiggle with its own funds. It sends a TX to OpenSea atomicMatch, and buys the squiggle from OpenSea. Then the token contract issues 100 new edges to the DAO which automatically lists those edges on the NeonEdgesMarket contract.

![Diagram of dao purchase function calls](https://raw.githubusercontent.com/relyt29/neon-edges/main/diagrams/daopurchasing.png)


