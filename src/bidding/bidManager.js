/**
 * Central arbiter for bid attempts across parallel workers.
 * Ensures at most one worker actually sends a bid.
 */
export class BidManager {
	/**
	 * @param {number} maxBid
	 * @param {ReturnType<typeof import("../logger.js").createLogger>} logger
	 */
	constructor(maxBid, logger) {
		this.maxBid = maxBid;
		this.logger = logger;
		this.fired = false;
		this.winningWorkerId = null;
		this.bidAmount = null;
	}

	/**
	 * Requests permission to fire a bid.
	 * Returns true if the worker is authorized to proceed.
	 *
	 * @param {string} workerId
	 * @param {number} bidAmount
	 * @returns {boolean}
	 */
	requestFire(workerId, bidAmount) {
		if (this.fired) {
			this.logger.debug("bid-manager", "Worker denied: already fired", {
				workerId,
				bidAmount,
				winningWorkerId: this.winningWorkerId,
				wonAmount: this.bidAmount,
			});
			return false;
		}

		if (bidAmount > this.maxBid) {
			this.logger.warn("bid-manager", "Worker denied: exceeds maxBid", {
				workerId,
				bidAmount,
				maxBid: this.maxBid,
			});
			return false;
		}

		this.fired = true;
		this.winningWorkerId = workerId;
		this.bidAmount = bidAmount;

		this.logger.info("bid-manager", "Worker authorized to fire", {
			workerId,
			bidAmount,
		});

		return true;
	}
}
