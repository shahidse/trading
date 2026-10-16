// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SignalRegistry
/// @notice Append-only on-chain log of off-chain trading signals.
///
/// The analysis engine runs off-chain (indicator maths is far too expensive for
/// a contract). This registry exists purely to give each signal a tamper-evident,
/// timestamped proof: publish the score and a metadata URI, and anyone can later
/// verify what was published and when.
contract SignalRegistry {
    enum Direction {
        NEUTRAL,
        LONG,
        SHORT
    }

    struct SignalRecord {
        Direction direction;
        /// Composite score, -100 (max bearish) .. +100 (max bullish).
        int16 score;
        /// Price scaled by 1e8 (Chainlink convention).
        uint64 priceE8;
        uint64 publishedAt;
        /// Optional pointer to detail (IPFS/HTTPS) with the full breakdown.
        string metadataUri;
    }

    /// @dev Deployer; the address allowed to publish signals.
    address public owner;

    SignalRecord[] private _signals;

    event SignalPublished(
        uint256 indexed id,
        Direction direction,
        int16 score,
        uint64 priceE8,
        string metadataUri
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error EmptyRegistry();
    error InvalidScore(int16 score);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Append a signal. Only the owner may publish.
    function publish(
        Direction direction,
        int16 score,
        uint64 priceE8,
        string calldata metadataUri
    ) external onlyOwner returns (uint256 id) {
        if (score < -100 || score > 100) revert InvalidScore(score);

        id = _signals.length;
        _signals.push(
            SignalRecord({
                direction: direction,
                score: score,
                priceE8: priceE8,
                publishedAt: uint64(block.timestamp),
                metadataUri: metadataUri
            })
        );

        emit SignalPublished(id, direction, score, priceE8, metadataUri);
    }

    /// @notice Number of signals published so far.
    function count() external view returns (uint256) {
        return _signals.length;
    }

    /// @notice Read a signal by id.
    function get(uint256 id) external view returns (SignalRecord memory) {
        return _signals[id];
    }

    /// @notice Most recently published signal.
    function latest() external view returns (SignalRecord memory) {
        if (_signals.length == 0) revert EmptyRegistry();
        return _signals[_signals.length - 1];
    }

    /// @notice Hand publishing rights to another address.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
