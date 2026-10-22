# RetailIQ Data Schemas & Sample Datasets

## Synthetic Dataset Disclosure
All datasets included in or processed by RetailIQ are **DB Mart-inspired synthetic retail data** generated for prototype testing and academic demonstration.
Never claim that these records or resulting metrics represent actual DB Mart performance.

## Available Sample Files
- `sample_retail_sales.csv`: A complete 90-day daily historical retail sales dataset covering all 30 SKUs (2,730 records), fully formatted for immediate testing via the Data Management upload interface.

## Supported Schema Definition
When importing historical sales records via CSV or Excel, the ingestion pipeline expects the following structure:

### Required Fields:
- `date`: Daily transaction date (`YYYY-MM-DD`).
- `product_id`: Product SKU identifier (e.g., `P001`).
- `product_name`: Descriptive item label (e.g., `Rice 5 kg`).
- `category`: Merchandising department (e.g., `Staples`).
- `units_sold`: Non-negative quantity sold on that calendar date.

### Optional Enrichment Fields:
- `unit_price`: Item selling price.
- `discount_pct`: Markdown discount applied (0 - 100).
- `promotion_flag`: 1 if item was actively promoted, 0 otherwise.
- `revenue`: Computed automatically as `units_sold * unit_price * (1 - discount_pct/100)` if omitted.
- `stock_on_hand_end_of_day`: Physical store inventory remaining at close.
- `supplier_lead_time_days`: Delivery lead time for purchase orders (default: 5 days).
- `safety_stock_units`: Target safety stock buffer.

## Duplicate Handling Policy
The database enforces a unique constraint on `(product_id, date)`. Duplicate entries are safely skipped during ingestion to prevent double-counting historical sales volume.
