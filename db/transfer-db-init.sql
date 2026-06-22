-- ============================================================
-- transfer-db  (owned by transfer-service)
-- Tables: transfers, notifikasi
--
-- notifikasi lives here (not duplicated per-service) because
-- transfer-service is the only service that *reads* it back out
-- (notifikasiList, used by the frontend bell icon). Other services
-- that need to log a notification call transfer-service's
-- addNotification GraphQL mutation instead of writing to this
-- table directly — same pattern transfer-service already uses to
-- call asset-service for asset data.
-- ============================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!50503 SET NAMES utf8mb4 */;

--
-- Table structure for table `transfers`
--

DROP TABLE IF EXISTS `transfers`;
CREATE TABLE `transfers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int NOT NULL,
  `from_ward` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `to_ward` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `transfer_status` enum('Pending','In Transit','Completed') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

LOCK TABLES `transfers` WRITE;
/*!40000 ALTER TABLE `transfers` DISABLE KEYS */;
INSERT INTO `transfers` VALUES (1,1,'ICU','ER','Completed','2026-05-18 13:26:24','2026-05-18 13:27:43'),(2,4,'ER','ICU','Completed','2026-05-19 06:39:42','2026-05-19 06:40:39'),(3,3,'ICU','ER','Completed','2026-05-25 16:34:15','2026-05-25 17:04:08'),(4,5,'Radiology','ER','Completed','2026-05-26 01:21:45','2026-06-01 15:11:33'),(6,1,'ER','ICU','Completed','2026-06-09 03:49:21',NULL),(7,2,'Warehouse','ER','Completed','2026-06-09 03:49:21',NULL),(8,3,'ER','Radiology','Pending','2026-06-09 03:49:21',NULL),(9,4,'ICU','Warehouse','In Transit','2026-06-09 03:49:21',NULL),(10,5,'ER','ICU','Completed','2026-06-09 03:49:21',NULL),(11,6,'Warehouse','ER','Pending','2026-06-09 03:49:21',NULL),(13,8,'Warehouse','Radiology','Completed','2026-06-09 03:49:21',NULL),(14,9,'ER','Warehouse','Completed','2026-06-09 03:49:21',NULL),(15,1,'ICU','ER','Pending','2026-06-09 03:49:21',NULL),(18,7,'Warehouse','ICU','In Transit','2026-06-13 04:52:14',NULL);
/*!40000 ALTER TABLE `transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifikasi`  (NEW — per professor's revision note)
--

DROP TABLE IF EXISTS `notifikasi`;
CREATE TABLE `notifikasi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tier` int DEFAULT NULL,
  `teks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
