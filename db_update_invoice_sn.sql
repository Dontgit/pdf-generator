-- SQL to add new columns to Invoice table
ALTER TABLE Invoice
ADD COLUMN Total_sn DECIMAL(15,2) DEFAULT 0,
ADD COLUMN PPN_sn DECIMAL(15,2) DEFAULT 0,
ADD COLUMN Total_Harga_sn DECIMAL(15,2) DEFAULT 0;

-- SQL to add new columns to Detail_Invoice table
ALTER TABLE Detail_Invoice
ADD COLUMN Harga_Satuan_sn DECIMAL(15,2) DEFAULT 0,
ADD COLUMN Total_sn DECIMAL(15,2) DEFAULT 0;
