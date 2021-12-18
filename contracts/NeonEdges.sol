//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "hardhat/console.sol";

contract NeonEdges is IERC721, IERC721Metadata, ERC165 {
    using Address for address;

    string public override name;
    string public override symbol;
    address public parent;
    address public DEAD_ADDR = 0x000000000000000000000000000000000000dEaD;

    uint constant NUM_EDGES_PER_SQUIGGLE = 100;

    // owner map is divided into two to allow for cheaper minting
    mapping(uint256 => address) private _single_owner_map;
    mapping(uint256 => address) private _batch_owner_map;
    // how many does each person have
    mapping(address => uint256) private _balances;
    // individual token approvals
    mapping(uint256 => address) private _token_approvals;
    // approvals for all
    mapping(address => mapping(address => bool)) private _operator_approvals;

    uint256 public num_squiggles_deposited = 0;
    uint256 public num_squiggles_reclaimed = 0;

    address public admin;
    address public marketplace;

    constructor(string memory _name, string memory _symbol, address _parent) {
        require(ERC165(_parent).supportsInterface(0x80ac58cd), "Parent must be ERC721 compliant");
        require(ERC165(_parent).supportsInterface(0x780e9d63), "Parent must be ERC721Enumerable compliant");
        name = _name;
        symbol = _symbol;
        parent = _parent;
        admin = msg.sender;
    }

    function setMarketplace(address _marketplace) public {
        require(msg.sender == admin, "This can only be set by the person who created the edge contract");
        require(marketplace == address(0), "This can only be set once and never again");
        marketplace = _marketplace;
    }

    function totalSupply() public view returns (uint256) { return num_squiggles_deposited*NUM_EDGES_PER_SQUIGGLE - num_squiggles_reclaimed*NUM_EDGES_PER_SQUIGGLE; }

    function supportsInterface(bytes4 interfaceId) public view override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function balanceOf(address owner) public view override returns (uint256) {
        require(owner != address(0), "ERC721: balance query for the zero address");
        require(owner != DEAD_ADDR, "ERC721: balance query for the DEAD address");
        return _balances[owner];
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool) {
        require(_exists(tokenId), "ERC721: operator query for nonexistent token");
        address owner = this.ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    // THIS IS A HIGHLY PRIVILEGED FUNCTION, NEEDS SECURITY CHECKS
    function marketTransferFrom(address from, address to, uint256 tokenId) external {
        //require(marketplace != address(0), "Marketplace must be set");
        require(msg.sender == marketplace, "Only marketplace allowed to call this function");
        _transfer(from, to, tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: transfer caller is not owner nor approved");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: transfer caller is not owner nor approved");
        _safeTransfer(from, to, tokenId, _data);
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) private returns (bool) {
        if (to.isContract()) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, _data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal virtual {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, _data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        require(this.ownerOf(tokenId) == from, "ERC721: transfer of token that is not own");
        require(to != address(0), "ERC721: transfer to the zero address");
        require(to != DEAD_ADDR, "ERC721: transfer to the DEAD address");
        require(from != address(0));
        require(from != DEAD_ADDR);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _single_owner_map[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }



    function getApproved(uint256 tokenId) public view override returns (address) {
        require(_exists(tokenId), "ERC721: approved query for nonexistent token");

        return _token_approvals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public override {
        require(operator != msg.sender, "ERC721: approve to caller");

        _operator_approvals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        return _operator_approvals[owner][operator];
    }


    function ownerOf(uint256 tokenId) external view override returns (address owner) {
        address batch_owner = _batch_owner_map[tokenId / NUM_EDGES_PER_SQUIGGLE];
        address single_owner = _single_owner_map[tokenId];
        if (single_owner == DEAD_ADDR)
          revert("ERC721: owner query for nonexistent token - DEAD");
        if (single_owner == address(0) && batch_owner == address(0))
            revert("ERC721: owner query for nonexistent token (batch+single)");
        if (single_owner != address(0) && batch_owner != address(0))
            return single_owner;
        if (single_owner == address(0) && batch_owner != address(0))
            return batch_owner;
        if (single_owner != address(0) && batch_owner == address(0))
            revert("Should never happen: batch owner not set, but single owner set");

        revert("Should never happen; unreachable code");
    }

    function approve(address to, uint256 tokenId) public override {
        address owner = this.ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");

        require(msg.sender == owner || isApprovedForAll(owner, msg.sender),
            "ERC721: approve caller is not owner nor approved for all"
        );
        _approve(to, tokenId);
    }


    function _approve(address to, uint256 tokenId) internal {
        _token_approvals[tokenId] = to;
        emit Approval(this.ownerOf(tokenId), to, tokenId);
    }



    function _exists(uint256 tokenId) internal view returns (bool) {
        //console.log(tokenId / NUM_EDGES_PER_SQUIGGLE);
        //console.log(_batch_owner_map[tokenId / NUM_EDGES_PER_SQUIGGLE]);
        ///return _batch_owner_map[tokenId / NUM_EDGES_PER_SQUIGGLE] != address(0);
        uint batchId = tokenId / NUM_EDGES_PER_SQUIGGLE; //floor

        if ( batchId > num_squiggles_deposited )
            return false;

        if(_single_owner_map[tokenId] == DEAD_ADDR)
            return false;
        return true;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        //TODO STUFF
        //revert("Not yet implemented");
        return "haha to be implemented ya fool";
    }

    function mint(uint256 _parentTokenId) public {
        require(
          IERC721(parent).isApprovedForAll(msg.sender, address(this)) ||
          (IERC721(parent).getApproved(_parentTokenId) == address(this)),
          "Vault must be approved to transfer parent NFT to itself");
        IERC721(parent).transferFrom(msg.sender, address(this), _parentTokenId);
        require(IERC721(parent).ownerOf(_parentTokenId) == address(this), "transferFrom did not transfer token to the vault");
        uint temp = num_squiggles_deposited;
        _batch_owner_map[num_squiggles_deposited] = msg.sender;
        num_squiggles_deposited = num_squiggles_deposited + 1;
        _balances[msg.sender] += NUM_EDGES_PER_SQUIGGLE;
        for (uint i = (temp*NUM_EDGES_PER_SQUIGGLE); i < ((temp+1)*NUM_EDGES_PER_SQUIGGLE); i++) {
            emit Transfer(address(0), msg.sender, i);
        }
    }

    function fake_random() private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, blockhash(block.number), uint16(0x1337))));
    }


    function redeem(uint256[NUM_EDGES_PER_SQUIGGLE] calldata _burnList) public {
        require(num_squiggles_reclaimed < num_squiggles_deposited, "Unable to reclaim, vault is empty!");
        IERC721Enumerable parentContract = IERC721Enumerable(parent);
        uint vaultBal = parentContract.balanceOf(address(this));
        require(vaultBal > 0, "Unable to reclaim, vault is empty2!");
        for (uint i = 0; i < NUM_EDGES_PER_SQUIGGLE; i++ ) {
            uint tokenId = _burnList[i];
            require(_exists(tokenId), "Cant burn a token that doesnt exist");
            require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: redeem caller is not owner nor approved");

            // Clear approvals
            _approve(address(0), tokenId);

            _balances[msg.sender] -= 1;

            // To avoid weirdness with the single and batch token maps,
            // rather than sending to the 0 address, we send to 0x00000dead instead
            _single_owner_map[tokenId] = DEAD_ADDR;

            emit Transfer(msg.sender, address(0), tokenId);

        }
        num_squiggles_reclaimed = num_squiggles_reclaimed + 1;

        // attack exists where user can write a contract and/or use flashbots
        // to brute force redeem, reverting until they get the particular
        // squiggle they want out of the vault, without paying gas until
        // they get the one they want
        // could be solved by chainlink VRF, but do we really care?
        uint fake_rand = fake_random();
        uint whichParent = parentContract.tokenOfOwnerByIndex(address(this), (fake_rand % vaultBal));
        parentContract.transferFrom(address(this), msg.sender, whichParent);


    }

}
