//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./INeonMarket.sol";

interface IERC721M is IERC721 {
    function marketTransferFrom(address from, address to, uint256 tokenId) external;
}

contract NeonMarket is INeonMarket {
    IERC721M nftContract;

    uint256 constant NEVER_EXPIRE = 0;
    uint256 constant ANYBODY = 0;
    uint256 constant THE_PAST = 1;

    mapping(uint256 => Listing) private listings;

    constructor(address _nftContract) {
        nftContract = IERC721M(_nftContract);
    }

    function _list(uint256 tokenId, uint256 price, address to, uint256 expireTime) internal {
        isOwnerOrAllowed(tokenId, msg.sender);
        require(expireTime > block.timestamp || expireTime == NEVER_EXPIRE, "Gotta let the listing have a valid expiration time!");
        listings[tokenId] = Listing(price, to, expireTime);
        emit CreateListing(tokenId, price, msg.sender, to, expireTime);
    }

    function listInWei(uint256 tokenId, uint256 priceInWeiNotEth, address to, uint256 expireTime) external override {
        _list(tokenId, priceInWeiNotEth, to, expireTime);
    }

    function listBatchInWei(
        uint256[] calldata tokenIdList,
        uint256[] calldata priceListInWeiNotEth,
        address[] calldata toList,
        uint256[] calldata expireTimeList) external override {
        for (uint i = 0; i < tokenIdList.length; i++) {
            _list(tokenIdList[i], priceListInWeiNotEth[i], toList[i], expireTimeList[i]);
        }
    }

    function isOwnerOrAllowed(uint256 tokenId, address theAddress) internal view {
        address tokenOwner = nftContract.ownerOf(tokenId);
        require(tokenOwner == theAddress
            || nftContract.isApprovedForAll(tokenOwner, theAddress)
            || nftContract.getApproved(tokenId) == theAddress,
            "Address is not owner or approved");
    }

    function cancelListing(uint256[] calldata tokenIdList) external override {
        for (uint i = 0; i < tokenIdList.length; i++) {
            uint256 tokenId = tokenIdList[i];
            isOwnerOrAllowed(tokenId, msg.sender);
            listings[tokenId].expireTime = THE_PAST;
            emit CancelListing(msg.sender, tokenId);
        }
    }

    function buy(uint256 tokenId) external override payable {
        Listing memory l = listings[tokenId];
        require(l.expireTime != 0 ||
                l.price != 0 ||
                l.to != address(0),
                "Cannot buy an uninitialized listing");
        require(l.expireTime > block.timestamp
            || l.expireTime == NEVER_EXPIRE,
            "Listing must still be valid to be sold");
        require(l.price == msg.value, "must send correct money to pay purchase price");
        if (l.to != address(0))
          require(l.to == msg.sender, "if private sale, buyer must match target address the seller wants to sell to");

        listings[tokenId].expireTime = THE_PAST;
        address payable from = payable(nftContract.ownerOf(tokenId));
        nftContract.marketTransferFrom(from, msg.sender, tokenId);
        from.transfer(msg.value);
    }

    function buyBatch(uint256[] calldata tokenIdList) external override payable {
        uint sum = 0;
        for(uint i = 0; i < tokenIdList.length; i++) {
            uint tokenId = tokenIdList[i];
            Listing memory l = listings[tokenId];
            require(l.expireTime != 0 ||
                    l.price != 0 ||
                    l.to != address(0),
                    "Cannot buy an uninitialized listing");
            require(l.expireTime > block.timestamp
                || l.expireTime == NEVER_EXPIRE,
                "Listing must still be valid to be sold");
            if (l.to != address(0))
              require(l.to == msg.sender, "if private sale, buyer must match target address the seller wants to sell to");
            sum += l.price;
        }

        require(sum == msg.value, "must send correct money to pay purchase price");

        for(uint i = 0; i < tokenIdList.length; i++) {
            uint tokenId = tokenIdList[i];
            listings[tokenId].expireTime = THE_PAST;
            address payable from = payable(nftContract.ownerOf(tokenId));
            nftContract.marketTransferFrom(from, msg.sender, tokenId);
            from.transfer(listings[tokenId].price);
        }

    }

    function getListing(uint256 tokenId) external view override returns (Listing memory) {
        return listings[tokenId];
    }

    function isForSale(uint256 tokenId) external view override returns (bool) {
        if ( listings[tokenId].expireTime > block.timestamp)
            return true;
        bool listingInitialized = (listings[tokenId].price != 0 || listings[tokenId].to != address(0));
        if (listings[tokenId].expireTime == 0 && listingInitialized)
            return true;
        return false;
    }

}
