
const { expect } = require('chai');

describe('Market Tests', function() {
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

    const nftContract = await ethers.getContractFactory('NeonEdges', owner);
    nfToken = await nftContract.deploy('NeonEdges','NDG', parentContract.address);
    await nfToken.deployed();

    const marketplaceContract = await ethers.getContractFactory('NeonMarket', owner);
    marketplace = await marketplaceContract.deploy(nfToken.address);
    await marketplace.deployed();

    await nfToken.setMarketplace(marketplace.address);

  });

  async function mint100ToBob() {
    await parentContract.connect(bob).setApprovalForAll(nfToken.address, true);
    await nfToken.connect(bob).mint(0)
  }

  it('correctly sets marketplace on nft contract', async function() {
    expect(await nfToken.marketplace()).to.equal(marketplace.address);
  });

  it('does not allow setting the marketplace twice', async function() {
    await expect(nfToken.setMarketplace(bob.address)).to.be.revertedWith("This can only be set once and never again");
    await expect(nfToken.connect(bob).setMarketplace(bob.address)).to.be.revertedWith("This can only be set by the person who created the edge contract");
  });

  it('Empty is not for sale', async function() {
    expect(await marketplace.isForSale(id1)).to.equal(false);
  });

  it('Empty returns empty', async function() {
    const emptyListing = await marketplace.getListing(id1);
    expect(emptyListing.length).to.equal(3);
    expect(emptyListing[0]).to.equal(0);
    expect(emptyListing[1]).to.equal("0x0000000000000000000000000000000000000000");
    expect(emptyListing[2]).to.equal(0);
  });

  it('Doesnt let you buy something that doesnt exist', async function() {
    await expect(marketplace.connect(bob).buy(id1)).to.be.revertedWith("Cannot buy an uninitialized listing");
  });


  it('listsInWei correctly', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    expect(await marketplace.isForSale(i)).to.equal(true);
    const l = await marketplace.getListing(i);
    expect(l.length).to.equal(3);
    expect(l[0]).to.equal("1000000000000000000");
    expect(l[1]).to.equal("0x0000000000000000000000000000000000000000");
    expect(l[2]).to.equal(9639690373);
  });

  it('listsBatchInWei correctly', async function() {
    await mint100ToBob();
    await marketplace.connect(bob).listBatchInWei([77, 69], ["1000000000000000000", "30"], ["0x0000000000000000000000000000000000000000", "0xABC607b6B8ca9e849ec17E70cd673F0144E422F8"], [9639690373, 9639690372]);
    expect(await marketplace.isForSale(77)).to.equal(true);
    expect(await marketplace.isForSale(69)).to.equal(true);
    let l = await marketplace.getListing(77);
    expect(l.length).to.equal(3);
    expect(l[0]).to.equal("1000000000000000000");
    expect(l[1]).to.equal("0x0000000000000000000000000000000000000000");
    expect(l[2]).to.equal(9639690373);
    l = await marketplace.getListing(69);
    expect(l.length).to.equal(3);
    expect(l[0]).to.equal("30");
    expect(l[1]).to.equal("0xABC607b6B8ca9e849ec17E70cd673F0144E422F8");
    expect(l[2]).to.equal(9639690372);
  });

  it('Doesnt let you batch buy something that doesnt exist', async function() {
    await expect(marketplace.connect(bob).buyBatch([id1, id2])).to.be.revertedWith("Cannot buy an uninitialized listing");
    await mint100ToBob();
    await marketplace.connect(bob).listInWei(77, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    await expect(marketplace.connect(bob).buyBatch([77, id2])).to.be.revertedWith("Cannot buy an uninitialized listing");
  });

  it('allows you to cancel a listing', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    expect(await marketplace.isForSale(i)).to.equal(true);
    await marketplace.connect(bob).cancelListing([i]);
    expect(await marketplace.isForSale(i)).to.equal(false);
  });

  it('doesnt allow someone else to cancel your listing', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    await expect(marketplace.connect(jane).cancelListing([i])).to.be.revertedWith("Address is not owner or approved");
  });

  it('does allow someone else to cancel your listing when you set them as allowed', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    expect(await marketplace.isForSale(i)).to.equal(true);
    await nfToken.connect(bob).setApprovalForAll(jane.address, true);
    await marketplace.connect(jane).cancelListing([i]);
    expect(await marketplace.isForSale(i)).to.equal(false);
  });

  it('allows someone else to list on your behalf when you set them as allowed', async function() {
    await mint100ToBob();
    await nfToken.connect(bob).setApprovalForAll(jane.address, true);
    const i = 77;
    await marketplace.connect(jane).listInWei(i, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    expect(await marketplace.isForSale(i)).to.equal(true);
  });

  it('allows someone else to list batch on your behalf when you set them as allowed', async function() {
    await mint100ToBob();
    await nfToken.connect(bob).setApprovalForAll(jane.address, true);
    await marketplace.connect(jane).listBatchInWei([77, 69], ["1000000000000000000", "30"], ["0x0000000000000000000000000000000000000000", "0xABC607b6B8ca9e849ec17E70cd673F0144E422F8"], [9639690373, 9639690372]);
    expect(await marketplace.isForSale(77)).to.equal(true);
    expect(await marketplace.isForSale(69)).to.equal(true);
  });

  it('does not allow you to buy a listing that has been canceled', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    await marketplace.connect(bob).cancelListing([i]);
    await expect(marketplace.connect(jane).buy(i)).to.be.revertedWith("Listing must still be valid to be sold");
  });

  it('does not allow you to buy a listing sending improper money', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    await expect(marketplace.connect(jane).buy(i)).to.be.revertedWith("must send correct money to pay purchase price");
    await expect(marketplace.connect(jane).buy(i, {"value": "3030"})).to.be.revertedWith("must send correct money to pay purchase price");
  });

  it('does not allow you to buy a private listing if you arent the target', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", sara.address, 9639690373);
    await expect(marketplace.connect(jane).buy(i, {"value": "1000000000000000000"})).to.be.revertedWith("if private sale, buyer must match target address the seller wants to sell to");
  });

  it('allows you to buy private listings if you are the target', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", sara.address, 9639690373);
    expect(await nfToken.ownerOf(i)).to.equal(bob.address);
    expect(await marketplace.isForSale(i)).to.equal(true);
    await marketplace.connect(sara).buy(i, {"value": "1000000000000000000"});
    expect(await marketplace.isForSale(i)).to.equal(false);
    expect(await nfToken.ownerOf(i)).to.equal(sara.address);
  });

  it('allows you to buy listings if the listing is availabale to all', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", zeroAddress, 9639690373);
    expect(await nfToken.ownerOf(i)).to.equal(bob.address);
    expect(await marketplace.isForSale(i)).to.equal(true);
    await marketplace.connect(sara).buy(i, {"value": "1000000000000000000"});
    expect(await marketplace.isForSale(i)).to.equal(false);
    expect(await nfToken.ownerOf(i)).to.equal(sara.address);
  });




  it('does not allow you to batch buy a listing that has been canceled', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    await marketplace.connect(bob).listInWei(i+1, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    await marketplace.connect(bob).cancelListing([i]);
    await marketplace.connect(bob).cancelListing([i+1]);
    await expect(marketplace.connect(jane).buyBatch([i, i+1])).to.be.revertedWith("Listing must still be valid to be sold");
    await marketplace.connect(bob).listInWei(i, "1000000000000000000", "0x0000000000000000000000000000000000000000", 9639690373);
    await expect(marketplace.connect(jane).buyBatch([i, i+1])).to.be.revertedWith("Listing must still be valid to be sold");
  });

  it('does not allow you to batch buy a listing sending improper money', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listBatchInWei([i, i+1], ["1000000000000000000", "30"], [zeroAddress, zeroAddress], [9639690373, 9639690372]);
    await expect(marketplace.connect(jane).buyBatch([i, i+1])).to.be.revertedWith("must send correct money to pay purchase price");
    await expect(marketplace.connect(jane).buyBatch([i, i+1], {"value": "3030"})).to.be.revertedWith("must send correct money to pay purchase price");
  });

  it('does not allow you to batch buy a private listing if you arent the target', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listBatchInWei([i, i+1], ["1000000000000000000", "30"], [jane.address, sara.address], [9639690373, 9639690372]);
    await expect(marketplace.connect(jane).buyBatch([i, i+1], {"value": "1000000000000000030"})).to.be.revertedWith("if private sale, buyer must match target address the seller wants to sell to");
  });

  it('allows you to batch buy private listings if you are the target', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listBatchInWei([i, i+1], ["1000000000000000000", "30"], [sara.address, sara.address], [9639690373, 9639690372]);
    expect(await nfToken.ownerOf(i)).to.equal(bob.address);
    expect(await nfToken.ownerOf(i+1)).to.equal(bob.address);
    expect(await marketplace.isForSale(i)).to.equal(true);
    expect(await marketplace.isForSale(i+1)).to.equal(true);
    await marketplace.connect(sara).buyBatch([i, i+1], {"value": "1000000000000000030"})
    expect(await nfToken.ownerOf(i)).to.equal(sara.address);
    expect(await nfToken.ownerOf(i+1)).to.equal(sara.address);
    expect(await marketplace.isForSale(i)).to.equal(false);
    expect(await marketplace.isForSale(i+1)).to.equal(false);
  });

  it('allows you to batch buy listings if the listing is availabale to all', async function() {
    await mint100ToBob();
    const i = 77;
    await marketplace.connect(bob).listBatchInWei([i, i+1], ["1000000000000000000", "30"], [zeroAddress, zeroAddress], [9639690373, 9639690372]);
    expect(await nfToken.ownerOf(i)).to.equal(bob.address);
    expect(await nfToken.ownerOf(i+1)).to.equal(bob.address);
    expect(await marketplace.isForSale(i)).to.equal(true);
    expect(await marketplace.isForSale(i+1)).to.equal(true);
    await marketplace.connect(sara).buyBatch([i, i+1], {"value": "1000000000000000030"})
    expect(await nfToken.ownerOf(i)).to.equal(sara.address);
    expect(await nfToken.ownerOf(i+1)).to.equal(sara.address);
    expect(await marketplace.isForSale(i)).to.equal(false);
    expect(await marketplace.isForSale(i+1)).to.equal(false);
  });


});
