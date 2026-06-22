-- ============================================================
-- asset-db  (owned by asset-service)
-- Tables: assets, maintenance_reports, maintenance_actions
-- These three stay together because maintenance_reports/actions
-- have real FK constraints back to assets.
-- ============================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;

--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
CREATE TABLE `assets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sub_category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `current_ward` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('Available','In Transit','Maintenance','In Use','Sterilization','Out of Stock') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Available',
  `qr_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_hash` (`qr_hash`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

LOCK TABLES `assets` WRITE;
/*!40000 ALTER TABLE `assets` DISABLE KEYS */;
INSERT INTO `assets` VALUES (1,'Patient Monitor A1','Electronic',NULL,'ER','Sterilization','qr_hash_12345','2026-05-15 16:29:49'),(2,'Wheelchair W-05','Transport',NULL,'ER','Out of Stock','qr_hash_67890','2026-05-15 16:29:49'),(3,'Monitor A1','Electronic',NULL,'ER','In Use','qr_1779000536884_q20zfl','2026-05-17 06:48:58'),(4,'contoh ','Electronic',NULL,'ICU','In Use','qr_1779112629676_zk631c','2026-05-18 13:57:10'),(5,'IV Pole','Equipment',NULL,'ER','Maintenance','qr_1779172922663_ox38mk','2026-05-19 06:42:03'),(6,'test TL','Equipment',NULL,'Warehouse','Maintenance','qr_1780306732798_7bf7t6','2026-06-01 09:38:53'),(7,'test pindah2 ','Electronic',NULL,'Warehouse','In Transit','qr_1780326163172_rmricg','2026-06-01 15:02:43'),(8,'dummy7','Transport',NULL,'Warehouse','Available','qr_1780326485719_u314k2','2026-06-01 15:08:05'),(9,'test scroll','Electronic','Kursi Roda','ER','Available','qr_1780329861460_zno17j','2026-06-01 16:04:21'),(10,'Bed Pasien 01','Furniture','Tempat Tidur','ICU','In Use','qr_dummy_001','2026-06-09 03:49:01'),(11,'Bed Pasien 02','Furniture','Tempat Tidur','NICU','Available','qr_dummy_002','2026-06-09 03:49:01'),(12,'Syringe Pump A','Electronic','Medis','Ruang Operasi','In Use','qr_dummy_003','2026-06-09 03:49:01'),(13,'Syringe Pump B','Electronic','Medis','NICU','Maintenance','qr_dummy_004','2026-06-09 03:49:01'),(14,'Tabung Oksigen 1','Equipment','Pernapasan','Warehouse','Available','qr_dummy_005','2026-06-09 03:49:01'),(16,'Defibrillator 1','Electronic','Medis','ER','In Use','qr_dummy_007','2026-06-09 03:49:01'),(17,'Kursi Roda W-06','Transport','Kursi Roda','Apotek','Available','qr_dummy_008','2026-06-09 03:49:01'),(18,'Tiang Infus 02','Equipment','Besi','Ruang Operasi','In Use','qr_dummy_009','2026-06-09 03:49:01'),(19,'USG Machine','Electronic','Radiologi','Radiology','Sterilization','qr_dummy_010','2026-06-09 03:49:01'),(20,'Will Delete Later','Dummy','Dummy','ICU','Available','qr_1781187246986_sa10lb','2026-06-11 14:14:07');
/*!40000 ALTER TABLE `assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_reports`
--

DROP TABLE IF EXISTS `maintenance_reports`;
CREATE TABLE `maintenance_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int NOT NULL,
  `asset_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `report_date` date NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `reporter` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('Dilaporkan','Diperbaiki','Diganti','Selesai') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Dilaporkan',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `asset_id` (`asset_id`),
  CONSTRAINT `fk_report_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

