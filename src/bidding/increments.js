/**
 * Returns the correct eBay bid increment for a given current price.
 * Source: eBay bid increment table.
 */
export function getBidIncrement(current) {
	if (current < 1.0) return 0.05;
	if (current < 5.0) return 0.25;
	if (current < 25.0) return 0.5;
	if (current < 100.0) return 1.0;
	if (current < 250.0) return 2.5;
	if (current < 500.0) return 5.0;
	if (current < 1000.0) return 10.0;
	if (current < 2500.0) return 25.0;
	if (current < 5000.0) return 50.0;
	return 100.0; // $5000+
}