# Neon Edges Protocol

This is the code repository for the Neon Edges project. The goal is to provide a decentralized, autonomous protocol for fractionalization of NFT assets, into other NFT assets.

The solidity smart contracts live in `contracts/` and are compilable and testable using hardhat: `npx hardhat test`


# What is this?

Neon Edges is a protocol that creates fully on-chain based SVG TokenURI generative artworks who take as seed inputs parent artworks that the child artworks are collateralized by and are redeemable for.

alternatively: "Imagine a world where NFTx gave you unique, algorithmic ERC721 artworks when you locked up your chromie squiggle, instead of a blasé ERC20 to trade with."

There are three contributions to the cryptocurrency space that this project aims to achieve, two of which we believe to be the first of their kind:

1. We wish to create a fractionalization protocol that takes parent NFTs and turns them into fractional shares of the parent NFT. This protocol is permissionless and decentralized, and operated by smart contracts. Anyone on the internet can launch a fractionalization smart contract from this protocol that is compatible with thousands of NFTs already on the Ethereum blockchain. For our first public launch we will fractionalize [Chromie Squiggle #8518](https://opensea.io/assets/0x059edd72cd353df5106d2b9cc5ab83a52287ac3a/8518) into 100 fractions, to make Chromie Squiggles more affordable for the masses. (for similar projects, see: SquiggleDAO, fractional.art, others)

2. We wish to create a series of NFT artworks that are fully on-chain SVG abstract pictures, algorithmically generated from seed inputs. One of these seed inputs will be the entirety of another NFT (the squiggle). We believe we are the first project in Ethereum history to create NFT art that takes its input from other NFT art.

3. We wish to create a decentralized, permissionless smart contract that creates artworks on the fly as you lock up parent NFTs in a vault. Burning the fractional Edge artworks returns a random parent NFT from the vault back to you. We are almost certainly the first project in Ethereum history to do this.

# Architecture Design

The following paragraphs describe the main functions of the protocol. Our protocol has 4 components, which may or may not end up being physically separate contracts:

* NeonEdgesToken - an ERC721-compliant NFT contract which produces the Edge artworks and holds who owns which Edge tokens
* EdgesVault - holds all of the squiggles that the protocol owns (currently encapsulated by the token contract)
* NeonEdgesMarket - a marketplace for buying and selling Edges.
* NeonEdgesDAO - a contract to force the DAO to purchase more and more squiggles as we make money from people buying and selling edges

In addition two non-protocol contracts are pictured, which are outside our control but we will interact with:
* OpenSea WyvernExchange - this is the standard OpenSea smart contract that everyone uses when they buy and sell on OpenSea
* Art Blocks Old BLOCKS Token - this is the ArtBlocks contract for chromie squiggles that controls who owns what squiggle. TokenIDs 0-10,000 are the squiggle tokens. Note that we use Chromie Squiggles in this example, but any ERC721-compliant NFT could be fractionalized by our protocol.

For a more detailed discussion of the architecture, see ARCHITECTURE.md

# License

MIT
