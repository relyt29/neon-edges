//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INeonMarket {

    event CreateListing(
        uint256 indexed tokenID,
        uint256 price,
        address indexed from,
        address indexed to,
        uint256 expireTime
    );

    event CancelListing(address indexed from, uint256 indexed tokenID);

    event Sale(
        uint256 indexed tokenID,
        uint256 price,
        address indexed from,
        address indexed to
    );

    struct Listing {
        uint256 price;
        address to;
        uint256 expireTime;
    }

    function cancelListing(uint256[] calldata tokenIdList) external;

    function listInWei(uint256 tokenId, uint256 priceInWeiNotEth, address to, uint256 expireTime) external;

    function listBatchInWei(
        uint256[] calldata tokenIdList,
        uint256[] calldata priceListInWeiNotEth,
        address[] calldata toList,
        uint256[] calldata expireTimeList) external;

    function buy(uint256 tokenIdList) external payable;

    function buyBatch(uint256[] calldata tokenIdList) external payable;

    function getListing(uint256 tokenId) external view returns (Listing memory);

    function isForSale(uint256 tokenId) external view returns (bool);

}
