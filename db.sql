SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `maintenance_actions`;
DROP TABLE IF EXISTS `maintenance_reports`;
DROP TABLE IF EXISTS `transfers`;
DROP TABLE IF EXISTS `assets`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `wards`;

CREATE TABLE `assets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` varchar(100) DEFAULT NULL,
  `current_ward` varchar(100) NOT NULL,
  `status` enum('Available','In Transit','Maintenance','In Use') DEFAULT 'Available',
  `qr_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_hash` (`qr_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `assets` (`id`, `name`, `type`, `current_ward`, `status`, `qr_hash`, `created_at`) VALUES
(1, 'Patient Monitor A1', 'Electronic', 'ICU', 'Available', 'qr_hash_12345', '2026-05-15 16:29:49'),
(2, 'Wheelchair W-05', 'Transport', 'ER', 'Available', 'qr_hash_67890', '2026-05-15 16:29:49');

CREATE TABLE `maintenance_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `asset_id` int(11) NOT NULL,
  `asset_name` varchar(255) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `report_date` date NOT NULL,
  `description` text NOT NULL,
  `reporter` varchar(100) DEFAULT NULL,
  `status` enum('Dilaporkan','Diperbaiki','Diganti','Selesai') DEFAULT 'Dilaporkan',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  CONSTRAINT `fk_report_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `maintenance_actions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `report_id` int(11) NOT NULL,
  `action_date` date DEFAULT NULL,
  `vendor` varchar(100) DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT 0.00,
  `duration_days` int(11) DEFAULT 0,
  `status` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  CONSTRAINT `fk_action_report` FOREIGN KEY (`report_id`) REFERENCES `maintenance_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `transfers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `asset_id` int(11) NOT NULL,
  `from_ward` varchar(100) NOT NULL,
  `to_ward` varchar(100) NOT NULL,
  `transfer_status` enum('Pending','In Transit','Completed') DEFAULT 'Pending',
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','staff','nurse') DEFAULT 'staff',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `created_at`) VALUES
(3, 'admin', '$2b$10$uoq2.e5z2RV1kWl8Gx.JYO5ZgRAXtdL1vvTUAI0Mhu8dnnnhRBK1G', 'admin', '2026-05-15 16:56:58'),
(4, 'Logistiks1', '$2b$10$.dsx9XhHkrLv4xNAZsj/7esq5kvGBAYf0A6HCtWfHK/PBnZnC4FbK', 'staff', '2026-05-16 06:24:12'),
(5, 'Perawats1', '$2b$10$EXswaE0xnpWcWxjePYHieu89Q7j4iHlBS/1qvkon0nTu8m2ZLg.Jm', 'nurse', '2026-05-16 06:24:59');

CREATE TABLE `wards` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ward_name` varchar(100) NOT NULL,
  `asset_count` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ward_name` (`ward_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `wards` (`id`, `ward_name`, `asset_count`) VALUES
(1, 'ICU', 1),
(2, 'ER', 1),
(3, 'Radiology', 0);

SET FOREIGN_KEY_CHECKS = 1;