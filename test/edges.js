// a lot of this file was stolen from https://github.com/0xcert/ethereum-erc721/blob/master/src/tests/tokens/nf-token.js
// and then heavily edited to make it work for our contract
// good start for getting a thorough amount of test cases in though

const { expect } = require('chai');

describe('NFT ERC721 Tests', function() {
  let nfToken, parentContract, owner, bob, jane, sara, parentOwner;
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const id1 = 123;
  const id2 = 124;

  beforeEach(async () => {
    [ owner, bob, jane, sara, parentOwner] = await ethers.getSigners();

    const parentContractFactory = await ethers.getContractFactory('MockERC721', parentOwner);
    parentContract = await parentContractFactory.deploy('ParentToken','PTK','');

    const first_minter = await parentContract.getRoleMember('0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6', 0);
    expect(first_minter).to.equal(parentOwner.address);
    await parentContract.connect(parentOwner).mint(bob.address);

    const nftContract = await ethers.getContractFactory('NeonEdges');
    nfToken = await nftContract.deploy('NeonEdges','NDG', parentContract.address);
    await nfToken.deployed();
  });

  it('correctly checks all the supported interfaces', async function() {
    expect(await nfToken.supportsInterface('0x80ac58cd')).to.equal(true);
    expect(await nfToken.supportsInterface('0x5b5e139f')).to.equal(true);
    expect(await nfToken.supportsInterface('0x780e9d63')).to.equal(false);
  });

  it('returns the correct contract name', async function() {
    expect(await nfToken.name()).to.equal('NeonEdges');
  });

  it('returns the correct contract symbol', async function() {
    expect(await nfToken.symbol()).to.equal('NDG');
  });

  it('correctly mint NFTs', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    const parentTokenId = 0;
    expect(await nfToken.connect(bob).mint(parentTokenId)).to.emit(nfToken, 'Transfer');
    expect(await nfToken.balanceOf(bob.address)).to.equal(100);
    expect(await nfToken.tokenURI(77));
  });

  it('throws when trying to get URI of invalid NFT ID', async function() {
    //await expect(nfToken.tokenURI(id1)).to.be.reverted;
    await expect(nfToken.tokenURI(id1)).to.be.reverted;
  });

  it('returns correct balanceOf', async function() {
    expect(await nfToken.balanceOf(bob.address)).to.equal(0);

    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    expect(await nfToken.balanceOf(bob.address)).to.equal(100);

    await parentContract.connect(parentOwner).mint(bob.address);
    await nfToken.connect(bob).mint(1);
    expect(await nfToken.balanceOf(bob.address)).to.equal(200);

    //TODO add part for reclaiming parent and computing balanceOf after
  });

  it('throws when trying to get count of NFTs owned by 0x0 address', async function() {
    await expect(nfToken.balanceOf(zeroAddress)).to.be.reverted;
  });

  it('throws when trying to mint NFT to 0x0 address', async function() {
    await expect(nfToken.connect(zeroAddress).mint(0)).to.be.reverted;
  });

  it('finds the correct owner of NFToken id', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    expect(await nfToken.balanceOf(bob.address)).to.equal(100);
    for (let i = 0; i < 100; i++) {
      expect(await nfToken.ownerOf(i)).to.equal(bob.address);
    }
    await expect(nfToken.ownerOf(101)).to.be.reverted;
  });

  it('throws when trying to find owner od non-existing NFT id', async function() {
    await expect(nfToken.ownerOf(id1)).to.be.reverted;
  });

  it('correctly approves account', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    const id76 = 76;
    expect(await nfToken.connect(bob).approve(sara.address, id76)).to.emit(nfToken, 'Approval');
    expect(await nfToken.getApproved(id76)).to.equal(sara.address);
  });

  it('correctly cancels approval', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    const id76 = 76;
    await nfToken.connect(bob).approve(sara.address, id76);
    await nfToken.connect(bob).approve(zeroAddress, id76);
    expect(await nfToken.getApproved(id76)).to.equal(zeroAddress);
  });

  it('throws when trying to get approval of non-existing NFT id', async function() {
    await expect(nfToken.getApproved(id1)).to.be.reverted;
  });

  it('throws when trying to approve NFT ID from a third party', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    const id76 = 76;
    await expect(nfToken.connect(sara).approve(sara.address, id76)).to.be.reverted;
  });

  it('correctly sets an operator', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    expect(await nfToken.connect(bob).setApprovalForAll(sara.address, true)).to.emit(nfToken, 'ApprovalForAll');
    expect(await nfToken.isApprovedForAll(bob.address, sara.address)).to.equal(true);
  });

  it('correctly sets then cancels an operator', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    await nfToken.connect(bob).setApprovalForAll(sara.address, true);
    await nfToken.connect(bob).setApprovalForAll(sara.address, false);
    expect(await nfToken.isApprovedForAll(bob.address, sara.address)).to.equal(false);
  });

  it('correctly transfers NFT from owner', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    expect(await nfToken.connect(bob).transferFrom(bob.address, sara.address, 76)).to.emit(nfToken, 'Transfer');
    expect(await nfToken.balanceOf(bob.address)).to.equal(99);
    expect(await nfToken.balanceOf(sara.address)).to.equal(1);
    expect(await nfToken.ownerOf(76)).to.equal(sara.address);
  });

  it('correctly transfers NFT from approved address', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    const id1 = 76;
    await nfToken.connect(bob).approve(sara.address, id1);
    await nfToken.connect(sara).transferFrom(bob.address, jane.address, id1);
    expect(await nfToken.balanceOf(bob.address)).to.equal(99);
    expect(await nfToken.balanceOf(jane.address)).to.equal(1);
    expect(await nfToken.ownerOf(id1)).to.equal(jane.address);
  });

  it('correctly transfers NFT as operator', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    const id1 = 76;
    await nfToken.connect(bob).setApprovalForAll(sara.address, true);
    await nfToken.connect(sara).transferFrom(bob.address, jane.address, id1);
    expect(await nfToken.balanceOf(bob.address)).to.equal(99);
    expect(await nfToken.balanceOf(jane.address)).to.equal(1);
    expect(await nfToken.ownerOf(id1)).to.equal(jane.address);
  });

  it('throws when trying to transfer NFT as an address that is not owner, approved or operator', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    await expect(nfToken.connect(sara).transferFrom(bob.address, jane.address, id1)).to.be.reverted;
  });

  it('throws when trying to transfer NFT to a zero address', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    await expect(nfToken.connect(bob).transferFrom(bob.address, zeroAddress, id1)).to.be.reverted;
  });

  it('throws when trying to transfer an invalid NFT', async function() {
    await expect(nfToken.connect(bob).transferFrom(bob.address, sara.address, id1)).to.be.reverted;
  });

  it('correctly safe transfers NFT from owner', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    const id1 = 76;
    expect(await nfToken.connect(bob)['safeTransferFrom(address,address,uint256)'](bob.address, sara.address, id1)).to.emit(nfToken, 'Transfer');
    expect(await nfToken.balanceOf(bob.address)).to.equal(99);
    expect(await nfToken.balanceOf(sara.address)).to.equal(1);
    expect(await nfToken.ownerOf(id1)).to.equal(sara.address);
  });

  it('throws when trying to safe transfers NFT from owner to a smart contract that doesnt expect ERC721s', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    const id1 = 76;
    await expect(nfToken.connect(bob)['safeTransferFrom(address,address,uint256)'](bob.address, nfToken.address, id1)).to.be.revertedWith('ERC721: transfer to non ERC721Receiver implementer');
  });

  it('correctly safe transfers NFT from owner to smart contract that can receive NFTs', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    const id1 = 76;

    const tokenReceiverContract = await ethers.getContractFactory('NFTokenReceiverTestMock');
    const tokenReceiver = await tokenReceiverContract.deploy();
    await tokenReceiver.deployed();

    await nfToken.connect(bob)['safeTransferFrom(address,address,uint256)'](bob.address, tokenReceiver.address, id1);
    expect(await nfToken.balanceOf(bob.address)).to.equal(99);
    expect(await nfToken.balanceOf(tokenReceiver.address)).to.equal(1);
    expect(await nfToken.ownerOf(id1)).to.equal(tokenReceiver.address);
  });

  it('correctly safe transfers NFT from owner to smart contract that can receive NFTs with data', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
    const id1 = 76;

    const tokenReceiverContract = await ethers.getContractFactory('NFTokenReceiverTestMock');
    const tokenReceiver = await tokenReceiverContract.deploy();
    await tokenReceiver.deployed();

    expect(await nfToken.connect(bob)['safeTransferFrom(address,address,uint256,bytes)'](bob.address, tokenReceiver.address, id1, '0x01')).to.emit(nfToken, 'Transfer');
    expect(await nfToken.balanceOf(bob.address)).to.equal(99);
    expect(await nfToken.balanceOf(tokenReceiver.address)).to.equal(1);
    expect(await nfToken.ownerOf(id1)).to.equal(tokenReceiver.address);
  });

  it('correctly redeems a parent NFT', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)

    expect(await parentContract.ownerOf(0)).to.equal(nfToken.address);

    let burnlist = []
    for (let i =0 ; i < 100; i++)
      burnlist.push(i);

    expect(await nfToken.connect(bob).redeem(burnlist)).to.emit(nfToken, 'Transfer');
    expect(await nfToken.balanceOf(bob.address)).to.equal(0);

    await expect(nfToken.ownerOf(75)).to.be.reverted;

    expect(await parentContract.ownerOf(0)).to.equal(bob.address);

  });

  it('throws when trying to burn non existent NFT', async function() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)

    expect(await parentContract.ownerOf(0)).to.equal(nfToken.address);

    let burnlist = []
    for (let i =0 ; i < 100; i++)
      burnlist.push(i);

    burnlist[53] = 7214;

    await expect(nfToken.connect(bob).redeem(burnlist)).to.be.reverted;
  });

});