LOCK TABLES `maintenance_reports` WRITE;
/*!40000 ALTER TABLE `maintenance_reports` DISABLE KEYS */;
INSERT INTO `maintenance_reports` VALUES (1,2,'Wheelchair W-05','Transport','2026-05-17','tets','admin','Selesai','2026-05-17 06:51:40'),(2,5,'IV Pole','Equipment','2026-05-19','test','Scanner','Selesai','2026-05-19 09:12:56'),(3,5,'IV Pole','Equipment','2026-05-19','bbb','Scanner','Selesai','2026-05-19 09:19:59'),(4,6,'test TL','Equipment','2026-06-01','Rusak test','Scanner','Diperbaiki','2026-06-01 09:40:13'),(5,2,'Wheelchair W-05','Transport','2026-06-05','Roda macet','Logistiks1','Selesai','2026-06-09 03:49:30'),(6,4,'contoh','Electronic','2026-06-06','Layar mati','Perawats1','Diperbaiki','2026-06-09 03:49:30'),(7,6,'test TL','Equipment','2026-06-07','Lecet','Logistiks1','Dilaporkan','2026-06-09 03:49:30'),(8,7,'test pindah2','Electronic','2026-06-08','Kabel putus','Perawats1','Diganti','2026-06-09 03:49:30'),(9,8,'dummy7','Transport','2026-06-09','Rem blong','admin','Dilaporkan','2026-06-09 03:49:30'),(10,9,'test scroll','Electronic','2026-06-09','Tidak bisa dinyalakan','Logistiks1','Selesai','2026-06-09 03:49:30'),(11,3,'Monitor A1','Electronic','2026-06-09','Tombol rusak','Perawats1','Diperbaiki','2026-06-09 03:49:30'),(12,5,'IV Pole','Equipment','2026-06-09','Patah','admin','Selesai','2026-06-09 03:49:30'),(13,1,'Patient Monitor A1','Electronic','2026-06-09','Alarm error','Logistiks1','Dilaporkan','2026-06-09 03:49:30'),(14,2,'Wheelchair W-05','Transport','2026-06-09','Jok robek','Perawats1','Diperbaiki','2026-06-09 03:49:30');
/*!40000 ALTER TABLE `maintenance_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_actions`
--

DROP TABLE IF EXISTS `maintenance_actions`;
CREATE TABLE `maintenance_actions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_id` int NOT NULL,
  `start_date` date DEFAULT NULL,
  `estimated_end_date` date DEFAULT NULL,
  `action_date` date DEFAULT NULL,
  `vendor` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT '0.00',
  `duration_days` int DEFAULT '0',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  CONSTRAINT `fk_action_report` FOREIGN KEY (`report_id`) REFERENCES `maintenance_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

LOCK TABLES `maintenance_actions` WRITE;
/*!40000 ALTER TABLE `maintenance_actions` DISABLE KEYS */;
INSERT INTO `maintenance_actions` VALUES (1,1,NULL,NULL,'2026-05-19','',0.00,0,'Selesai','','2026-05-19 06:40:02'),(2,2,NULL,NULL,'2026-05-25','',0.00,0,'Diperbaiki','','2026-05-25 17:12:49'),(3,2,NULL,NULL,'2026-05-25','',0.00,0,'Diperbaiki','','2026-05-25 17:12:54'),(4,4,'2026-06-09','2026-06-17',NULL,'fix.co',0.00,0,'Diperbaiki','','2026-06-01 09:47:32'),(5,4,'2026-06-01','2026-06-17',NULL,'fix.co',0.00,0,'Diperbaiki','','2026-06-01 09:48:00'),(6,3,'2026-06-01','2026-06-04',NULL,'vendor',0.00,0,'Diperbaiki','','2026-06-01 09:48:59'),(7,3,'2026-06-01','2026-06-04','2026-06-01','vendor',100000.00,4,'Selesai','fix','2026-06-01 09:49:19'),(8,2,'2026-06-01','2026-06-09',NULL,'',0.00,0,'Diperbaiki','','2026-06-01 15:09:59'),(9,2,'2026-06-01','2026-06-03','2026-06-02','abc',5000000.00,2,'Selesai','lebih cepat selse','2026-06-01 15:15:56'),(10,5,'2026-06-05','2026-06-07','2026-06-07','Vendor A',150000.00,2,'Selesai','Roda sudah diganti','2026-06-09 03:49:42'),(11,6,'2026-06-06','2026-06-10',NULL,'Vendor B',0.00,0,'Diperbaiki','Menunggu sparepart LCD','2026-06-09 03:49:42'),(12,7,NULL,NULL,NULL,'',0.00,0,'Dilaporkan','','2026-06-09 03:49:42'),(13,8,'2026-06-08','2026-06-09','2026-06-09','Internal',50000.00,1,'Diganti','Ganti kabel power','2026-06-09 03:49:42'),(14,9,NULL,NULL,NULL,'',0.00,0,'Dilaporkan','','2026-06-09 03:49:42'),(15,10,'2026-06-09','2026-06-11','2026-06-10','Vendor C',200000.00,1,'Selesai','Baterai diganti','2026-06-09 03:49:42'),(16,11,'2026-06-09','2026-06-12',NULL,'Internal',0.00,0,'Diperbaiki','Pemesanan tombol baru','2026-06-09 03:49:42'),(17,12,'2026-06-09','2026-06-10','2026-06-10','Internal',0.00,1,'Selesai','Dilas ulang','2026-06-09 03:49:42'),(18,13,NULL,NULL,NULL,'',0.00,0,'Dilaporkan','','2026-06-09 03:49:42'),(19,14,'2026-06-09','2026-06-15',NULL,'Vendor A',0.00,0,'Diperbaiki','Jok sedang dijahit','2026-06-09 03:49:42');
/*!40000 ALTER TABLE `maintenance_actions` ENABLE KEYS */;
UNLOCK TABLES;

/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
