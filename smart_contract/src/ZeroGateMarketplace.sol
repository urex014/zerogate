// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "solady/tokens/ERC721.sol";

contract ZeroGateMarketplace is ERC721 {
    address public owner;
    uint256 public platformFeeBps = 250; // 2.5% fee (10000 = 100%)

    struct Listing {
        address seller;
        uint256 price;
        bool isSold;
        bool isDelivered;
        address buyer;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public nextItemId;
    mapping(uint256 => string) private _tokenURIs; // IPFS Telemetry Mapping

    constructor() {
        owner = msg.sender;
    }

    // --- NFT Metadata Standard ---
    function name() public pure override returns (string memory) { return "ZeroGate Assets"; }
    function symbol() public pure override returns (string memory) { return "ZGA"; }
    
    // THE FIX: Only one tokenURI function exists now, routing to your IPFS mapping
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    // --- Core Events ---
    event ItemListed(uint256 itemId, uint256 price, address seller);
    event ItemPurchased(uint256 itemId, address buyer, uint256 amount);
    event DeliveryConfirmed(uint256 itemId, address seller, uint256 payout);

    // 1. LIST: Initialize the Digital Twin
    function listAsset(uint256 _price, string memory _tokenURIStr) external {
        uint256 itemId = nextItemId++;
        listings[itemId] = Listing({
            seller: msg.sender,
            price: _price,
            isSold: false,
            isDelivered: false,
            buyer: address(0)
        });
        
        _mint(msg.sender, itemId); // Mints the NFT to the seller
        _tokenURIs[itemId] = _tokenURIStr; // Links the IPFS Metadata
        
        emit ItemListed(itemId, _price, msg.sender);
    }

    // 2. BUY: Escrow Protocol
    function buyAsset(uint256 _itemId) external payable {
        Listing storage listing = listings[_itemId];
        
        // THE FIX: Strict equality prevents accidental overpayment and stuck funds
        require(msg.value == listing.price, "EXACT_PRICE_REQUIRED");
        require(!listing.isSold, "ALREADY_SOLD");

        listing.buyer = msg.sender;
        listing.isSold = true;

        emit ItemPurchased(_itemId, msg.sender, msg.value);
    }

    // 3. CONFIRM: Settlement Protocol
    function confirmDelivery(uint256 _itemId) external {
        Listing storage listing = listings[_itemId];
        require(msg.sender == listing.buyer, "NOT_BUYER");
        require(listing.isSold && !listing.isDelivered, "INVALID_STATE");

        listing.isDelivered = true;
        uint256 totalAmount = listing.price;
        
        // Calculate 2.5% platform fee
        uint256 fee = (totalAmount * platformFeeBps) / 10000;
        uint256 sellerPayout = totalAmount - fee;
        
        // Transfer the NFT from Seller to Buyer
        _transfer(listing.seller, listing.buyer, _itemId);
        
        // Disburse Funds
        (bool s1, ) = payable(listing.seller).call{value: sellerPayout}("");
        require(s1, "SELLER_PAYOUT_FAILED");

        (bool s2, ) = payable(owner).call{value: fee}("");
        require(s2, "FEE_TRANSFER_FAILED");

        emit DeliveryConfirmed(_itemId, listing.seller, sellerPayout);
    }
}