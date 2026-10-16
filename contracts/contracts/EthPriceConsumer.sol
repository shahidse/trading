// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Chainlink AggregatorV3 surface.
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @title EthPriceConsumer
/// @notice Reads the ETH/USD Chainlink feed on-chain so the off-chain engine can
/// cross-check the exchange price against a decentralised oracle.
contract EthPriceConsumer {
    AggregatorV3Interface public immutable feed;

    /// @dev Answers older than this are flagged as stale.
    uint256 public immutable maxStaleness;

    error NoData();
    error StalePrice(uint256 updatedAt);

    constructor(address feedAddress, uint256 maxStalenessSeconds) {
        require(feedAddress != address(0), "zero feed");
        feed = AggregatorV3Interface(feedAddress);
        maxStaleness = maxStalenessSeconds;
    }

    /// @notice Feed decimals (ETH/USD is 8 on mainnet).
    function decimals() external view returns (uint8) {
        return feed.decimals();
    }

    /// @notice Latest ETH/USD price with its oracle timestamp.
    /// @return price Raw answer, scaled by `decimals()`.
    /// @return updatedAt Oracle timestamp for the round.
    function latestEthUsd() external view returns (int256 price, uint256 updatedAt) {
        (, int256 answer, , uint256 updated, ) = feed.latestRoundData();
        if (answer <= 0) revert NoData();

        return (answer, updated);
    }

    /// @notice Like `latestEthUsd` but reverts when the answer is stale.
    function ethUsdPrice() external view returns (int256 price) {
        (int256 answer, uint256 updated) = this.latestEthUsd();
        if (block.timestamp - updated > maxStaleness) revert StalePrice(updated);
        return answer;
    }

    /// @notice True when the current answer is older than `maxStaleness`.
    function isStale() external view returns (bool) {
        (, , , uint256 updated, ) = feed.latestRoundData();
        return block.timestamp - updated > maxStaleness;
    }
}
